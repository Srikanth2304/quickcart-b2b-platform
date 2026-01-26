package com.quickcart.backend.service;

import com.quickcart.backend.config.RazorpayProperties;
import com.quickcart.backend.dto.PaymentRequest;
import com.quickcart.backend.dto.PaymentResponse;
import com.quickcart.backend.dto.RazorpayCreateOrderResponse;
import com.quickcart.backend.dto.RazorpayVerifyPaymentRequest;
import com.quickcart.backend.entity.*;
import com.quickcart.backend.exception.InvalidOrderStatusException;
import com.quickcart.backend.exception.InvalidPaymentSignatureException;
import com.quickcart.backend.exception.OrderAccessDeniedException;
import com.quickcart.backend.exception.ResourceNotFoundException;
import com.quickcart.backend.payment.GatewayOrder;
import com.quickcart.backend.payment.PaymentGatewayRouter;
import com.quickcart.backend.repository.InvoiceRepository;
import com.quickcart.backend.repository.OrderRepository;
import com.quickcart.backend.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final InvoiceRepository invoiceRepository;
    private final OrderAuditService orderAuditService;
    private final PaymentGatewayRouter gatewayRouter;
    private final RazorpayProperties razorpayProperties;

    /**
     * Legacy endpoint compatibility.
     *
     * Previously this method mocked SUCCESS immediately.
     * Now it maps to the production flow: it only creates the Razorpay order + Payment INITIATED.
     * Frontend must call verify after checkout.
     */
    @Transactional
    public void makePayment(PaymentRequest request, User retailer) {
        // Keep signature the same for existing callers; create the Razorpay order idempotently.
        createRazorpayOrder(request.getOrderId(), retailer);
    }

    /**
     * Step 1: Create a Razorpay order.
     * - Validates order ownership and status.
     * - Creates Payment with INITIATED + gateway=RAZORPAY.
     * - Calls Razorpay to create order and stores razorpayOrderId.
     */
    @Transactional
    public RazorpayCreateOrderResponse createRazorpayOrder(Long orderId, User retailer) {

        if (!retailer.hasRole("RETAILER")) {
            throw new RuntimeException("Only retailers can make payments");
        }

        Order order = orderRepository.findByIdAndRetailer(orderId, retailer)
                .orElseThrow(() -> new OrderAccessDeniedException(orderId));

        // If already confirmed and invoice exists, treat as already paid flow.
        var existingPaymentOpt = paymentRepository.findByOrderId(order.getId());
        if (existingPaymentOpt.isPresent()) {
            Payment existing = existingPaymentOpt.get();

            // If we already have a Razorpay order id, return it.
            if (existing.getRazorpayOrderId() != null) {
                return RazorpayCreateOrderResponse.builder()
                        .orderId(order.getId())
                        .razorpayOrderId(existing.getRazorpayOrderId())
                        .amount(existing.getAmount())
                        .currency(razorpayProperties.getCurrency())
                        .build();
            }

            // If payment is success, ensure downstream invariants and return with no new gateway order.
            if (existing.getStatus() == PaymentStatus.SUCCESS) {
                ensureOrderConfirmedAndInvoiceExists(order, retailer);
                return RazorpayCreateOrderResponse.builder()
                        .orderId(order.getId())
                        .razorpayOrderId(null)
                        .amount(existing.getAmount())
                        .currency(razorpayProperties.getCurrency())
                        .build();
            }
        }

        // For a brand new payment, only CREATED orders are payable.
        if (order.getStatus() != OrderStatus.CREATED) {
            throw new InvalidOrderStatusException(order.getId(), order.getStatus().toString());
        }

        // Create the gateway order first (so we can persist razorpayOrderId with payment)
        String receipt = razorpayProperties.getReceiptPrefix() + "-order-" + order.getId();
        GatewayOrder gatewayOrder = gatewayRouter.razorpay().createOrder(order.getTotalAmount(), razorpayProperties.getCurrency(), receipt);

        Payment payment = Payment.builder()
                .order(order)
                .retailer(retailer)
                .amount(order.getTotalAmount())
                .status(PaymentStatus.INITIATED)
                .gateway(PaymentGateway.RAZORPAY)
                .razorpayOrderId(gatewayOrder.getId())
                .build();
        payment.setCreatedBy(retailer);
        payment.setUpdatedBy(retailer);

        try {
            paymentRepository.saveAndFlush(payment);
        } catch (DataIntegrityViolationException ex) {
            // Race condition: another request created the payment first.
            var existing = paymentRepository.findByOrderId(order.getId());
            if (existing.isPresent()) {
                Payment p = existing.get();
                return RazorpayCreateOrderResponse.builder()
                        .orderId(order.getId())
                        .razorpayOrderId(p.getRazorpayOrderId())
                        .amount(p.getAmount())
                        .currency(razorpayProperties.getCurrency())
                        .build();
            }
            throw ex;
        }

        orderAuditService.recordEvent(order, OrderEventType.PAYMENT_CREATED, order.getStatus(), order.getStatus(), retailer,
                "Payment initiated (Razorpay order created)");

        return RazorpayCreateOrderResponse.builder()
                .orderId(order.getId())
                .razorpayOrderId(gatewayOrder.getId())
                .amount(order.getTotalAmount())
                .currency(razorpayProperties.getCurrency())
                .build();
    }

    /**
     * Step 2: Verify Razorpay checkout response.
     * This is the ONLY place a payment can become SUCCESS.
     */
    @Transactional
    public void verifyRazorpayPayment(RazorpayVerifyPaymentRequest request, User retailer) {

        if (!retailer.hasRole("RETAILER")) {
            throw new RuntimeException("Only retailers can verify payments");
        }

        Order order = orderRepository.findByIdAndRetailer(request.getOrderId(), retailer)
                .orElseThrow(() -> new OrderAccessDeniedException(request.getOrderId()));

        Payment payment = paymentRepository.findByOrderId(order.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Payment", "orderId", order.getId()));

        // Idempotent: if already succeeded, ensure invariants and return success.
        if (payment.getStatus() == PaymentStatus.SUCCESS) {
            ensureOrderConfirmedAndInvoiceExists(order, retailer);
            return;
        }

        // Must match the stored razorpay order id.
        if (payment.getRazorpayOrderId() == null || !payment.getRazorpayOrderId().equals(request.getRazorpayOrderId())) {
            throw new InvalidPaymentSignatureException();
        }

        // Verify signature via SDK helper.
        boolean ok = gatewayRouter.razorpay().verifySignature(
                request.getRazorpayOrderId(),
                request.getRazorpayPaymentId(),
                request.getRazorpaySignature()
        );
        if (!ok) {
            payment.setStatus(PaymentStatus.FAILED);
            payment.setUpdatedBy(retailer);
            throw new InvalidPaymentSignatureException();
        }

        // Mark payment success
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setRazorpayPaymentId(request.getRazorpayPaymentId());
        payment.setUpdatedBy(retailer);

        // Preserve existing business logic: once payment is successful => order confirmed + invoice generated.
        ensureOrderConfirmedAndInvoiceExists(order, retailer);
    }

    private void ensureOrderConfirmedAndInvoiceExists(Order order, User retailer) {
        // Confirm order if not already confirmed
        if (order.getStatus() == OrderStatus.CREATED) {
            OrderStatus from = order.getStatus();
            order.setStatus(OrderStatus.CONFIRMED);
            order.setUpdatedBy(retailer);
            orderRepository.save(order);
            orderAuditService.recordEvent(order, OrderEventType.STATUS_CHANGED, from, OrderStatus.CONFIRMED, retailer,
                    "Order confirmed by payment");
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
                orderAuditService.recordEvent(order, OrderEventType.INVOICE_GENERATED, order.getStatus(), order.getStatus(), retailer,
                        "Invoice generated");
            } catch (DataIntegrityViolationException ex) {
                if (invoiceRepository.findByOrderId(order.getId()).isPresent()) {
                    return;
                }
                throw ex;
            }
        }
    }

    @Transactional(readOnly = true)
    public PaymentResponse getPaymentForOrder(Long orderId, User requester) {
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