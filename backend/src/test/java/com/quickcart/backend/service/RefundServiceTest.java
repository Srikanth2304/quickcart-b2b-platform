package com.quickcart.backend.service;

import com.quickcart.backend.entity.Order;
import com.quickcart.backend.entity.OrderStatus;
import com.quickcart.backend.entity.Refund;
import com.quickcart.backend.repository.InvoiceRepository;
import com.quickcart.backend.repository.PaymentRepository;
import com.quickcart.backend.repository.RefundRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

@ExtendWith(MockitoExtension.class)
class RefundServiceTest {

    @Mock
    private RefundRepository refundRepository;
    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private OrderAuditService orderAuditService;

    private RefundService refundService;

    @BeforeEach
    void setUp() {
        refundService = new RefundService(refundRepository, paymentRepository, invoiceRepository, orderAuditService);
    }

    @Test
    void syncOrderStatusMarksFullyRefunded() {
        Order order = Order.builder().id(1L).status(OrderStatus.RETURN_COMPLETED).totalAmount(BigDecimal.valueOf(100)).build();
        Refund refund = Refund.builder().order(order).refundAmount(BigDecimal.valueOf(100)).build();

        refundService.syncOrderStatusAfterRefundProcessed(refund);

        assertEquals(OrderStatus.REFUNDED, order.getStatus());
    }

    @Test
    void syncOrderStatusMarksPartiallyRefunded() {
        Order order = Order.builder().id(1L).status(OrderStatus.RETURN_COMPLETED).totalAmount(BigDecimal.valueOf(100)).build();
        Refund refund = Refund.builder().order(order).refundAmount(BigDecimal.valueOf(40)).build();

        refundService.syncOrderStatusAfterRefundProcessed(refund);

        assertEquals(OrderStatus.PARTIALLY_REFUNDED, order.getStatus());
    }
}
