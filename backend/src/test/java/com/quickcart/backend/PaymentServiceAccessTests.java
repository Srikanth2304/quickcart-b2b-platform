package com.quickcart.backend;

import com.quickcart.backend.entity.*;
import com.quickcart.backend.exception.OrderAccessDeniedException;
import com.quickcart.backend.repository.*;
import com.quickcart.backend.service.PaymentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class PaymentServiceAccessTests {

    @Autowired private PaymentService paymentService;

    @Autowired private RoleRepository roleRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private OrderRepository orderRepository;
    @Autowired private PaymentRepository paymentRepository;

    private Role ensureRole(String name) {
        return roleRepository.findByName(name)
                .orElseGet(() -> roleRepository.save(Role.builder().name(name).build()));
    }

    @Test
    @Transactional
    void getPaymentForOrder_deniesOtherUsers() {
        Role retailerRole = ensureRole("RETAILER");
        Role manufacturerRole = ensureRole("MANUFACTURER");

        User manufacturer = userRepository.save(User.builder()
                .name("M_pay_access")
                .email("m_pay_access@test.com")
                .password("pw")
                .roles(Set.of(manufacturerRole))
                .build());

        User retailer = userRepository.save(User.builder()
                .name("R_pay_access")
                .email("r_pay_access@test.com")
                .password("pw")
                .roles(Set.of(retailerRole))
                .build());

        User otherRetailer = userRepository.save(User.builder()
                .name("R_other_pay_access")
                .email("r_other_pay_access@test.com")
                .password("pw")
                .roles(Set.of(retailerRole))
                .build());

        Product p = productRepository.save(Product.builder()
                .name("P_pay_access")
                .price(new BigDecimal("9.00"))
                .stock(10)
                .status(ProductStatus.ACTIVE)
                .manufacturer(manufacturer)
                .build());

        Order order = orderRepository.save(Order.builder()
                .retailer(retailer)
                .manufacturer(manufacturer)
                .status(OrderStatus.CONFIRMED)
                .totalAmount(new BigDecimal("9.00"))
                .items(List.of(OrderItem.builder().product(p).quantity(1).price(p.getPrice()).build()))
                .build());
        order.getItems().getFirst().setOrder(order);
        orderRepository.save(order);

        Payment payment = paymentRepository.save(Payment.builder()
                .order(order)
                .retailer(retailer)
                .amount(order.getTotalAmount())
                .status(PaymentStatus.SUCCESS)
                .paymentReference("pay_access")
                .build());
        payment.setCreatedBy(retailer);
        payment.setUpdatedBy(retailer);

        // retailer and manufacturer should be allowed
        assertDoesNotThrow(() -> paymentService.getPaymentForOrder(order.getId(), retailer));
        assertDoesNotThrow(() -> paymentService.getPaymentForOrder(order.getId(), manufacturer));

        // other user should be denied
        assertThrows(OrderAccessDeniedException.class, () -> paymentService.getPaymentForOrder(order.getId(), otherRetailer));
    }
}

