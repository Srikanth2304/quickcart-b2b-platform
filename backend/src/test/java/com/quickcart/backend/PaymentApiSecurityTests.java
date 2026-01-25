package com.quickcart.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class PaymentApiSecurityTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @WithAnonymousUser
    void getPaymentForOrder_requiresAuthentication() throws Exception {
        mockMvc.perform(get("/payments/order/{orderId}", 1L))
                .andExpect(status().isUnauthorized());
    }
}

