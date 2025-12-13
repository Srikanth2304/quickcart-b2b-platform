package com.quickcart.backend.controller;

import com.quickcart.backend.dto.PlaceOrderRequest;
import com.quickcart.backend.security.CustomUserDetails;
import com.quickcart.backend.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    @PreAuthorize("hasRole('RETAILER')")
    public ResponseEntity<String> placeOrder(
            @Valid @RequestBody PlaceOrderRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        orderService.placeOrder(request, currentUser.getUser());
        return ResponseEntity.ok("Order placed successfully");
    }
}
