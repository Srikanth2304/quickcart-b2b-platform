package com.quickcart.backend.service;

import com.quickcart.backend.dto.OrderItemRequest;
import com.quickcart.backend.dto.PlaceOrderRequest;
import com.quickcart.backend.entity.*;
import com.quickcart.backend.exception.AccessDeniedException;
import com.quickcart.backend.exception.InsufficientStockException;
import com.quickcart.backend.exception.InvalidStateTransitionException;
import com.quickcart.backend.exception.OrderAlreadyCancelledException;
import com.quickcart.backend.exception.ResourceNotFoundException;
import com.quickcart.backend.repository.InvoiceRepository;
import com.quickcart.backend.repository.OrderRepository;
import com.quickcart.backend.repository.PaymentRepository;
import com.quickcart.backend.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final InvoiceRepository invoiceRepository;
    private final OrderAuditService orderAuditService;
    private final RefundService refundService;
    private final AddressService addressService;

    /**
     * Retailer places an order.
     */
    @Transactional
    public Order placeOrder(PlaceOrderRequest request, User retailer) {

        if (!retailer.hasRole("RETAILER")) {
            throw new AccessDeniedException("Only retailers can place orders");
        }

        // Resolve payment method — default to ONLINE for backward compatibility
        PaymentMethod paymentMethod = request.getPaymentMethod() != null
                ? request.getPaymentMethod()
                : PaymentMethod.ONLINE;

        // Resolve address owned by retailer and take a snapshot into the order
        Address address = addressService.getAddressOwnedByUserOrThrow(request.getDeliveryAddressId(), retailer);

        List<OrderItem> orderItems = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        // Assume all products belong to the same manufacturer (B2B rule)
        User manufacturer = null;

        for (OrderItemRequest itemRequest : request.getItems()) {

            Product product = productRepository.findById(itemRequest.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product", "id", itemRequest.getProductId()));

            if (!product.isActive()) {
                throw new ResourceNotFoundException("Product is inactive or unavailable");
            }

            if (product.getStockQuantity() < itemRequest.getQuantity()) {
                throw new InsufficientStockException(
                        product.getName(),
                        itemRequest.getQuantity(),
                        product.getStockQuantity()
                );
            }

            // Set manufacturer once
            if (manufacturer == null) {
                manufacturer = product.getManufacturer();
            } else if (!manufacturer.getId().equals(product.getManufacturer().getId())) {
                throw new AccessDeniedException("All products must belong to the same manufacturer");
            }

            // Reduce stock
            product.setStockQuantity(
                    product.getStockQuantity() - itemRequest.getQuantity()
            );

            BigDecimal itemTotal =
                    product.getPrice().multiply(BigDecimal.valueOf(itemRequest.getQuantity()));
            totalAmount = totalAmount.add(itemTotal);

            OrderItem orderItem = OrderItem.builder()
                    .product(product)
                    .quantity(itemRequest.getQuantity())
                    .price(product.getPrice())
                    .build();

            orderItems.add(orderItem);
        }

        // Determine initial status based on payment method
        OrderStatus initialStatus = (paymentMethod == PaymentMethod.CASH_ON_DELIVERY)
                ? OrderStatus.CONFIRMED
                : OrderStatus.PAYMENT_PENDING;

        // Create order
        Order order = Order.builder()
                .retailer(retailer)
                .manufacturer(manufacturer)
                .status(initialStatus)
                .paymentMethod(paymentMethod)
                .totalAmount(totalAmount)
                // snapshot fields
                .deliveryName(address.getName())
                .deliveryPhone(address.getPhone())
                .deliveryAddressLine1(address.getAddressLine1())
                .deliveryCity(address.getCity())
                .deliveryState(address.getState())
                .deliveryPincode(address.getPincode())
                .build();

        // audit
        order.setCreatedBy(retailer);
        order.setUpdatedBy(retailer);

        // Link items to order
        orderItems.forEach(item -> item.setOrder(order));
        order.setItems(orderItems);

        Order saved = orderRepository.save(order);

        orderAuditService.recordEvent(saved, OrderEventType.ORDER_PLACED, null, initialStatus, retailer,
                "Order placed (" + paymentMethod.name() + ")");

        // ── COD-specific post-creation logic ────────────────────────────
        if (paymentMethod == PaymentMethod.CASH_ON_DELIVERY) {
            createCodPaymentRecord(saved, retailer);
            createCodInvoice(saved, retailer);
        }

        return saved;
    }

    /**
     * Create a Payment row for COD orders with status PENDING_COLLECTION.
     * No gateway interaction — purely a bookkeeping record.
     */
    private void createCodPaymentRecord(Order order, User retailer) {
        Payment payment = Payment.builder()
                .order(order)
                .retailer(retailer)
                .amount(order.getTotalAmount())
                .status(PaymentStatus.PENDING_COLLECTION)
                .gateway(PaymentGateway.NONE)
                .build();
        payment.setCreatedBy(retailer);
        payment.setUpdatedBy(retailer);

        paymentRepository.save(payment);

        orderAuditService.recordEvent(order, OrderEventType.PAYMENT_CREATED, order.getStatus(), order.getStatus(), retailer,
                "COD payment record created (pending collection at delivery)");
    }

    /**
     * Create an invoice immediately for COD orders.
     */
    private void createCodInvoice(Order order, User retailer) {
        Invoice invoice = Invoice.builder()
                .order(order)
                .retailer(retailer)
                .amount(order.getTotalAmount())
                .build();
        invoice.setCreatedBy(retailer);
        invoice.setUpdatedBy(retailer);

        invoiceRepository.save(invoice);

        orderAuditService.recordEvent(order, OrderEventType.INVOICE_GENERATED, order.getStatus(), order.getStatus(), retailer,
                "Invoice generated for COD order");
    }

    /**
     * Manufacturer explicitly accepts a paid order.
     * Allowed transition: CONFIRMED -> ACCEPTED
     */
    @Transactional
    public void acceptOrder(Long orderId, User manufacturer) {
        if (!manufacturer.hasRole("MANUFACTURER")) {
            throw new AccessDeniedException("Only manufacturers can accept orders");
        }

        Order order = orderRepository.findByIdAndManufacturer(orderId, manufacturer)
                .orElseThrow(() -> new AccessDeniedException("Order", orderId));

        if (order.getStatus() != OrderStatus.CONFIRMED) {
            throw new InvalidStateTransitionException(
                    order.getStatus().name(), OrderStatus.ACCEPTED.name());
        }

        OrderStatus from = order.getStatus();
        order.setStatus(OrderStatus.ACCEPTED);
        order.setAcceptedAt(java.time.LocalDateTime.now());
        order.setUpdatedBy(manufacturer);

        orderAuditService.recordEvent(order, OrderEventType.STATUS_CHANGED, from, OrderStatus.ACCEPTED, manufacturer, "Order accepted by manufacturer");
    }

    /**
     * Manufacturer rejects a paid order.
     * Allowed transition: CONFIRMED -> REJECTED
     */
    @Transactional
    public void rejectOrder(Long orderId, String reason, User manufacturer) {
        if (!manufacturer.hasRole("MANUFACTURER")) {
            throw new AccessDeniedException("Only manufacturers can reject orders");
        }

        Order order = orderRepository.findByIdAndManufacturer(orderId, manufacturer)
                .orElseThrow(() -> new AccessDeniedException("Order", orderId));

        if (order.getStatus() != OrderStatus.CONFIRMED) {
            throw new InvalidStateTransitionException(
                    order.getStatus().name(), OrderStatus.REJECTED.name());
        }

        OrderStatus from = order.getStatus();
        order.setStatus(OrderStatus.REJECTED);
        order.setUpdatedBy(manufacturer);

        String note = "Order rejected by manufacturer";
        if (reason != null && !reason.isBlank()) {
            note = note + ": " + reason.trim();
        }

        orderAuditService.recordEvent(order, OrderEventType.STATUS_CHANGED, from, OrderStatus.REJECTED, manufacturer, note);

        // Refund workflow: manufacturer reject after payment should auto-refund.
        // For COD orders, no gateway refund is needed — skip refund processing.
        if (order.getPaymentMethod() != PaymentMethod.CASH_ON_DELIVERY) {
            refundService.ensureAutoRefundProcessedForManufacturerReject(order, manufacturer, reason);
        }
    }

    @Transactional
    public void updateOrderStatus(Long orderId, OrderStatus newStatus, User manufacturer) {

        if (!manufacturer.hasRole("MANUFACTURER")) {
            throw new AccessDeniedException("Only manufacturers can update order status");
        }

        Order order = orderRepository.findByIdAndManufacturer(orderId, manufacturer)
                .orElseThrow(() -> new AccessDeniedException("Order", orderId));

        OrderStatus current = order.getStatus();

        // Terminal states: cannot update further
        if (current == OrderStatus.CANCELLED) {
            throw new OrderAlreadyCancelledException(orderId);
        }
        if (current == OrderStatus.DELIVERED || current == OrderStatus.REJECTED) {
            throw new InvalidStateTransitionException(
                    current.name(), newStatus.name());
        }

        // Enforce a simple manufacturer workflow:
        // - After payment: CONFIRMED must go to ACCEPTED/REJECTED first
        // - Shipping only after ACCEPTED
        if (current == OrderStatus.CONFIRMED &&
                newStatus != OrderStatus.ACCEPTED &&
                newStatus != OrderStatus.REJECTED) {
            throw new InvalidStateTransitionException(
                    "Order must be accepted or rejected before further status updates. Current: "
                    + current.name() + ", requested: " + newStatus.name());
        }

        if (newStatus == OrderStatus.SHIPPED && current != OrderStatus.ACCEPTED) {
            throw new InvalidStateTransitionException(
                    current.name(), OrderStatus.SHIPPED.name());
        }

        if (newStatus == OrderStatus.DELIVERED && current != OrderStatus.SHIPPED) {
            throw new InvalidStateTransitionException(
                    current.name(), OrderStatus.DELIVERED.name());
        }

        OrderStatus from = order.getStatus();
        order.setStatus(newStatus);
        order.setUpdatedBy(manufacturer);

        orderAuditService.recordEvent(order, OrderEventType.STATUS_CHANGED, from, newStatus, manufacturer, "Status updated");
    }

    @Transactional
    public void createShipment(Long orderId,
                               String carrier,
                               String trackingNumber,
                               String trackingUrl,
                               User manufacturer) {
        if (!manufacturer.hasRole("MANUFACTURER")) {
            throw new AccessDeniedException("Only manufacturers can create shipments");
        }

        Order order = orderRepository.findByIdAndManufacturer(orderId, manufacturer)
                .orElseThrow(() -> new AccessDeniedException("Order", orderId));

        if (order.getStatus() != OrderStatus.ACCEPTED) {
            throw new InvalidStateTransitionException(
                    order.getStatus().name(), OrderStatus.SHIPPED.name());
        }

        OrderStatus from = order.getStatus();

        order.setShipmentCarrier(carrier == null ? null : carrier.trim());
        order.setShipmentTrackingNumber(trackingNumber == null ? null : trackingNumber.trim());
        order.setShipmentTrackingUrl(trackingUrl == null ? null : trackingUrl.trim());
        order.setShippedAt(java.time.LocalDateTime.now());

        order.setStatus(OrderStatus.SHIPPED);
        order.setUpdatedBy(manufacturer);

        String shipNote = "Shipment created";
        if (order.getShipmentCarrier() != null && !order.getShipmentCarrier().isBlank()) {
            shipNote += " (" + order.getShipmentCarrier() + ")";
        }
        if (order.getShipmentTrackingNumber() != null && !order.getShipmentTrackingNumber().isBlank()) {
            shipNote += " tracking=" + order.getShipmentTrackingNumber();
        }

        orderAuditService.recordEvent(order, OrderEventType.STATUS_CHANGED, from, OrderStatus.SHIPPED, manufacturer, shipNote);
    }

    @Transactional
    public void markDelivered(Long orderId, User manufacturer) {
        if (!manufacturer.hasRole("MANUFACTURER")) {
            throw new AccessDeniedException("Only manufacturers can mark orders as delivered");
        }

        Order order = orderRepository.findByIdAndManufacturer(orderId, manufacturer)
                .orElseThrow(() -> new AccessDeniedException("Order", orderId));

        if (order.getStatus() != OrderStatus.SHIPPED) {
            throw new InvalidStateTransitionException(
                    order.getStatus().name(), OrderStatus.DELIVERED.name());
        }

        OrderStatus from = order.getStatus();
        order.setStatus(OrderStatus.DELIVERED);
        order.setDeliveredAt(java.time.LocalDateTime.now());
        order.setUpdatedBy(manufacturer);

        orderAuditService.recordEvent(order, OrderEventType.STATUS_CHANGED, from, OrderStatus.DELIVERED, manufacturer, "Order marked as delivered");

        // COD: mark payment as COLLECTED upon delivery
        if (order.getPaymentMethod() == PaymentMethod.CASH_ON_DELIVERY) {
            markCodPaymentCollected(order, manufacturer);
        }
    }

    /**
     * Mark COD payment as COLLECTED when the order is delivered.
     */
    private void markCodPaymentCollected(Order order, User actor) {
        paymentRepository.findByOrderId(order.getId()).ifPresent(payment -> {
            if (payment.getStatus() == PaymentStatus.PENDING_COLLECTION) {
                payment.setStatus(PaymentStatus.COLLECTED);
                payment.setUpdatedBy(actor);
            }
        });
    }

    /**
     * Cancel an order (restocks items).
     *
     * Rules:
     * - Retailer can cancel any time before shipping: PAYMENT_PENDING / CONFIRMED / ACCEPTED
     * - Manufacturer can cancel any time before shipping: CONFIRMED / ACCEPTED
     * - No one can cancel after SHIPPED/DELIVERED, or if already REJECTED/CANCELLED
     *
     * Stock: For any successful cancellation, the ordered quantities are added back to product stock.
     */
    @Transactional
    public void cancelOrder(Long orderId, String reason, User actor) {
        Order order = orderRepository.findByIdWithRelations(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        boolean isRetailer = actor.hasRole("RETAILER");
        boolean isManufacturer = actor.hasRole("MANUFACTURER");

        boolean isOrderRetailer = order.getRetailer() != null && order.getRetailer().getId().equals(actor.getId());
        boolean isOrderManufacturer = order.getManufacturer() != null && order.getManufacturer().getId().equals(actor.getId());

        if (!(isOrderRetailer || isOrderManufacturer)) {
            throw new AccessDeniedException("Order", orderId);
        }

        OrderStatus current = order.getStatus();

        // Already cancelled — idempotent-safe for retries
        if (current == OrderStatus.CANCELLED) {
            throw new OrderAlreadyCancelledException(orderId);
        }

        // Terminal states that cannot be cancelled
        if (current == OrderStatus.REJECTED || current == OrderStatus.SHIPPED || current == OrderStatus.DELIVERED) {
            throw new InvalidStateTransitionException(
                    current.name(), OrderStatus.CANCELLED.name());
        }

        // Role/stage rules
        if (current == OrderStatus.PAYMENT_PENDING) {
            // Before payment: only retailer should be able to cancel
            if (!(isRetailer && isOrderRetailer)) {
                throw new AccessDeniedException("Only the retailer can cancel a PAYMENT_PENDING order");
            }
        } else if (current == OrderStatus.CONFIRMED || current == OrderStatus.ACCEPTED) {
            // After payment but before shipping: retailer OR manufacturer can cancel (their own order)
            boolean allowed = (isRetailer && isOrderRetailer) || (isManufacturer && isOrderManufacturer);
            if (!allowed) {
                throw new AccessDeniedException("Only the retailer or manufacturer can cancel this order before shipping");
            }
        } else {
            throw new InvalidStateTransitionException(
                    current.name(), OrderStatus.CANCELLED.name());
        }

        // Restock
        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                Product product = item.getProduct();
                if (product == null) continue;
                Integer q = item.getQuantity() == null ? 0 : item.getQuantity();
                product.setStockQuantity(product.getStockQuantity() + q);
            }
        }

        OrderStatus from = order.getStatus();
        order.setStatus(OrderStatus.CANCELLED);
        order.setUpdatedBy(actor);

        String note = "Order cancelled";
        if (reason != null && !reason.isBlank()) {
            note += ": " + reason.trim();
        }

        orderAuditService.recordEvent(order, OrderEventType.ORDER_CANCELLED, from, OrderStatus.CANCELLED, actor, note);

        // ── Refund workflow (ONLINE orders only) ────────────────────────
        // COD orders have no gateway payment to refund.
        boolean isCod = order.getPaymentMethod() == PaymentMethod.CASH_ON_DELIVERY;

        if (!isCod) {
            // - Retailer cancelling after payment => needs manufacturer approval (creates refund request only).
            if (isRetailer && (from == OrderStatus.CONFIRMED || from == OrderStatus.ACCEPTED)) {
                refundService.ensureRefundRequestCreatedForRetailerCancellation(order, actor, reason);
            }

            // - Manufacturer cancelling after payment => automatic refund processing.
            if (isManufacturer && (from == OrderStatus.CONFIRMED || from == OrderStatus.ACCEPTED)) {
                refundService.ensureAutoRefundProcessedForManufacturerCancellation(order, actor, reason);
            }
        }

        // COD: cancel the pending-collection payment record
        if (isCod) {
            cancelCodPaymentOnCancellation(order, actor);
        }
    }

    /**
     * When a COD order is cancelled, mark its payment record as FAILED (no money was collected).
     */
    private void cancelCodPaymentOnCancellation(Order order, User actor) {
        paymentRepository.findByOrderId(order.getId()).ifPresent(payment -> {
            if (payment.getStatus() == PaymentStatus.PENDING_COLLECTION) {
                payment.setStatus(PaymentStatus.FAILED);
                payment.setUpdatedBy(actor);
            }
        });
    }
}
