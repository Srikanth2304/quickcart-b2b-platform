package com.quickcart.backend.service;

import com.quickcart.backend.dto.OrderItemResponse;
import com.quickcart.backend.dto.OrderResponse;
import com.quickcart.backend.entity.Order;
import com.quickcart.backend.entity.OrderItem;
import com.quickcart.backend.entity.User;
import com.quickcart.backend.exception.AccessDeniedException;
import com.quickcart.backend.exception.ResourceNotFoundException;
import com.quickcart.backend.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class OrderQueryService {

    private final OrderRepository orderRepository;

    /**
     * Get paginated orders for authenticated user.
     * Manufacturer → orders received
     * Retailer → orders placed
     */
    public Page<OrderResponse> getOrders(User user, Pageable pageable) {

        Page<Order> ordersPage;

        if (user.hasRole("MANUFACTURER")) {
            ordersPage = orderRepository.findByManufacturer(user, pageable);
        } else {
            ordersPage = orderRepository.findByRetailer(user, pageable);
        }

        return ordersPage.map(this::mapToResponse);
    }

    /**
     * Get single order by ID with authorization check.
     */
    public OrderResponse getOrderById(Long orderId, User user) {

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Order", "id", orderId));

        boolean isManufacturer =
                order.getManufacturer().getId().equals(user.getId());
        boolean isRetailer =
                order.getRetailer().getId().equals(user.getId());

        if (!isManufacturer && !isRetailer) {
            throw new AccessDeniedException("Order", orderId);
        }

        return mapToResponse(order);
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
