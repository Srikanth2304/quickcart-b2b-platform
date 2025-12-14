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

    /**
     * Retailer places an order.
     */
    @Transactional
    public void placeOrder(PlaceOrderRequest request, User retailer) {

        if (!retailer.hasRole("RETAILER")) {
            throw new AccessDeniedException("Only retailers can place orders");
        }

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
                .build();

        // Link items to order
        orderItems.forEach(item -> item.setOrder(order));
        order.setItems(orderItems);

        orderRepository.save(order);
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
                order.getStatus() == OrderStatus.DELIVERED) {
            throw new AccessDeniedException("Order status cannot be updated");
        }

        order.setStatus(newStatus);
    }

}