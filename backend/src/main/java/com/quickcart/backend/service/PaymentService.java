package com.quickcart.backend.service;

import com.quickcart.backend.dto.PaymentRequest;
import com.quickcart.backend.entity.*;
import com.quickcart.backend.exception.DuplicatePaymentException;
import com.quickcart.backend.exception.InvalidOrderStatusException;
import com.quickcart.backend.exception.OrderAccessDeniedException;
import com.quickcart.backend.repository.InvoiceRepository;
import com.quickcart.backend.repository.OrderRepository;
import com.quickcart.backend.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final InvoiceRepository invoiceRepository;

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

        // Validate that order status is CREATED
        if (order.getStatus() != OrderStatus.CREATED) {
            throw new InvalidOrderStatusException(
                    order.getId(),
                    order.getStatus().toString()
            );
        }

        // Check if a payment already exists for this order
        if (paymentRepository.findByOrderId(order.getId()).isPresent()) {
            throw new DuplicatePaymentException(order.getId());
        }

        // Create payment with required details
        Payment payment = Payment.builder()
                .order(order)
                .retailer(retailer)
                .amount(order.getTotalAmount())
                .status(PaymentStatus.SUCCESS) // mock gateway
                .paymentReference(UUID.randomUUID().toString())
                .build();

        paymentRepository.save(payment);

        // Update order status to CONFIRMED after successful payment
        order.setStatus(OrderStatus.CONFIRMED);

        // AUTO-GENERATE INVOICE (ONE PER ORDER)
        Invoice invoice = Invoice.builder()
                .order(order)
                .retailer(retailer)
                .amount(order.getTotalAmount())
                .build();

        invoiceRepository.save(invoice);
    }
}