package com.quickcart.backend.service;

import com.quickcart.backend.dto.OrderItemRequest;
import com.quickcart.backend.dto.PlaceOrderRequest;
import com.quickcart.backend.entity.*;
import com.quickcart.backend.exception.AccessDeniedException;
import com.quickcart.backend.exception.InsufficientStockException;
import com.quickcart.backend.exception.ResourceNotFoundException;
import com.quickcart.backend.repository.OrderRepository;
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

        // Create order
        Order order = Order.builder()
                .retailer(retailer)
                .manufacturer(manufacturer)
                .status(OrderStatus.CREATED)
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

        orderAuditService.recordEvent(saved, OrderEventType.ORDER_PLACED, null, OrderStatus.CREATED, retailer, "Order placed");

        return saved;
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
            throw new AccessDeniedException("Only CONFIRMED orders can be accepted");
        }

        OrderStatus from = order.getStatus();
        order.setStatus(OrderStatus.ACCEPTED);
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
            throw new AccessDeniedException("Only CONFIRMED orders can be rejected");
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
        refundService.ensureAutoRefundProcessedForManufacturerReject(order, manufacturer, reason);
    }

    @Transactional
    public void updateOrderStatus(Long orderId, OrderStatus newStatus, User manufacturer) {

        if (!manufacturer.hasRole("MANUFACTURER")) {
            throw new AccessDeniedException("Only manufacturers can update order status");
        }

        Order order = orderRepository.findByIdAndManufacturer(orderId, manufacturer)
                .orElseThrow(() -> new AccessDeniedException("Order", orderId));

        // Basic validation (can be expanded later)
        if (order.getStatus() == OrderStatus.CANCELLED ||
                order.getStatus() == OrderStatus.DELIVERED ||
                order.getStatus() == OrderStatus.REJECTED) {
            throw new AccessDeniedException("Order status cannot be updated");
        }

        // Enforce a simple manufacturer workflow:
        // - After payment: CONFIRMED must go to ACCEPTED/REJECTED first
        // - Shipping only after ACCEPTED
        if (order.getStatus() == OrderStatus.CONFIRMED &&
                newStatus != OrderStatus.ACCEPTED &&
                newStatus != OrderStatus.REJECTED) {
            throw new AccessDeniedException("Order must be accepted or rejected before further status updates");
        }

        if (newStatus == OrderStatus.SHIPPED && order.getStatus() != OrderStatus.ACCEPTED) {
            throw new AccessDeniedException("Only ACCEPTED orders can be marked as SHIPPED");
        }

        if (newStatus == OrderStatus.DELIVERED && order.getStatus() != OrderStatus.SHIPPED) {
            throw new AccessDeniedException("Only SHIPPED orders can be marked as DELIVERED");
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
            throw new AccessDeniedException("Only ACCEPTED orders can be shipped");
        }

        OrderStatus from = order.getStatus();

        order.setShipmentCarrier(carrier == null ? null : carrier.trim());
        order.setShipmentTrackingNumber(trackingNumber == null ? null : trackingNumber.trim());
        order.setShipmentTrackingUrl(trackingUrl == null ? null : trackingUrl.trim());
        order.setShippedAt(java.time.LocalDateTime.now());

        order.setStatus(OrderStatus.SHIPPED);
        order.setUpdatedBy(manufacturer);

        String note = "Shipment created";
        if (order.getShipmentCarrier() != null && !order.getShipmentCarrier().isBlank()) {
            note += " (" + order.getShipmentCarrier() + ")";
        }
        if (order.getShipmentTrackingNumber() != null && !order.getShipmentTrackingNumber().isBlank()) {
            note += " tracking=" + order.getShipmentTrackingNumber();
        }

        orderAuditService.recordEvent(order, OrderEventType.STATUS_CHANGED, from, OrderStatus.SHIPPED, manufacturer, note);
    }

    @Transactional
    public void markDelivered(Long orderId, User manufacturer) {
        if (!manufacturer.hasRole("MANUFACTURER")) {
            throw new AccessDeniedException("Only manufacturers can mark orders as delivered");
        }

        Order order = orderRepository.findByIdAndManufacturer(orderId, manufacturer)
                .orElseThrow(() -> new AccessDeniedException("Order", orderId));

        if (order.getStatus() != OrderStatus.SHIPPED) {
            throw new AccessDeniedException("Only SHIPPED orders can be marked as DELIVERED");
        }

        OrderStatus from = order.getStatus();
        order.setStatus(OrderStatus.DELIVERED);
        order.setDeliveredAt(java.time.LocalDateTime.now());
        order.setUpdatedBy(manufacturer);

        orderAuditService.recordEvent(order, OrderEventType.STATUS_CHANGED, from, OrderStatus.DELIVERED, manufacturer, "Order marked as delivered");
    }

    /**
     * Cancel an order (restocks items).
     *
     * Rules (v1):
     * - Retailer can cancel any time before shipping: CREATED / CONFIRMED / ACCEPTED
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
        if (current == OrderStatus.CANCELLED || current == OrderStatus.REJECTED || current == OrderStatus.SHIPPED || current == OrderStatus.DELIVERED) {
            throw new AccessDeniedException("Order cannot be cancelled at current status: " + current);
        }

        // Role/stage rules
        if (current == OrderStatus.CREATED) {
            // Before payment: only retailer should be able to cancel
            if (!(isRetailer && isOrderRetailer)) {
                throw new AccessDeniedException("Only the retailer can cancel a CREATED order");
            }
        } else if (current == OrderStatus.CONFIRMED || current == OrderStatus.ACCEPTED) {
            // After payment but before shipping: retailer OR manufacturer can cancel (their own order)
            boolean allowed = (isRetailer && isOrderRetailer) || (isManufacturer && isOrderManufacturer);
            if (!allowed) {
                throw new AccessDeniedException("Only the retailer or manufacturer can cancel this order before shipping");
            }
        } else {
            throw new AccessDeniedException("Order cannot be cancelled at current status: " + current);
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

        // Refund workflow:
        // - Retailer cancelling after payment => needs manufacturer approval (creates refund request only).
        if (isRetailer && (from == OrderStatus.CONFIRMED || from == OrderStatus.ACCEPTED)) {
            refundService.ensureRefundRequestCreatedForRetailerCancellation(order, actor, reason);
        }

        // - Manufacturer cancelling after payment => automatic refund processing.
        if (isManufacturer && (from == OrderStatus.CONFIRMED || from == OrderStatus.ACCEPTED)) {
            refundService.ensureAutoRefundProcessedForManufacturerCancellation(order, actor, reason);
        }
    }

}
