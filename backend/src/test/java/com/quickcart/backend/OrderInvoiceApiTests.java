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
class OrderInvoiceApiTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @WithAnonymousUser
    void getInvoiceForOrder_requiresAuthentication() throws Exception {
        // Any request without authentication should be rejected by Spring Security.
        mockMvc.perform(get("/orders/{orderId}/invoice", 1L))
                .andExpect(status().isUnauthorized());
    }
}
