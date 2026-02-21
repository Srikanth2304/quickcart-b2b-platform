package com.quickcart.backend.controller;

import com.quickcart.backend.exception.WebhookInfrastructureException;
import com.quickcart.backend.payment.RazorpayWebhookSignatureVerifier;
import com.quickcart.backend.service.RazorpayWebhookService;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Inbound Razorpay webhook listener.
 *
 * Security:
 * - No JWT required (Razorpay calls this endpoint server-to-server).
 * - Signature verification via HMAC-SHA256 using the webhook secret.
 * - Idempotency via WebhookEvent persistence (handled in service layer).
 * - Request body size capped at 64 KB to prevent abuse.
 *
 * Response strategy:
 * - 200 OK  → event processed successfully OR business-logic error (safe to not retry).
 * - 400     → bad request (missing signature, invalid JSON, missing fields).
 * - 401     → invalid signature.
 * - 500/502 → infrastructure failure (DB down, transaction error) → Razorpay WILL retry.
 *
 * IMPORTANT: The raw request body is read as byte[] to prevent Spring from
 * parsing/modifying it before signature verification.
 */
@RestController
@RequestMapping("/webhooks")
@RequiredArgsConstructor
@Slf4j
public class RazorpayWebhookController {

    private static final String SIGNATURE_HEADER = "X-Razorpay-Signature";

    /**
     * Max allowed webhook payload size (64 KB). Razorpay payloads are typically < 10 KB.
     */
    private static final int MAX_BODY_SIZE = 64 * 1024;

    private final RazorpayWebhookSignatureVerifier signatureVerifier;
    private final RazorpayWebhookService webhookService;
    private final ObjectMapper objectMapper;

    /**
     * POST /webhooks/razorpay
     *
     * Razorpay sends webhook events here. The flow:
     * 1. Validate payload size (reject oversized requests).
     * 2. Read raw body bytes (Spring must NOT parse JSON first).
     * 3. Verify HMAC-SHA256 signature from X-Razorpay-Signature header.
     * 4. Parse JSON → extract event id and event type.
     * 5. Delegate to RazorpayWebhookService for idempotency check + business dispatch.
     * 6. Return 2xx on success/business-error, 5xx on infrastructure failure (triggers Razorpay retry).
     */
    @PostMapping(value = "/razorpay", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> handleWebhook(
            @RequestBody byte[] rawBody,
            @RequestHeader(value = SIGNATURE_HEADER, required = false) String signature
    ) {
        // ── 1. Payload size guard ──────────────────────────────────────
        if (rawBody.length > MAX_BODY_SIZE) {
            log.warn("Razorpay webhook payload too large: {} bytes (max {})", rawBody.length, MAX_BODY_SIZE);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Payload too large");
        }

        // ── 2. Signature verification ──────────────────────────────────
        if (signature == null || signature.isBlank()) {
            log.warn("Razorpay webhook received without {} header", SIGNATURE_HEADER);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Missing signature header");
        }

        if (!signatureVerifier.isValid(rawBody, signature)) {
            log.warn("Razorpay webhook signature verification FAILED");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Invalid signature");
        }

        // ── 3. Parse JSON ──────────────────────────────────────────────
        JsonNode root;
        try {
            root = objectMapper.readTree(rawBody);
        } catch (Exception ex) {
            log.error("Failed to parse Razorpay webhook JSON: {}", ex.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Invalid JSON");
        }

        String eventId = textOrNull(root, "id");
        String eventType = textOrNull(root, "event");

        if (eventId == null || eventType == null) {
            log.warn("Razorpay webhook missing 'id' or 'event' field");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Missing event id or type");
        }

        log.info("Received Razorpay webhook: event={}, id={}", eventType, eventId);

        // ── 4. Dispatch to service (idempotent) ────────────────────────
        try {
            webhookService.processEvent(eventId, eventType, root);
        } catch (WebhookInfrastructureException ex) {
            // Infrastructure failure (DB down, transaction failed)
            // Return 5xx so Razorpay retries this event later
            log.error("Infrastructure failure processing webhook {} ({}): {}",
                    eventId, eventType, ex.getMessage(), ex);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Temporary processing failure, please retry");
        } catch (Exception ex) {
            // Unexpected error — still return 200 to avoid infinite retries
            // for truly unrecoverable problems (e.g. class cast, NPE in mapping)
            log.error("Unexpected error processing webhook {} ({}): {}",
                    eventId, eventType, ex.getMessage(), ex);
        }

        // ── 5. Return 200 for successful processing or business-logic errors ──
        return ResponseEntity.ok("ok");
    }

    private static String textOrNull(JsonNode node, String field) {
        if (node == null) return null;
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) return null;
        String text = value.asText();
        return text.isBlank() ? null : text;
    }
}
