package com.quickcart.backend.service;

import com.quickcart.backend.dto.RefundResponse;
import com.quickcart.backend.entity.InvoiceStatus;
import com.quickcart.backend.entity.Order;
import com.quickcart.backend.entity.OrderEventType;
import com.quickcart.backend.entity.Payment;
import com.quickcart.backend.entity.PaymentStatus;
import com.quickcart.backend.entity.Refund;
import com.quickcart.backend.entity.RefundInitiatedBy;
import com.quickcart.backend.entity.RefundStatus;
import com.quickcart.backend.entity.User;
import com.quickcart.backend.exception.AccessDeniedException;
import com.quickcart.backend.exception.ResourceNotFoundException;
import com.quickcart.backend.repository.InvoiceRepository;
import com.quickcart.backend.repository.PaymentRepository;
import com.quickcart.backend.repository.RefundRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class RefundService {

    private final RefundRepository refundRepository;
    private final PaymentRepository paymentRepository;
    private final InvoiceRepository invoiceRepository;
    private final OrderAuditService orderAuditService;

    /**
     * Manufacturer rejects after payment:
     * - refund is auto processed (mock gateway)
     * - idempotent: if a refund exists, do nothing
     */
    @Transactional
    public Refund ensureAutoRefundProcessedForManufacturerReject(Order order, User manufacturer, String reason) {
        Refund existing = refundRepository.findByOrderId(order.getId()).orElse(null);
        if (existing != null) {
            return existing;
        }

        Payment payment = paymentRepository.findByOrderId(order.getId()).orElse(null);
        if (payment == null || payment.getStatus() != PaymentStatus.SUCCESS) {
            return null;
        }

        // Production-style: mark as refund pending, and create a refund in PROCESSING.
        payment.setStatus(PaymentStatus.REFUND_PENDING);

        Refund refund = Refund.builder()
                .order(order)
                .payment(payment)
                .gateway(payment.getGateway() == null ? null : payment.getGateway().name())
                .initiatedBy(RefundInitiatedBy.SYSTEM)
                .status(RefundStatus.PROCESSING)
                .reason(reason)
                .approvedAt(LocalDateTime.now())
                .build();
        refund.setCreatedBy(manufacturer);
        refund.setUpdatedBy(manufacturer);

        Refund saved = refundRepository.save(refund);

        // Manufacturer rejected => system immediately initiates refund processing.
        orderAuditService.recordEvent(order, OrderEventType.REFUND_PROCESSING, order.getStatus(), order.getStatus(), manufacturer,
                "Refund processing started (manufacturer rejected after payment)");

        cancelInvoiceIfAny(order, manufacturer);

        return saved;
    }

    /**
     * Retailer cancels after payment:
     * - create refund request pending approval, do not process yet
     * - idempotent: if a refund exists, return it
     */
    @Transactional
    public Refund ensureRefundRequestCreatedForRetailerCancellation(Order order, User retailer, String reason) {
        Refund existing = refundRepository.findByOrderId(order.getId()).orElse(null);
        if (existing != null) {
            return existing;
        }

        Payment payment = paymentRepository.findByOrderId(order.getId()).orElse(null);
        if (payment == null || payment.getStatus() != PaymentStatus.SUCCESS) {
            return null;
        }

        Refund refund = Refund.builder()
                .order(order)
                .payment(payment)
                .gateway(payment.getGateway() == null ? null : payment.getGateway().name())
                .initiatedBy(RefundInitiatedBy.RETAILER)
                .status(RefundStatus.PENDING_APPROVAL)
                .reason(reason)
                .build();
        refund.setCreatedBy(retailer);
        refund.setUpdatedBy(retailer);

        Refund saved = refundRepository.save(refund);

        orderAuditService.recordEvent(order, OrderEventType.REFUND_REQUESTED, order.getStatus(), order.getStatus(), retailer,
                "Refund requested (retailer cancelled after payment)");

        return saved;
    }

    /**
     * Manufacturer approves a pending refund request, and refund is processed immediately (mock gateway).
     */
    @Transactional
    public Refund approveRefund(Long orderId, User manufacturer, String note) {
        Refund refund = refundRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Refund", "orderId", orderId));

        Order order = refund.getOrder();
        if (order.getManufacturer() == null || !order.getManufacturer().getId().equals(manufacturer.getId())) {
            throw new AccessDeniedException("Order", orderId);
        }

        // Idempotent: if already processing/processed, just return.
        if (refund.getStatus() == RefundStatus.PROCESSED || refund.getStatus() == RefundStatus.PROCESSING) {
            return refund;
        }

        if (refund.getStatus() != RefundStatus.PENDING_APPROVAL) {
            throw new AccessDeniedException("Refund is not pending approval");
        }

        refund.setStatus(RefundStatus.APPROVED);
        refund.setApprovedAt(LocalDateTime.now());
        refund.setManufacturerNote(note == null ? null : note.trim());
        refund.setUpdatedBy(manufacturer);

        // Record explicit approval.
        orderAuditService.recordEvent(order, OrderEventType.REFUND_APPROVED, order.getStatus(), order.getStatus(), manufacturer,
                "Refund approved by manufacturer");

        // Production-style: move to PROCESSING and mark payment as REFUND_PENDING.
        Payment payment = refund.getPayment();
        if (payment != null && payment.getStatus() == PaymentStatus.SUCCESS) {
            payment.setStatus(PaymentStatus.REFUND_PENDING);
        }

        refund.setStatus(RefundStatus.PROCESSING);

        // Record processing start.
        orderAuditService.recordEvent(order, OrderEventType.REFUND_PROCESSING, order.getStatus(), order.getStatus(), manufacturer,
                "Refund processing started");

        cancelInvoiceIfAny(order, manufacturer);

        return refund;
    }

    @Transactional
    public Refund rejectRefund(Long orderId, User manufacturer, String note) {
        Refund refund = refundRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Refund", "orderId", orderId));

        Order order = refund.getOrder();
        if (order.getManufacturer() == null || !order.getManufacturer().getId().equals(manufacturer.getId())) {
            throw new AccessDeniedException("Order", orderId);
        }

        if (refund.getStatus() == RefundStatus.REJECTED) {
            return refund; // idempotent
        }

        if (refund.getStatus() != RefundStatus.PENDING_APPROVAL) {
            throw new AccessDeniedException("Refund is not pending approval");
        }

        refund.setStatus(RefundStatus.REJECTED);
        refund.setApprovedAt(LocalDateTime.now());
        refund.setManufacturerNote(note == null ? null : note.trim());
        refund.setUpdatedBy(manufacturer);

        orderAuditService.recordEvent(order, OrderEventType.REFUND_REJECTED, order.getStatus(), order.getStatus(), manufacturer,
                "Refund rejected by manufacturer");

        return refund;
    }

    @Transactional(readOnly = true)
    public RefundResponse getRefundForOrder(Long orderId, User requester) {
        Refund refund = refundRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Refund", "orderId", orderId));

        Order order = refund.getOrder();
        boolean canView = (order.getRetailer() != null && order.getRetailer().getId().equals(requester.getId()))
                || (order.getManufacturer() != null && order.getManufacturer().getId().equals(requester.getId()));
        if (!canView) {
            throw new AccessDeniedException("Order", orderId);
        }

        return mapToResponse(refund);
    }

    private RefundResponse mapToResponse(Refund refund) {
        return RefundResponse.builder()
                .id(refund.getId())
                .orderId(refund.getOrder() == null ? null : refund.getOrder().getId())
                .paymentId(refund.getPayment() == null ? null : refund.getPayment().getId())
                .initiatedBy(refund.getInitiatedBy())
                .status(refund.getStatus())
                .reason(refund.getReason())
                .manufacturerNote(refund.getManufacturerNote())
                .requestedAt(refund.getRequestedAt())
                .approvedAt(refund.getApprovedAt())
                .processedAt(refund.getProcessedAt())
                .refundReference(refund.getRefundReference())
                .build();
    }

    private void cancelInvoiceIfAny(Order order, User actor) {
        invoiceRepository.findByOrderId(order.getId()).ifPresent(inv -> {
            if (inv.getStatus() != InvoiceStatus.CANCELLED) {
                inv.setStatus(InvoiceStatus.CANCELLED);
                inv.setUpdatedBy(actor);
            }
        });
    }

    /**
     * Manufacturer cancels after payment:
     * - refund is auto processed (mock gateway)
     * - idempotent: if a refund exists, do nothing
     */
    @Transactional
    public Refund ensureAutoRefundProcessedForManufacturerCancellation(Order order, User manufacturer, String reason) {
        Refund existing = refundRepository.findByOrderId(order.getId()).orElse(null);
        if (existing != null) {
            return existing;
        }

        Payment payment = paymentRepository.findByOrderId(order.getId()).orElse(null);
        if (payment == null || payment.getStatus() != PaymentStatus.SUCCESS) {
            return null;
        }

        payment.setStatus(PaymentStatus.REFUND_PENDING);

        Refund refund = Refund.builder()
                .order(order)
                .payment(payment)
                .gateway(payment.getGateway() == null ? null : payment.getGateway().name())
                .initiatedBy(RefundInitiatedBy.SYSTEM)
                .status(RefundStatus.PROCESSING)
                .reason(reason)
                .approvedAt(LocalDateTime.now())
                .build();
        refund.setCreatedBy(manufacturer);
        refund.setUpdatedBy(manufacturer);

        Refund saved = refundRepository.save(refund);

        orderAuditService.recordEvent(order, OrderEventType.REFUND_PROCESSING, order.getStatus(), order.getStatus(), manufacturer,
                "Refund processing started (manufacturer cancelled after payment)");

        cancelInvoiceIfAny(order, manufacturer);

        return saved;
    }
}
