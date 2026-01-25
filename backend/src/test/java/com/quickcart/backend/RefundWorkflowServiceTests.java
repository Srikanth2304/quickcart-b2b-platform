package com.quickcart.backend;

import com.quickcart.backend.entity.*;
import com.quickcart.backend.exception.AccessDeniedException;
import com.quickcart.backend.repository.*;
import com.quickcart.backend.service.OrderService;
import com.quickcart.backend.service.RefundProcessorService;
import com.quickcart.backend.service.RefundService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class RefundWorkflowServiceTests {

    @Autowired private OrderService orderService;
    @Autowired private RefundService refundService;
    @Autowired private RefundProcessorService refundProcessorService;

    @Autowired private RoleRepository roleRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private OrderRepository orderRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private RefundRepository refundRepository;

    private Role ensureRole(String name) {
        return roleRepository.findByName(name)
                .orElseGet(() -> roleRepository.save(Role.builder().name(name).build()));
    }

    @Test
    @Transactional
    void manufacturerRejectAfterPayment_initiatesRefund_processingNotImmediatelyProcessed_autoProcessedAfterFiveMinutes() {
        Role manufacturerRole = ensureRole("MANUFACTURER");
        Role retailerRole = ensureRole("RETAILER");

        User manufacturer = userRepository.save(User.builder()
                .name("M_rej_ref")
                .email("m_rej_ref@test.com")
                .password("pw")
                .roles(Set.of(manufacturerRole))
                .build());
        User retailer = userRepository.save(User.builder()
                .name("R_rej_ref")
                .email("r_rej_ref@test.com")
                .password("pw")
                .roles(Set.of(retailerRole))
                .build());

        Product p = productRepository.save(Product.builder()
                .name("P_rej_ref")
                .price(new BigDecimal("10.00"))
                .stock(10)
                .status(ProductStatus.ACTIVE)
                .manufacturer(manufacturer)
                .build());

        Order order = orderRepository.save(Order.builder()
                .retailer(retailer)
                .manufacturer(manufacturer)
                .status(OrderStatus.CONFIRMED)
                .totalAmount(new BigDecimal("10.00"))
                .items(List.of(OrderItem.builder().product(p).quantity(1).price(p.getPrice()).build()))
                .build());
        order.getItems().getFirst().setOrder(order);
        orderRepository.save(order);

        Payment payment = paymentRepository.save(Payment.builder()
                .order(order)
                .retailer(retailer)
                .amount(order.getTotalAmount())
                .status(PaymentStatus.SUCCESS)
                .paymentReference("pay_rej_ref")
                .build());
        payment.setCreatedBy(retailer);
        payment.setUpdatedBy(retailer);

        // enable processor for this test (default is disabled)
        org.springframework.test.util.ReflectionTestUtils.setField(refundProcessorService, "enabled", true);
        org.springframework.test.util.ReflectionTestUtils.setField(refundProcessorService, "autoCompleteAfterMinutes", 5);

        orderService.rejectOrder(order.getId(), "bad", manufacturer);

        Refund refund = refundRepository.findByOrderId(order.getId()).orElseThrow();
        assertEquals(RefundStatus.PROCESSING, refund.getStatus());

        // should NOT be processed immediately
        refundProcessorService.processRefunds();
        Refund stillProcessing = refundRepository.findByOrderId(order.getId()).orElseThrow();
        assertEquals(RefundStatus.PROCESSING, stillProcessing.getStatus());

        // move processing start into the past (>= 5 minutes) so it becomes eligible
        stillProcessing.setApprovedAt(java.time.LocalDateTime.now().minusMinutes(6));
        refundRepository.saveAndFlush(stillProcessing);

        refundProcessorService.processRefunds();

        Refund processedRefund = refundRepository.findByOrderId(order.getId()).orElseThrow();
        assertEquals(RefundStatus.PROCESSED, processedRefund.getStatus());
        assertNotNull(processedRefund.getProcessedAt());

        Payment processedPayment = paymentRepository.findById(payment.getId()).orElseThrow();
        assertEquals(PaymentStatus.REFUNDED, processedPayment.getStatus());
    }

    @Test
    @Transactional
    void retailerCancelAfterPayment_orderCancelled_refundPendingApproval_thenApprovedProcessing_notImmediatelyProcessed_autoProcessedAfterFiveMinutes() {
        Role manufacturerRole = ensureRole("MANUFACTURER");
        Role retailerRole = ensureRole("RETAILER");

        User manufacturer = userRepository.save(User.builder()
                .name("M_ret_can")
                .email("m_ret_can@test.com")
                .password("pw")
                .roles(Set.of(manufacturerRole))
                .build());
        User retailer = userRepository.save(User.builder()
                .name("R_ret_can")
                .email("r_ret_can@test.com")
                .password("pw")
                .roles(Set.of(retailerRole))
                .build());

        Product p = productRepository.save(Product.builder()
                .name("P_ret_can")
                .price(new BigDecimal("5.00"))
                .stock(10)
                .status(ProductStatus.ACTIVE)
                .manufacturer(manufacturer)
                .build());

        // simulate stock reduced by ordering 2
        p.setStockQuantity(8);
        productRepository.save(p);

        Order order = orderRepository.save(Order.builder()
                .retailer(retailer)
                .manufacturer(manufacturer)
                .status(OrderStatus.CONFIRMED)
                .totalAmount(new BigDecimal("10.00"))
                .items(List.of(OrderItem.builder().product(p).quantity(2).price(p.getPrice()).build()))
                .build());
        order.getItems().getFirst().setOrder(order);
        orderRepository.save(order);

        Payment payment = paymentRepository.save(Payment.builder()
                .order(order)
                .retailer(retailer)
                .amount(order.getTotalAmount())
                .status(PaymentStatus.SUCCESS)
                .paymentReference("pay_ret_can")
                .build());
        payment.setCreatedBy(retailer);
        payment.setUpdatedBy(retailer);

        // enable processor for this test (default is disabled)
        org.springframework.test.util.ReflectionTestUtils.setField(refundProcessorService, "enabled", true);
        org.springframework.test.util.ReflectionTestUtils.setField(refundProcessorService, "autoCompleteAfterMinutes", 5);

        orderService.cancelOrder(order.getId(), "need cancel", retailer);

        Order updated = orderRepository.findById(order.getId()).orElseThrow();
        assertEquals(OrderStatus.CANCELLED, updated.getStatus());

        Refund refund = refundRepository.findByOrderId(order.getId()).orElseThrow();
        assertEquals(RefundStatus.PENDING_APPROVAL, refund.getStatus());
        assertEquals(RefundInitiatedBy.RETAILER, refund.getInitiatedBy());

        // payment should NOT be refunded until manufacturer approves
        Payment reloadedPayment = paymentRepository.findById(payment.getId()).orElseThrow();
        assertEquals(PaymentStatus.SUCCESS, reloadedPayment.getStatus());

        // manufacturer approves -> moves to PROCESSING and payment to REFUND_PENDING
        refundService.approveRefund(order.getId(), manufacturer, "ok");

        Refund processingRefund = refundRepository.findByOrderId(order.getId()).orElseThrow();
        assertEquals(RefundStatus.PROCESSING, processingRefund.getStatus());

        Payment pendingPayment = paymentRepository.findById(payment.getId()).orElseThrow();
        assertEquals(PaymentStatus.REFUND_PENDING, pendingPayment.getStatus());

        // should NOT process immediately
        refundProcessorService.processRefunds();
        Refund stillProcessing = refundRepository.findByOrderId(order.getId()).orElseThrow();
        assertEquals(RefundStatus.PROCESSING, stillProcessing.getStatus());

        // make eligible
        stillProcessing.setApprovedAt(java.time.LocalDateTime.now().minusMinutes(6));
        refundRepository.saveAndFlush(stillProcessing);

        refundProcessorService.processRefunds();

        Refund processedRefund = refundRepository.findByOrderId(order.getId()).orElseThrow();
        assertEquals(RefundStatus.PROCESSED, processedRefund.getStatus());

        Payment processedPayment = paymentRepository.findById(payment.getId()).orElseThrow();
        assertEquals(PaymentStatus.REFUNDED, processedPayment.getStatus());

        // stock was restocked by cancellation
        assertEquals(10, productRepository.findById(p.getId()).orElseThrow().getStockQuantity());
    }

    @Test
    @Transactional
    void manufacturerCancelsAfterPayment_orderCancelled_refundProcessing_notImmediatelyProcessed_autoProcessedAfterFiveMinutes() {
        Role manufacturerRole = ensureRole("MANUFACTURER");
        Role retailerRole = ensureRole("RETAILER");

        User manufacturer = userRepository.save(User.builder()
                .name("M_man_can")
                .email("m_man_can@test.com")
                .password("pw")
                .roles(Set.of(manufacturerRole))
                .build());
        User retailer = userRepository.save(User.builder()
                .name("R_man_can")
                .email("r_man_can@test.com")
                .password("pw")
                .roles(Set.of(retailerRole))
                .build());

        Product p = productRepository.save(Product.builder()
                .name("P_man_can")
                .price(new BigDecimal("12.00"))
                .stock(10)
                .status(ProductStatus.ACTIVE)
                .manufacturer(manufacturer)
                .build());

        // simulate stock reduced by ordering 1
        p.setStockQuantity(9);
        productRepository.save(p);

        Order order = orderRepository.save(Order.builder()
                .retailer(retailer)
                .manufacturer(manufacturer)
                .status(OrderStatus.CONFIRMED)
                .totalAmount(new BigDecimal("12.00"))
                .items(List.of(OrderItem.builder().product(p).quantity(1).price(p.getPrice()).build()))
                .build());
        order.getItems().getFirst().setOrder(order);
        orderRepository.save(order);

        Payment payment = paymentRepository.save(Payment.builder()
                .order(order)
                .retailer(retailer)
                .amount(order.getTotalAmount())
                .status(PaymentStatus.SUCCESS)
                .paymentReference("pay_man_can")
                .build());
        payment.setCreatedBy(retailer);
        payment.setUpdatedBy(retailer);

        // enable processor for this test (default is disabled)
        org.springframework.test.util.ReflectionTestUtils.setField(refundProcessorService, "enabled", true);
        org.springframework.test.util.ReflectionTestUtils.setField(refundProcessorService, "autoCompleteAfterMinutes", 5);

        orderService.cancelOrder(order.getId(), "manufacturer cancelled", manufacturer);

        Order updated = orderRepository.findById(order.getId()).orElseThrow();
        assertEquals(OrderStatus.CANCELLED, updated.getStatus());

        Refund refund = refundRepository.findByOrderId(order.getId()).orElseThrow();
        assertEquals(RefundStatus.PROCESSING, refund.getStatus());
        assertEquals(RefundInitiatedBy.SYSTEM, refund.getInitiatedBy());

        Payment pendingPayment = paymentRepository.findById(payment.getId()).orElseThrow();
        assertEquals(PaymentStatus.REFUND_PENDING, pendingPayment.getStatus());

        // should not auto-complete immediately
        refundProcessorService.processRefunds();
        Refund stillProcessing = refundRepository.findByOrderId(order.getId()).orElseThrow();
        assertEquals(RefundStatus.PROCESSING, stillProcessing.getStatus());

        // make eligible and process
        stillProcessing.setApprovedAt(java.time.LocalDateTime.now().minusMinutes(6));
        refundRepository.saveAndFlush(stillProcessing);

        refundProcessorService.processRefunds();

        Refund processedRefund = refundRepository.findByOrderId(order.getId()).orElseThrow();
        assertEquals(RefundStatus.PROCESSED, processedRefund.getStatus());

        Payment processedPayment = paymentRepository.findById(payment.getId()).orElseThrow();
        assertEquals(PaymentStatus.REFUNDED, processedPayment.getStatus());

        // stock was restocked by cancellation
        assertEquals(10, productRepository.findById(p.getId()).orElseThrow().getStockQuantity());
    }

    @Test
    @Transactional
    void otherManufacturerCannotApproveRefund() {
        Role manufacturerRole = ensureRole("MANUFACTURER");
        Role retailerRole = ensureRole("RETAILER");

        User manufacturer = userRepository.save(User.builder()
                .name("M_own")
                .email("m_own@test.com")
                .password("pw")
                .roles(Set.of(manufacturerRole))
                .build());
        User otherManufacturer = userRepository.save(User.builder()
                .name("M_other")
                .email("m_other@test.com")
                .password("pw")
                .roles(Set.of(manufacturerRole))
                .build());
        User retailer = userRepository.save(User.builder()
                .name("R_own")
                .email("r_own@test.com")
                .password("pw")
                .roles(Set.of(retailerRole))
                .build());

        Product p = productRepository.save(Product.builder()
                .name("P_own")
                .price(new BigDecimal("8.00"))
                .stock(10)
                .status(ProductStatus.ACTIVE)
                .manufacturer(manufacturer)
                .build());

        Order order = orderRepository.save(Order.builder()
                .retailer(retailer)
                .manufacturer(manufacturer)
                .status(OrderStatus.CANCELLED)
                .totalAmount(new BigDecimal("8.00"))
                .items(List.of(OrderItem.builder().product(p).quantity(1).price(p.getPrice()).build()))
                .build());
        order.getItems().getFirst().setOrder(order);
        orderRepository.save(order);

        Payment payment = paymentRepository.save(Payment.builder()
                .order(order)
                .retailer(retailer)
                .amount(order.getTotalAmount())
                .status(PaymentStatus.SUCCESS)
                .paymentReference("pay_own")
                .build());
        payment.setCreatedBy(retailer);
        payment.setUpdatedBy(retailer);

        Refund refund = refundRepository.save(Refund.builder()
                .order(order)
                .payment(payment)
                .initiatedBy(RefundInitiatedBy.RETAILER)
                .status(RefundStatus.PENDING_APPROVAL)
                .build());
        refund.setCreatedBy(retailer);
        refund.setUpdatedBy(retailer);

        assertThrows(AccessDeniedException.class,
                () -> refundService.approveRefund(order.getId(), otherManufacturer, "no"));
    }
}
