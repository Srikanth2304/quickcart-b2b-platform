package com.quickcart.backend.controller;

import com.quickcart.backend.dto.ApiResponse;
import com.quickcart.backend.dto.PaymentWebhookRequest;
import com.quickcart.backend.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/webhooks")
@RequiredArgsConstructor
public class PaymentWebhookController {

    private final PaymentService paymentService;

    @PostMapping("/payment")
    public ResponseEntity<ApiResponse<Void>> processPaymentWebhook(@Valid @RequestBody PaymentWebhookRequest request) {
        paymentService.processPaymentWebhook(request);
        return ResponseEntity.ok(ApiResponse.success("Webhook processed"));
    }
}

