package com.quickcart.backend.controller;

import com.quickcart.backend.dto.OrderResponse;
import com.quickcart.backend.dto.PlaceOrderRequest;
import com.quickcart.backend.dto.UpdateOrderStatusRequest;
import com.quickcart.backend.security.CustomUserDetails;
import com.quickcart.backend.service.OrderQueryService;
import com.quickcart.backend.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final OrderQueryService orderQueryService;

    @PostMapping
    @PreAuthorize("hasRole('RETAILER')")
    public ResponseEntity<String> placeOrder(
            @Valid @RequestBody PlaceOrderRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        orderService.placeOrder(request, currentUser.getUser());
        return ResponseEntity.ok("Order placed successfully");
    }

    @GetMapping
    public ResponseEntity<List<OrderResponse>> getOrders(
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(
                orderQueryService.getOrders(currentUser.getUser())
        );
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<OrderResponse> getOrderById(
            @PathVariable Long orderId,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(
                orderQueryService.getOrderById(orderId, currentUser.getUser())
        );
    }

    @PutMapping("/{orderId}/status")
    @PreAuthorize("hasRole('MANUFACTURER')")
    public ResponseEntity<String> updateOrderStatus(
            @PathVariable Long orderId,
            @Valid @RequestBody UpdateOrderStatusRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        orderService.updateOrderStatus(
                orderId,
                request.getStatus(),
                currentUser.getUser()
        );
        return ResponseEntity.ok("Order status updated successfully");
    }

}
