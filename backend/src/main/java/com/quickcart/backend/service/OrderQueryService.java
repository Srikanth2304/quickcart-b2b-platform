package com.quickcart.backend.service;

import com.quickcart.backend.dto.OrderItemResponse;
import com.quickcart.backend.dto.OrderPaymentResponse;
import com.quickcart.backend.dto.OrderResponse;
import com.quickcart.backend.dto.OrderSummaryResponse;
import com.quickcart.backend.entity.Order;
import com.quickcart.backend.entity.OrderItem;
import com.quickcart.backend.entity.OrderStatus;
import com.quickcart.backend.entity.Payment;
import com.quickcart.backend.entity.User;
import com.quickcart.backend.exception.AccessDeniedException;
import com.quickcart.backend.exception.ResourceNotFoundException;
import com.quickcart.backend.repository.OrderRepository;
import com.quickcart.backend.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderQueryService {

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;

    /**
     * Status group name → constituent OrderStatus values.
     */
    private static final Map<String, List<OrderStatus>> STATUS_GROUPS = Map.of(
            "ACTIVE", List.of(OrderStatus.CREATED, OrderStatus.CONFIRMED, OrderStatus.ACCEPTED, OrderStatus.SHIPPED),
            "DELIVERED", List.of(OrderStatus.DELIVERED),
            "CANCELLED", List.of(OrderStatus.CANCELLED, OrderStatus.REJECTED)
    );

    /**
     * Resolve a status filter string to a list of OrderStatus values.
     * Supports both group names (ACTIVE, DELIVERED, CANCELLED) and individual enum values.
     *
     * @return list of OrderStatus values, or null if no filter
     */
    private List<OrderStatus> resolveStatusFilter(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        String upper = status.trim().toUpperCase();

        // Check group names first
        List<OrderStatus> group = STATUS_GROUPS.get(upper);
        if (group != null) {
            return group;
        }

        // Fall back to individual enum value
        try {
            return List.of(OrderStatus.valueOf(upper));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid status filter: " + status +
                    ". Allowed values: ACTIVE, DELIVERED, CANCELLED, or any OrderStatus enum value.");
        }
    }

    /**
     * Get paginated orders for authenticated user, optionally filtered by status group.
     * Manufacturer → orders received
     * Retailer → orders placed
     */
    public Page<OrderResponse> getOrders(User user, String status, Pageable pageable) {

        List<OrderStatus> statuses = resolveStatusFilter(status);

        // Production-safe pagination:
        // 1) paginate over IDs (no fetch joins)
        // 2) fetch relations for those IDs with fetch joins
        Page<Long> idsPage;

        if (user.hasRole("MANUFACTURER")) {
            idsPage = statuses != null
                    ? orderRepository.findIdsByManufacturerAndStatusIn(user, statuses, pageable)
                    : orderRepository.findIdsByManufacturer(user, pageable);
        } else {
            idsPage = statuses != null
                    ? orderRepository.findIdsByRetailerAndStatusIn(user, statuses, pageable)
                    : orderRepository.findIdsByRetailer(user, pageable);
        }

        List<Long> ids = idsPage.getContent();
        if (ids.isEmpty()) {
            return new PageImpl<>(List.<OrderResponse>of(), pageable, idsPage.getTotalElements());
        }

        List<Order> orders = orderRepository.findAllByIdWithRelations(ids);

        // Preserve the order of the paged IDs
        Map<Long, Order> byId = orders.stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(Order::getId, Function.identity()));

        List<OrderResponse> content = ids.stream()
                .map(byId::get)
                .filter(Objects::nonNull)
                // Keep list endpoint unchanged: do not fetch payment per order here.
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return new PageImpl<>(content, pageable, idsPage.getTotalElements());
    }

    /**
     * Backward-compatible overload: no status filter.
     */
    public Page<OrderResponse> getOrders(User user, Pageable pageable) {
        return getOrders(user, null, pageable);
    }

    /**
     * Get aggregated order summary counts for the authenticated user.
     * Single DB round trip using conditional SUM.
     */
    public OrderSummaryResponse getOrderSummary(User user) {
        Object[] row;
        if (user.hasRole("MANUFACTURER")) {
            row = orderRepository.getOrderSummaryForManufacturer(user);
        } else {
            row = orderRepository.getOrderSummaryForRetailer(user);
        }

        // The query returns a single row: [total, active, delivered, cancelled]
        // When there are no orders, COUNT returns 0 but SUM returns null.
        Object[] cols = (row instanceof Object[] && row.length == 1 && row[0] instanceof Object[])
                ? (Object[]) row[0]
                : row;

        long total     = toLong(cols[0]);
        long active    = toLong(cols[1]);
        long delivered = toLong(cols[2]);
        long cancelled = toLong(cols[3]);

        return OrderSummaryResponse.builder()
                .total(total)
                .active(active)
                .delivered(delivered)
                .cancelled(cancelled)
                .build();
    }

    private static long toLong(Object value) {
        if (value == null) return 0L;
        return ((Number) value).longValue();
    }

    /**
     * Get single order by ID with authorization check.
     */
    public OrderResponse getOrderById(Long orderId, User user) {

        // Fetch order with required relations to avoid LazyInitializationException
        Order order = orderRepository.findByIdWithRelations(orderId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Order", "id", orderId));

        boolean isManufacturer =
                order.getManufacturer().getId().equals(user.getId());
        boolean isRetailer =
                order.getRetailer().getId().equals(user.getId());

        if (!isManufacturer && !isRetailer) {
            throw new AccessDeniedException("Order", orderId);
        }

        Payment payment = paymentRepository.findByOrderId(orderId).orElse(null);

        OrderResponse response = mapToResponse(order);
        response.setPayment(mapPayment(payment));
        return response;
    }

    private static OrderPaymentResponse mapPayment(Payment payment) {
        if (payment == null) {
            return null;
        }

        // Expose only non-sensitive fields.
        // paymentId: prefer gateway payment id if present; fallback to our internal paymentReference (safe) if needed.
        String paymentId = payment.getRazorpayPaymentId();
        if (paymentId == null || paymentId.isBlank()) {
            paymentId = payment.getPaymentReference();
        }

        return OrderPaymentResponse.builder()
                .paymentId(paymentId)
                .status(payment.getStatus())
                .gateway(payment.getGateway())
                .build();
    }

    /**
     * Map Order → OrderResponse DTO
     */
    private OrderResponse mapToResponse(Order order) {
        return OrderResponse.builder()
                .id(order.getId())
                .status(order.getStatus().name())
                .totalAmount(order.getTotalAmount())
                .createdAt(order.getCreatedAt())
                .retailerName(order.getRetailer().getName())
                .retailerEmail(order.getRetailer().getEmail())
                .manufacturerName(order.getManufacturer().getName())
                .manufacturerEmail(order.getManufacturer().getEmail())
                // delivery snapshot
                .deliveryName(order.getDeliveryName())
                .deliveryPhone(order.getDeliveryPhone())
                .deliveryAddressLine1(order.getDeliveryAddressLine1())
                .deliveryCity(order.getDeliveryCity())
                .deliveryState(order.getDeliveryState())
                .deliveryPincode(order.getDeliveryPincode())
                // shipment
                .shipmentCarrier(order.getShipmentCarrier())
                .shipmentTrackingNumber(order.getShipmentTrackingNumber())
                .shipmentTrackingUrl(order.getShipmentTrackingUrl())
                .shippedAt(order.getShippedAt())
                .deliveredAt(order.getDeliveredAt())
                .items(order.getItems().stream()
                        .map(this::mapItemToResponse)
                        .toList())
                .build();
    }

    private OrderItemResponse mapItemToResponse(OrderItem item) {
        BigDecimal subtotal =
                item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));

        return OrderItemResponse.builder()
                .productId(item.getProduct().getId())
                .productName(item.getProduct().getName())
                .quantity(item.getQuantity())
                .price(item.getPrice())
                .subtotal(subtotal)
                .build();
    }
}
