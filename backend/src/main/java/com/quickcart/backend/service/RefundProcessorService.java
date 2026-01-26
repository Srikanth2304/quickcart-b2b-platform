package com.quickcart.backend.service;

import com.quickcart.backend.entity.*;
import com.quickcart.backend.payment.PaymentGatewayRouter;
import com.quickcart.backend.repository.RefundRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Refund completion fallback.
 *
 * Normal production flow: refund should be completed by payment-gateway callback/webhook.
 *
 * Current rule requested:
 * - If a refund stays in PROCESSING for >= 5 minutes, auto-mark it PROCESSED and mark payment REFUNDED.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RefundProcessorService {

    private final RefundRepository refundRepository;
    private final OrderAuditService orderAuditService;
    private final PaymentGatewayRouter gatewayRouter;

    @Value("${app.refunds.processor.enabled:false}")
    private boolean enabled;

    /**
     * Number of minutes after which a PROCESSING refund will be auto-completed.
     */
    @Value("${app.refunds.processor.autoCompleteAfterMinutes:5}")
    private int autoCompleteAfterMinutes;

    @Scheduled(fixedDelayString = "${app.refunds.processor.fixedDelayMs:2000}")
    @Transactional
    public void processRefunds() {
        if (!enabled) {
            return;
        }

        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(autoCompleteAfterMinutes);

        // Only pick refunds that have been in processing since before the cutoff.
        // We use approvedAt as the 'processing started' timestamp, because the refund moves
        // to PROCESSING at the same time we set approvedAt.
        List<Refund> eligible = refundRepository.findByStatusAndApprovedAtBefore(RefundStatus.PROCESSING, cutoff);
        for (Refund refund : eligible) {
            processOne(refund);
        }
    }

    private void processOne(Refund refund) {
        Payment payment = refund.getPayment();
        if (payment != null) {
            // Idempotent: if already refunded, don't do anything.
            if (payment.getStatus() == PaymentStatus.REFUNDED) {
                return;
            }

            // Try initiating refund at gateway if we have a verified gateway payment id.
            // This keeps refund flow "gateway-aware" without changing business ownership.
            if (payment.getGateway() == PaymentGateway.RAZORPAY
                    && payment.getRazorpayPaymentId() != null
                    && payment.getStatus() == PaymentStatus.REFUND_PENDING) {
                try {
                    gatewayRouter.razorpay().refundPayment(payment.getRazorpayPaymentId(), payment.getAmount());
                } catch (RuntimeException ex) {
                    log.error("Razorpay refund failed", ex);
                    payment.setStatus(PaymentStatus.REFUND_FAILED);
                    // Keep refund in PROCESSING; scheduled job may auto-complete later as a fallback.
                }
            }

            if (payment.getStatus() == PaymentStatus.REFUND_PENDING || payment.getStatus() == PaymentStatus.SUCCESS) {
                payment.setStatus(PaymentStatus.REFUNDED);
            }
        }

        refund.setStatus(RefundStatus.PROCESSED);
        refund.setProcessedAt(LocalDateTime.now());
        if (refund.getRefundReference() == null) {
            refund.setRefundReference("RF-" + UUID.randomUUID());
        }

        Order order = refund.getOrder();
        if (order != null) {
            User actor = refund.getUpdatedBy();
            orderAuditService.recordEvent(order, OrderEventType.REFUND_PROCESSED, order.getStatus(), order.getStatus(), actor,
                    "Refund auto-completed after " + autoCompleteAfterMinutes + " minutes in PROCESSING");
        }
    }
}
