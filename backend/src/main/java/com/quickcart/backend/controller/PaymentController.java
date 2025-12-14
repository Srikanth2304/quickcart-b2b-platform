package com.quickcart.backend.controller;

import com.quickcart.backend.dto.PaymentRequest;
import com.quickcart.backend.security.CustomUserDetails;
import com.quickcart.backend.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping
    @PreAuthorize("hasRole('RETAILER')")
    public ResponseEntity<String> makePayment(
            @Valid @RequestBody PaymentRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        paymentService.makePayment(request, currentUser.getUser());
        return ResponseEntity.status(HttpStatus.CREATED).body("Payment successful");
    }
}
