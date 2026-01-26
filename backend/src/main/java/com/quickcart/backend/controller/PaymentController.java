package com.quickcart.backend.controller;

import com.quickcart.backend.config.RazorpayProperties;
import com.quickcart.backend.dto.PaymentRequest;
import com.quickcart.backend.dto.PaymentResponse;
import com.quickcart.backend.dto.RazorpayCreateOrderResponse;
import com.quickcart.backend.dto.RazorpayKeyResponse;
import com.quickcart.backend.dto.RazorpayVerifyPaymentRequest;
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
    private final RazorpayProperties razorpayProperties;

    /**
     * Expose Razorpay public key id for frontend checkout.
     * Safe to expose (NOT the secret).
     */
    @GetMapping("/razorpay/key")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<RazorpayKeyResponse> getRazorpayKey() {
        return ResponseEntity.ok(RazorpayKeyResponse.builder()
                .keyId(razorpayProperties.getKeyId())
                .build());
    }

    /**
     * Legacy endpoint: now creates Razorpay order + Payment INITIATED.
     */
    @PostMapping
    @PreAuthorize("hasRole('RETAILER')")
    public ResponseEntity<String> makePayment(
            @Valid @RequestBody PaymentRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        paymentService.makePayment(request, currentUser.getUser());
        return ResponseEntity.status(HttpStatus.CREATED).body("Payment initiated");
    }

    /**
     * Create Razorpay order id (preferred endpoint).
     */
    @PostMapping("/razorpay/order")
    @PreAuthorize("hasRole('RETAILER')")
    public ResponseEntity<RazorpayCreateOrderResponse> createRazorpayOrder(
            @Valid @RequestBody PaymentRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(paymentService.createRazorpayOrder(request.getOrderId(), currentUser.getUser()));
    }

    /**
     * Verify checkout response.
     */
    @PostMapping("/razorpay/verify")
    @PreAuthorize("hasRole('RETAILER')")
    public ResponseEntity<String> verifyRazorpayPayment(
            @Valid @RequestBody RazorpayVerifyPaymentRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        paymentService.verifyRazorpayPayment(request, currentUser.getUser());
        return ResponseEntity.ok("Payment verified");
    }

    @GetMapping("/order/{orderId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PaymentResponse> getPaymentForOrder(
            @PathVariable Long orderId,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(paymentService.getPaymentForOrder(orderId, currentUser.getUser()));
    }
}
