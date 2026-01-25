package com.quickcart.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class OrderCancelEndpointMappingTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void cancelOrder_endpointIsMapped_andNotHandledAsStaticResource() throws Exception {
        // If the controller mapping is missing, Spring often returns 404 via the static resource handler.
        // We just assert it's NOT 404; it will likely be 401 because we didn't authenticate.
        mockMvc.perform(post("/orders/{orderId}/cancel", 3L))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void cancelOrder_optionsPreflight_isAllowedToHitFramework() throws Exception {
        // If CORS preflight is blocked by routing, it might show up as 404 as well.
        mockMvc.perform(options("/orders/{orderId}/cancel", 3L))
                .andExpect(status().isOk());
    }
}

