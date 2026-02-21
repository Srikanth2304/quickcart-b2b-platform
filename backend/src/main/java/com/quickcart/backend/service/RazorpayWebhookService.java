package com.quickcart.backend.service;

import com.quickcart.backend.entity.*;
import com.quickcart.backend.exception.WebhookInfrastructureException;
import com.quickcart.backend.repository.PaymentRepository;
import com.quickcart.backend.repository.RefundRepository;
import com.quickcart.backend.repository.WebhookEventRepository;
import tools.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Processes inbound Razorpay webhook events.
 *
 * Responsibilities:
 * - Idempotency: skip already-processed event IDs.
 * - Event age validation: reject stale events older than configurable max age.
 * - Dispatch to correct handler based on event type.
 * - Reuse existing PaymentService / RefundService logic (no duplication).
 * - Distinguish infrastructure failures (DB down → re-throw for 5xx/retry)
 *   from business-logic errors (bad data → swallow, persist as ERROR, return 2xx).
 *
 * Supported events:
 *   payment.captured / payment.authorized  → mark Payment SUCCESS + confirm order + create invoice
 *   payment.failed                         → mark Payment FAILED
 *   refund.processed / refund.created      → mark Refund PROCESSED + set reference + processedAt
 *   refund.failed                          → mark Refund FAILED + record reason
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RazorpayWebhookService {

    private final WebhookEventRepository webhookEventRepository;
    private final PaymentRepository paymentRepository;
    private final RefundRepository refundRepository;
    private final PaymentService paymentService;
    private final OrderAuditService orderAuditService;

    /**
     * Maximum age (in seconds) of a webhook event to be accepted.
     * Events older than this are logged and skipped.
     * Default: 300 seconds (5 minutes). Set to 0 to disable age check.
     */
    @Value("${app.razorpay.webhook.maxEventAgeSeconds:300}")
    private long maxEventAgeSeconds;

    /**
     * Process a parsed Razorpay webhook event.
     *
     * @param eventId   unique Razorpay event id (for idempotency)
     * @param eventType event type string (e.g. "payment.captured")
     * @param root      full parsed JSON root node
     * @throws WebhookInfrastructureException if DB/transaction fails (controller returns 5xx → Razorpay retries)
     */
    @Transactional
    public void processEvent(String eventId, String eventType, JsonNode root) {

        // ── Idempotency check ──────────────────────────────────────────
        try {
            if (webhookEventRepository.existsByEventId(eventId)) {
                log.info("Webhook event {} already processed, skipping", eventId);
                return;
            }
        } catch (DataAccessException ex) {
            // DB is unreachable — must retry
            throw new WebhookInfrastructureException(
                    "DB unavailable during idempotency check for event " + eventId, ex);
        }

        // ── Event age validation ───────────────────────────────────────
        if (maxEventAgeSeconds > 0 && isEventTooOld(root)) {
            log.warn("Webhook event {} ({}) is older than {}s, skipping as stale",
                    eventId, eventType, maxEventAgeSeconds);
            persistEventSafe(eventId, eventType, "SKIPPED",
                    "Stale event (older than " + maxEventAgeSeconds + "s)");
            return;
        }

        // ── Dispatch ───────────────────────────────────────────────────
        String status = "SUCCESS";
        String note = null;

        try {
            switch (eventType) {
                case "payment.captured", "payment.authorized" ->
                        handlePaymentSuccess(root);
                case "payment.failed" ->
                        handlePaymentFailed(root);
                case "refund.processed", "refund.created" ->
                        handleRefundProcessed(root);
                case "refund.failed" ->
                        handleRefundFailed(root);
                default -> {
                    status = "SKIPPED";
                    note = "Unhandled event type: " + eventType;
                    log.info("Ignoring unhandled Razorpay webhook event type: {}", eventType);
                }
            }
        } catch (DataAccessException ex) {
            // Infrastructure failure (DB down, connection lost, constraint error during processing)
            // Do NOT persist event — let Razorpay retry
            throw new WebhookInfrastructureException(
                    "DB error processing webhook event " + eventId + " (" + eventType + ")", ex);
        } catch (Exception ex) {
            // Business-logic error (bad payload, entity not found, invalid state, etc.)
            // Safe to swallow — persisting as ERROR prevents re-processing
            status = "ERROR";
            note = truncate(ex.getMessage(), 490);
            log.error("Business error processing webhook event {} ({}): {}",
                    eventId, eventType, ex.getMessage(), ex);
        }

        // ── Persist event for idempotency ──────────────────────────────
        try {
            persistEvent(eventId, eventType, status, note);
        } catch (DataAccessException ex) {
            // Can't persist → infrastructure failure → must retry
            throw new WebhookInfrastructureException(
                    "DB error persisting webhook event " + eventId, ex);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Event age validation
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Checks if the event's created_at timestamp is older than the configured max age.
     * Razorpay sends created_at as a Unix epoch (seconds).
     */
    private boolean isEventTooOld(JsonNode root) {
        JsonNode createdAt = root.path("created_at");
        if (createdAt.isMissingNode() || createdAt.isNull()) {
            // If no timestamp, allow the event (don't block on missing metadata)
            return false;
        }

        try {
            long eventEpochSeconds = createdAt.asLong();
            long nowEpochSeconds = Instant.now().getEpochSecond();
            long ageSeconds = nowEpochSeconds - eventEpochSeconds;

            if (ageSeconds > maxEventAgeSeconds) {
                log.info("Webhook event age: {}s (max allowed: {}s)", ageSeconds, maxEventAgeSeconds);
                return true;
            }
        } catch (Exception ex) {
            log.warn("Could not parse webhook created_at timestamp: {}", createdAt, ex);
        }

        return false;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Payment handlers
    // ═══════════════════════════════════════════════════════════════════

    private void handlePaymentSuccess(JsonNode root) {
        JsonNode paymentEntity = extractEntity(root, "payment");
        if (paymentEntity == null) {
            log.warn("payment.captured/authorized webhook missing payment entity in payload");
            return;
        }

        String razorpayOrderId = textOrNull(paymentEntity, "order_id");
        String razorpayPaymentId = textOrNull(paymentEntity, "id");

        if (razorpayOrderId == null) {
            log.warn("payment.captured webhook: missing order_id in payment entity");
            return;
        }

        Optional<Payment> paymentOpt = paymentRepository.findByRazorpayOrderId(razorpayOrderId);
        if (paymentOpt.isEmpty()) {
            log.warn("No Payment found for razorpayOrderId={}", razorpayOrderId);
            return;
        }

        Payment payment = paymentOpt.get();

        // Idempotent: already succeeded (verify endpoint may have already updated this)
        if (payment.getStatus() == PaymentStatus.SUCCESS) {
            log.info("Payment {} already SUCCESS, ensuring downstream invariants", payment.getId());
        } else {
            payment.setStatus(PaymentStatus.SUCCESS);
            if (razorpayPaymentId != null) {
                payment.setRazorpayPaymentId(razorpayPaymentId);
            }
            log.info("Webhook: Payment {} marked SUCCESS (razorpayPaymentId={})", payment.getId(), razorpayPaymentId);
        }

        // Reuse existing logic: confirm order + create invoice
        Order order = payment.getOrder();
        User retailer = payment.getRetailer();
        if (order != null && retailer != null) {
            paymentService.ensureOrderConfirmedAndInvoiceExists(order, retailer);
        }
    }

    private void handlePaymentFailed(JsonNode root) {
        JsonNode paymentEntity = extractEntity(root, "payment");
        if (paymentEntity == null) {
            log.warn("payment.failed webhook missing payment entity in payload");
            return;
        }

        String razorpayOrderId = textOrNull(paymentEntity, "order_id");
        if (razorpayOrderId == null) {
            log.warn("payment.failed webhook: missing order_id in payment entity");
            return;
        }

        Optional<Payment> paymentOpt = paymentRepository.findByRazorpayOrderId(razorpayOrderId);
        if (paymentOpt.isEmpty()) {
            log.warn("No Payment found for razorpayOrderId={}", razorpayOrderId);
            return;
        }

        Payment payment = paymentOpt.get();

        // Only transition INITIATED → FAILED (don't overwrite SUCCESS or REFUNDED)
        if (payment.getStatus() == PaymentStatus.INITIATED) {
            payment.setStatus(PaymentStatus.FAILED);
            log.info("Webhook: Payment {} marked FAILED", payment.getId());

            Order order = payment.getOrder();
            if (order != null) {
                orderAuditService.recordEvent(
                        order, OrderEventType.PAYMENT_CREATED,
                        order.getStatus(), order.getStatus(),
                        null, "Payment failed (webhook notification)");
            }
        } else {
            log.info("Payment {} is in status {}, ignoring payment.failed webhook",
                    payment.getId(), payment.getStatus());
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Refund handlers
    // ═══════════════════════════════════════════════════════════════════

    private void handleRefundProcessed(JsonNode root) {
        JsonNode refundEntity = extractEntity(root, "refund");
        if (refundEntity == null) {
            log.warn("refund.processed webhook missing refund entity in payload");
            return;
        }

        String razorpayPaymentId = textOrNull(refundEntity, "payment_id");
        String razorpayRefundId = textOrNull(refundEntity, "id");

        if (razorpayPaymentId == null) {
            log.warn("refund.processed webhook: missing payment_id in refund entity");
            return;
        }

        Optional<Payment> paymentOpt = paymentRepository.findByRazorpayPaymentId(razorpayPaymentId);
        if (paymentOpt.isEmpty()) {
            log.warn("No Payment found for razorpayPaymentId={}", razorpayPaymentId);
            return;
        }

        Payment payment = paymentOpt.get();
        Optional<Refund> refundOpt = refundRepository.findByPaymentId(payment.getId());
        if (refundOpt.isEmpty()) {
            log.warn("No Refund found for paymentId={}", payment.getId());
            return;
        }

        Refund refund = refundOpt.get();

        // Idempotent: already processed
        if (refund.getStatus() == RefundStatus.PROCESSED) {
            log.info("Refund {} already PROCESSED, skipping", refund.getId());
            return;
        }

        refund.setStatus(RefundStatus.PROCESSED);
        refund.setProcessedAt(LocalDateTime.now());
        if (razorpayRefundId != null) {
            refund.setRefundReference(razorpayRefundId);
        }

        if (payment.getStatus() != PaymentStatus.REFUNDED) {
            payment.setStatus(PaymentStatus.REFUNDED);
        }

        log.info("Webhook: Refund {} marked PROCESSED (ref={})", refund.getId(), razorpayRefundId);

        Order order = refund.getOrder();
        if (order != null) {
            orderAuditService.recordEvent(
                    order, OrderEventType.REFUND_PROCESSED,
                    order.getStatus(), order.getStatus(),
                    null, "Refund processed (webhook notification, ref=" + razorpayRefundId + ")");
        }
    }

    private void handleRefundFailed(JsonNode root) {
        JsonNode refundEntity = extractEntity(root, "refund");
        if (refundEntity == null) {
            log.warn("refund.failed webhook missing refund entity in payload");
            return;
        }

        String razorpayPaymentId = textOrNull(refundEntity, "payment_id");
        if (razorpayPaymentId == null) {
            log.warn("refund.failed webhook: missing payment_id in refund entity");
            return;
        }

        Optional<Payment> paymentOpt = paymentRepository.findByRazorpayPaymentId(razorpayPaymentId);
        if (paymentOpt.isEmpty()) {
            log.warn("No Payment found for razorpayPaymentId={}", razorpayPaymentId);
            return;
        }

        Payment payment = paymentOpt.get();
        Optional<Refund> refundOpt = refundRepository.findByPaymentId(payment.getId());
        if (refundOpt.isEmpty()) {
            log.warn("No Refund found for paymentId={}", payment.getId());
            return;
        }

        Refund refund = refundOpt.get();

        if (refund.getStatus() == RefundStatus.PROCESSED || refund.getStatus() == RefundStatus.FAILED) {
            log.info("Refund {} already in terminal state {}, ignoring refund.failed",
                    refund.getId(), refund.getStatus());
            return;
        }

        refund.setStatus(RefundStatus.FAILED);
        String failureReason = textOrNull(refundEntity, "status");
        String errorDesc = textOrNull(refundEntity, "error_description");
        String note = "Refund failed via webhook";
        if (errorDesc != null) {
            note += ": " + errorDesc;
        } else if (failureReason != null) {
            note += " (status=" + failureReason + ")";
        }
        refund.setManufacturerNote(truncate(note, 490));

        if (payment.getStatus() == PaymentStatus.REFUND_PENDING) {
            payment.setStatus(PaymentStatus.REFUND_FAILED);
        }

        log.info("Webhook: Refund {} marked FAILED", refund.getId());

        Order order = refund.getOrder();
        if (order != null) {
            orderAuditService.recordEvent(
                    order, OrderEventType.REFUND_PROCESSED,
                    order.getStatus(), order.getStatus(),
                    null, truncate(note, 490));
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════════════

    private JsonNode extractEntity(JsonNode root, String entityName) {
        JsonNode payload = root.path("payload");
        if (payload.isMissingNode()) return null;

        JsonNode entityWrapper = payload.path(entityName);
        if (entityWrapper.isMissingNode()) return null;

        JsonNode entity = entityWrapper.path("entity");
        return entity.isMissingNode() ? entityWrapper : entity;
    }

    private String textOrNull(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) return null;
        String text = value.asText();
        return text.isBlank() ? null : text;
    }

    private void persistEvent(String eventId, String eventType, String status, String note) {
        WebhookEvent event = WebhookEvent.builder()
                .eventId(eventId)
                .eventType(eventType)
                .status(status)
                .note(truncate(note, 490))
                .receivedAt(LocalDateTime.now())
                .build();
        try {
            webhookEventRepository.save(event);
        } catch (DataIntegrityViolationException ex) {
            // Another thread/instance already persisted — safe to ignore (idempotent)
            log.info("Webhook event {} already persisted by another thread, ignoring duplicate", eventId);
        }
    }

    /**
     * Best-effort persist (used for SKIPPED events where we don't want to fail the request).
     */
    private void persistEventSafe(String eventId, String eventType, String status, String note) {
        try {
            persistEvent(eventId, eventType, status, note);
        } catch (Exception ex) {
            log.warn("Failed to persist SKIPPED webhook event {}: {}", eventId, ex.getMessage());
        }
    }

    private static String truncate(String s, int maxLen) {
        if (s == null) return null;
        return s.length() <= maxLen ? s : s.substring(0, maxLen);
    }
}
