package com.quickcart.backend.controller;

import com.quickcart.backend.payment.RazorpayWebhookSignatureVerifier;
import com.quickcart.backend.service.RazorpayWebhookService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RazorpayWebhookControllerTest {

    @Mock
    private RazorpayWebhookSignatureVerifier signatureVerifier;
    @Mock
    private RazorpayWebhookService webhookService;

    private RazorpayWebhookController controller;

    @BeforeEach
    void setUp() {
        controller = new RazorpayWebhookController(signatureVerifier, webhookService, new ObjectMapper());
    }

    @Test
    void rejectsWebhookWithoutSignature() {
        ResponseEntity<String> response = controller.handleWebhook("{}".getBytes(), null);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void rejectsWebhookWithInvalidSignature() {
        when(signatureVerifier.isValid(any(byte[].class), eq("bad-signature"))).thenReturn(false);

        ResponseEntity<String> response = controller.handleWebhook("{}".getBytes(), "bad-signature");
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }
}
