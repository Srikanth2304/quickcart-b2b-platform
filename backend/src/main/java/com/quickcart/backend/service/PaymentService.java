package com.quickcart.backend.service;

import com.quickcart.backend.dto.PaymentRequest;
import com.quickcart.backend.dto.PaymentResponse;
import com.quickcart.backend.entity.*;
import com.quickcart.backend.exception.InvalidOrderStatusException;
import com.quickcart.backend.exception.OrderAccessDeniedException;
import com.quickcart.backend.exception.ResourceNotFoundException;
import com.quickcart.backend.repository.InvoiceRepository;
import com.quickcart.backend.repository.OrderRepository;
import com.quickcart.backend.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final InvoiceRepository invoiceRepository;
    private final OrderAuditService orderAuditService;

    @Transactional
    public void makePayment(PaymentRequest request, User retailer) {

        // Validate that user has RETAILER role
        if (!retailer.hasRole("RETAILER")) {
            throw new RuntimeException("Only retailers can make payments");
        }

        // Fetch order using orderId and retailer (ensures authorization)
        Order order = orderRepository.findByIdAndRetailer(
                        request.getOrderId(), retailer)
                .orElseThrow(() ->
                        new OrderAccessDeniedException(request.getOrderId()));

        // Production behavior: safe to retry.
        var existingPaymentOpt = paymentRepository.findByOrderId(order.getId());
        if (existingPaymentOpt.isPresent()) {
            ensureOrderConfirmedAndInvoiceExists(order, retailer);
            return;
        }

        // For a brand new payment, only CREATED orders are payable.
        if (order.getStatus() != OrderStatus.CREATED) {
            throw new InvalidOrderStatusException(
                    order.getId(),
                    order.getStatus().toString()
            );
        }

        // Create payment
        Payment payment = Payment.builder()
                .order(order)
                .retailer(retailer)
                .amount(order.getTotalAmount())
                .status(PaymentStatus.SUCCESS) // mock gateway
                .paymentReference(UUID.randomUUID().toString())
                .build();

        payment.setCreatedBy(retailer);
        payment.setUpdatedBy(retailer);

        try {
            paymentRepository.saveAndFlush(payment);
        } catch (DataIntegrityViolationException ex) {
            // Race condition: another request created the payment first.
            // Treat as idempotent replay.
            if (paymentRepository.findByOrderId(order.getId()).isPresent()) {
                ensureOrderConfirmedAndInvoiceExists(order, retailer);
                return;
            }
            throw ex;
        }

        orderAuditService.recordEvent(order, OrderEventType.PAYMENT_CREATED, order.getStatus(), order.getStatus(), retailer, "Payment successful");

        // Update order status to CONFIRMED after successful payment
        OrderStatus from = order.getStatus();
        order.setStatus(OrderStatus.CONFIRMED);
        order.setUpdatedBy(retailer);
        orderRepository.save(order);
        orderAuditService.recordEvent(order, OrderEventType.STATUS_CHANGED, from, OrderStatus.CONFIRMED, retailer, "Order confirmed by payment");

        // AUTO-GENERATE INVOICE (ONE PER ORDER) - idempotent
        if (invoiceRepository.findByOrderId(order.getId()).isEmpty()) {
            Invoice invoice = Invoice.builder()
                    .order(order)
                    .retailer(retailer)
                    .amount(order.getTotalAmount())
                    .build();

            invoice.setCreatedBy(retailer);
            invoice.setUpdatedBy(retailer);

            try {
                invoiceRepository.saveAndFlush(invoice);
                orderAuditService.recordEvent(order, OrderEventType.INVOICE_GENERATED, order.getStatus(), order.getStatus(), retailer, "Invoice generated");
            } catch (DataIntegrityViolationException ex) {
                // Race condition: another thread created the invoice.
                if (invoiceRepository.findByOrderId(order.getId()).isPresent()) {
                    // Consider it successful; don't double-audit.
                    return;
                }
                throw ex;
            }
        }
    }

    private void ensureOrderConfirmedAndInvoiceExists(Order order, User retailer) {
        // Confirm order if not already confirmed
        if (order.getStatus() == OrderStatus.CREATED) {
            OrderStatus from = order.getStatus();
            order.setStatus(OrderStatus.CONFIRMED);
            order.setUpdatedBy(retailer);
            orderRepository.save(order);
            orderAuditService.recordEvent(order, OrderEventType.STATUS_CHANGED, from, OrderStatus.CONFIRMED, retailer, "Order confirmed by payment (idempotent retry)");
        }

        // Ensure invoice exists
        if (invoiceRepository.findByOrderId(order.getId()).isEmpty()) {
            Invoice invoice = Invoice.builder()
                    .order(order)
                    .retailer(retailer)
                    .amount(order.getTotalAmount())
                    .build();

            invoice.setCreatedBy(retailer);
            invoice.setUpdatedBy(retailer);

            try {
                invoiceRepository.saveAndFlush(invoice);
                orderAuditService.recordEvent(order, OrderEventType.INVOICE_GENERATED, order.getStatus(), order.getStatus(), retailer, "Invoice generated (idempotent retry)");
            } catch (DataIntegrityViolationException ex) {
                // If another request created it first, we're good.
                if (invoiceRepository.findByOrderId(order.getId()).isPresent()) {
                    return;
                }
                throw ex;
            }
        }
    }

    @Transactional(readOnly = true)
    public PaymentResponse getPaymentForOrder(Long orderId, User requester) {
        // Must be retailer or manufacturer on that order
        Order order = orderRepository.findByIdWithRelations(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        boolean canView = (order.getRetailer() != null && order.getRetailer().getId().equals(requester.getId()))
                || (order.getManufacturer() != null && order.getManufacturer().getId().equals(requester.getId()));
        if (!canView) {
            throw new OrderAccessDeniedException(orderId);
        }

        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment", "orderId", orderId));

        return PaymentResponse.builder()
                .id(payment.getId())
                .orderId(payment.getOrder() == null ? null : payment.getOrder().getId())
                .retailerId(payment.getRetailer() == null ? null : payment.getRetailer().getId())
                .amount(payment.getAmount())
                .status(payment.getStatus())
                .paymentReference(payment.getPaymentReference())
                .build();
    }
}