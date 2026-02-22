package com.quickcart.backend.service;

import com.quickcart.backend.entity.IdempotencyRequest;
import com.quickcart.backend.repository.IdempotencyRequestRepository;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.function.Supplier;

/**
 * Idempotency service for critical POST endpoints.
 *
 * Usage:
 *   return idempotencyService.executeIdempotent(key, endpoint, responseType, () -> {
 *       // actual business logic that returns ResponseEntity<T>
 *   });
 *
 * If the key+endpoint has been seen before, the stored response is returned.
 * Otherwise, the supplier is executed and the result is stored.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class IdempotencyService {

    private final IdempotencyRequestRepository idempotencyRequestRepository;
    private final ObjectMapper objectMapper;

    /**
     * Execute a request idempotently.
     *
     * @param idempotencyKey  the Idempotency-Key header value (nullable — if null, no idempotency check)
     * @param endpoint        logical endpoint identifier (e.g. "POST /orders")
     * @param responseType    the class of the response body for deserialization
     * @param supplier        the actual business logic producing a ResponseEntity
     * @return the response (cached or fresh)
     */
    @Transactional
    public <T> ResponseEntity<T> executeIdempotent(
            String idempotencyKey,
            String endpoint,
            Class<T> responseType,
            Supplier<ResponseEntity<T>> supplier
    ) {
        // If no idempotency key provided, execute normally
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return supplier.get();
        }

        String trimmedKey = idempotencyKey.trim();

        // Check for existing response
        Optional<IdempotencyRequest> existing =
                idempotencyRequestRepository.findByIdempotencyKeyAndEndpoint(trimmedKey, endpoint);

        if (existing.isPresent()) {
            log.info("Idempotency hit: key={}, endpoint={}", trimmedKey, endpoint);
            return deserializeResponse(existing.get(), responseType);
        }

        // Execute the actual business logic
        ResponseEntity<T> response = supplier.get();

        // Store the result
        persistIdempotencyRecord(trimmedKey, endpoint, response);

        return response;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Internals
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Deserialize a stored idempotency record back into a ResponseEntity.
     */
    private <T> ResponseEntity<T> deserializeResponse(IdempotencyRequest record, Class<T> responseType) {
        try {
            HttpStatusCode statusCode = HttpStatus.valueOf(record.getHttpStatus());
            String json = record.getResponseJson();

            if (json == null || json.isBlank()) {
                return ResponseEntity.status(statusCode).build();
            }

            T body = objectMapper.readValue(json, responseType);
            return ResponseEntity.status(statusCode).body(body);
        } catch (Exception ex) {
            log.error("Failed to deserialize idempotency response for key={}, endpoint={}: {}",
                    record.getIdempotencyKey(), record.getEndpoint(), ex.getMessage());
            // Fallback: return the stored status with no body rather than crashing
            return ResponseEntity.status(HttpStatus.valueOf(record.getHttpStatus())).build();
        }
    }

    private <T> void persistIdempotencyRecord(String key, String endpoint, ResponseEntity<T> response) {
        try {
            String json = null;
            if (response.getBody() != null) {
                json = objectMapper.writeValueAsString(response.getBody());
            }

            IdempotencyRequest record = IdempotencyRequest.builder()
                    .idempotencyKey(key)
                    .endpoint(endpoint)
                    .responseJson(json)
                    .httpStatus(response.getStatusCode().value())
                    .build();

            idempotencyRequestRepository.saveAndFlush(record);
        } catch (DataIntegrityViolationException ex) {
            // Race condition: another thread stored the same key concurrently — safe to ignore
            log.warn("Idempotency record race condition for key={}, endpoint={}", key, endpoint);
        } catch (Exception ex) {
            // Don't fail the request if we can't store the idempotency record
            log.error("Failed to store idempotency record for key={}, endpoint={}: {}",
                    key, endpoint, ex.getMessage());
        }
    }
}
