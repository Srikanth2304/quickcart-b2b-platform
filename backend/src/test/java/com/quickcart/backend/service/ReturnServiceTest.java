package com.quickcart.backend.service;

import com.quickcart.backend.dto.CreateReturnRequest;
import com.quickcart.backend.entity.*;
import com.quickcart.backend.exception.InvalidReturnStateException;
import com.quickcart.backend.repository.OrderItemRepository;
import com.quickcart.backend.repository.OrderRepository;
import com.quickcart.backend.repository.RefundRepository;
import com.quickcart.backend.repository.ReturnRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReturnServiceTest {

    @Mock
    private ReturnRequestRepository returnRequestRepository;
    @Mock
    private OrderRepository orderRepository;
    @Mock
    private OrderItemRepository orderItemRepository;
    @Mock
    private InventoryService inventoryService;
    @Mock
    private PaymentService paymentService;
    @Mock
    private RefundRepository refundRepository;
    @Mock
    private OrderAuditService orderAuditService;

    private ReturnService returnService;

    @BeforeEach
    void setUp() {
        returnService = new ReturnService(
                returnRequestRepository,
                orderRepository,
                orderItemRepository,
                inventoryService,
                paymentService,
                refundRepository,
                orderAuditService
        );
    }

    @Test
    void requestReturnFailsWhenOrderNotDelivered() {
        User retailer = user(1L, "RETAILER");
        Order order = order(10L, OrderStatus.SHIPPED, retailer, user(2L, "MANUFACTURER"));

        CreateReturnRequest request = new CreateReturnRequest();
        request.setOrderId(10L);
        request.setOrderItemId(100L);
        request.setQuantity(1);

        when(orderRepository.findByIdWithRelations(10L)).thenReturn(Optional.of(order));

        assertThrows(InvalidReturnStateException.class, () -> returnService.requestReturn(request, retailer));
    }

    @Test
    void completeReturnRestoresStockAndTriggersRefund() {
        User manufacturer = user(2L, "MANUFACTURER");
        User retailer = user(1L, "RETAILER");
        Order order = order(10L, OrderStatus.DELIVERED, retailer, manufacturer);

        OrderItem item = OrderItem.builder()
                .id(100L)
                .order(order)
                .product(Product.builder().id(50L).name("P").price(BigDecimal.TEN).stock(1).sku("SKU").status(ProductStatus.ACTIVE).build())
                .quantity(2)
                .price(BigDecimal.TEN)
                .build();

        ReturnRequest rr = ReturnRequest.builder()
                .id(500L)
                .order(order)
                .orderItem(item)
                .quantity(1)
                .returnStatus(ReturnStatus.INSPECTED)
                .inspectionStatus(ReturnInspectionStatus.PASSED)
                .receivedAt(LocalDateTime.now())
                .refundStatus(ReturnRefundStatus.PENDING)
                .build();

        Payment payment = Payment.builder().id(900L).order(order).retailer(retailer).status(PaymentStatus.SUCCESS).gateway(PaymentGateway.RAZORPAY).amount(BigDecimal.TEN).build();

        when(returnRequestRepository.findById(500L)).thenReturn(Optional.of(rr));
        when(paymentService.refundPayment(order, "Return completed id=500")).thenReturn(payment);
        when(refundRepository.findByOrderId(10L)).thenReturn(Optional.empty());
        when(refundRepository.save(any(Refund.class))).thenAnswer(i -> i.getArgument(0));

        returnService.completeReturn(500L, manufacturer);

        verify(inventoryService).restockForReturn(item, 1);
        verify(paymentService).refundPayment(order, "Return completed id=500");
    }

    private User user(Long id, String roleName) {
        return User.builder()
                .id(id)
                .roles(Set.of(Role.builder().name(roleName).build()))
                .build();
    }

    private Order order(Long id, OrderStatus status, User retailer, User manufacturer) {
        return Order.builder()
                .id(id)
                .status(status)
                .retailer(retailer)
                .manufacturer(manufacturer)
                .paymentMethod(PaymentMethod.ONLINE)
                .totalAmount(BigDecimal.TEN)
                .build();
    }
}
