package com.quickcart.backend.service;

import com.quickcart.backend.entity.*;
import com.quickcart.backend.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduled job that auto-expires unpaid orders.
 *
 * Finds orders in PAYMENT_PENDING status older than a configurable threshold
 * and cancels them automatically, restocking inventory.
 *
 * No refund logic is needed since payment never happened.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderExpiryService {

    private final OrderRepository orderRepository;
    private final OrderAuditService orderAuditService;

    @Value("${app.orders.expiry.enabled:true}")
    private boolean enabled;

    /**
     * Number of minutes after which a PAYMENT_PENDING order is considered expired.
     */
    @Value("${app.orders.expiry.unpaidTimeoutMinutes:30}")
    private int unpaidTimeoutMinutes;

    /**
     * Runs every 5 minutes to check for expired unpaid orders.
     */
    @Scheduled(fixedDelayString = "${app.orders.expiry.fixedDelayMs:300000}")
    @Transactional
    public void expireUnpaidOrders() {
        if (!enabled) {
            return;
        }

        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(unpaidTimeoutMinutes);

        List<Order> expiredOrders = orderRepository.findExpiredPaymentPendingOrders(cutoff);

        if (expiredOrders.isEmpty()) {
            return;
        }

        log.info("Found {} expired PAYMENT_PENDING orders (older than {} minutes)", expiredOrders.size(), unpaidTimeoutMinutes);

        for (Order order : expiredOrders) {
            try {
                expireOrder(order);
            } catch (Exception ex) {
                log.error("Failed to expire order {}: {}", order.getId(), ex.getMessage(), ex);
            }
        }
    }

    private void expireOrder(Order order) {
        // Restock inventory
        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                Product product = item.getProduct();
                if (product == null) continue;
                int qty = item.getQuantity() == null ? 0 : item.getQuantity();
                product.setStockQuantity(product.getStockQuantity() + qty);
            }
        }

        OrderStatus from = order.getStatus();
        order.setStatus(OrderStatus.CANCELLED);

        orderAuditService.recordEvent(
                order,
                OrderEventType.ORDER_EXPIRED,
                from,
                OrderStatus.CANCELLED,
                null,
                "Order auto-expired: payment not received within " + unpaidTimeoutMinutes + " minutes"
        );

        log.info("Order {} auto-expired (was {} since {})", order.getId(), from, order.getCreatedAt());
    }
}
