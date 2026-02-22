package com.quickcart.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Aggregated order counts for the summary/tabs UI.
 *
 * Grouping:
 *   total     = all orders
 *   active    = PAYMENT_PENDING + CONFIRMED + ACCEPTED + SHIPPED
 *   delivered = DELIVERED
 *   cancelled = CANCELLED + REJECTED
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderSummaryResponse {
    private long total;
    private long active;
    private long delivered;
    private long cancelled;
}
