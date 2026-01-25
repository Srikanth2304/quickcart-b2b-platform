package com.quickcart.backend;

import com.quickcart.backend.entity.*;
import com.quickcart.backend.exception.AccessDeniedException;
import com.quickcart.backend.repository.OrderRepository;
import com.quickcart.backend.repository.ProductRepository;
import com.quickcart.backend.repository.RoleRepository;
import com.quickcart.backend.repository.UserRepository;
import com.quickcart.backend.service.OrderService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class OrderCancellationServiceTests {

    @Autowired
    private OrderService orderService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    private Role ensureRole(String name) {
        return roleRepository.findByName(name)
                .orElseGet(() -> roleRepository.save(Role.builder().name(name).build()));
    }

    @Test
    @Transactional
    void retailer_canCancelCreatedOrder_andStockIsRestocked() {
        Role manufacturerRole = ensureRole("MANUFACTURER");
        Role retailerRole = ensureRole("RETAILER");

        User manufacturer = userRepository.save(User.builder()
                .name("M")
                .email("m_cancel1@test.com")
                .password("pw")
                .roles(Set.of(manufacturerRole))
                .build());
        User retailer = userRepository.save(User.builder()
                .name("R")
                .email("r_cancel1@test.com")
                .password("pw")
                .roles(Set.of(retailerRole))
                .build());

        Product p = productRepository.save(Product.builder()
                .name("P")
                .price(new BigDecimal("10.00"))
                .stock(10)
                .status(ProductStatus.ACTIVE)
                .manufacturer(manufacturer)
                .build());

        // Create order with one item and reduce stock to simulate placeOrder behavior
        p.setStockQuantity(7);
        productRepository.save(p);

        Order order = orderRepository.save(Order.builder()
                .retailer(retailer)
                .manufacturer(manufacturer)
                .status(OrderStatus.CREATED)
                .totalAmount(new BigDecimal("30.00"))
                .items(List.of(OrderItem.builder().order(null).product(p).quantity(3).price(p.getPrice()).build()))
                .build());
        // link item back
        order.getItems().getFirst().setOrder(order);
        orderRepository.save(order);

        orderService.cancelOrder(order.getId(), "Changed mind", retailer);

        Order updated = orderRepository.findByIdWithRelations(order.getId()).orElseThrow();
        assertEquals(OrderStatus.CANCELLED, updated.getStatus());

        Product reloaded = productRepository.findById(p.getId()).orElseThrow();
        assertEquals(10, reloaded.getStockQuantity());
    }

    @Test
    @Transactional
    void manufacturer_canCancelConfirmedOrder() {
        Role manufacturerRole = ensureRole("MANUFACTURER");
        Role retailerRole = ensureRole("RETAILER");

        User manufacturer = userRepository.save(User.builder()
                .name("M2")
                .email("m_cancel2@test.com")
                .password("pw")
                .roles(Set.of(manufacturerRole))
                .build());
        User retailer = userRepository.save(User.builder()
                .name("R2")
                .email("r_cancel2@test.com")
                .password("pw")
                .roles(Set.of(retailerRole))
                .build());

        Product p = productRepository.save(Product.builder()
                .name("P2")
                .price(new BigDecimal("5.00"))
                .stock(10)
                .status(ProductStatus.ACTIVE)
                .manufacturer(manufacturer)
                .build());

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

        orderService.cancelOrder(order.getId(), "Out of stock", manufacturer);

        Order updated = orderRepository.findByIdWithRelations(order.getId()).orElseThrow();
        assertEquals(OrderStatus.CANCELLED, updated.getStatus());
        assertEquals(10, productRepository.findById(p.getId()).orElseThrow().getStockQuantity());
    }

    @Test
    @Transactional
    void cannotCancelShippedOrDelivered() {
        Role manufacturerRole = ensureRole("MANUFACTURER");
        Role retailerRole = ensureRole("RETAILER");

        User manufacturer = userRepository.save(User.builder()
                .name("M3")
                .email("m_cancel3@test.com")
                .password("pw")
                .roles(Set.of(manufacturerRole))
                .build());
        User retailer = userRepository.save(User.builder()
                .name("R3")
                .email("r_cancel3@test.com")
                .password("pw")
                .roles(Set.of(retailerRole))
                .build());

        Product p = productRepository.save(Product.builder()
                .name("P3")
                .price(new BigDecimal("1.00"))
                .stock(10)
                .status(ProductStatus.ACTIVE)
                .manufacturer(manufacturer)
                .build());

        Order shipped = orderRepository.save(Order.builder()
                .retailer(retailer)
                .manufacturer(manufacturer)
                .status(OrderStatus.SHIPPED)
                .totalAmount(new BigDecimal("1.00"))
                .items(List.of(OrderItem.builder().product(p).quantity(1).price(p.getPrice()).build()))
                .build());
        shipped.getItems().getFirst().setOrder(shipped);
        orderRepository.save(shipped);

        assertThrows(AccessDeniedException.class,
                () -> orderService.cancelOrder(shipped.getId(), "too late", retailer));

        Order delivered = orderRepository.save(Order.builder()
                .retailer(retailer)
                .manufacturer(manufacturer)
                .status(OrderStatus.DELIVERED)
                .totalAmount(new BigDecimal("1.00"))
                .items(List.of(OrderItem.builder().product(p).quantity(1).price(p.getPrice()).build()))
                .build());
        delivered.getItems().getFirst().setOrder(delivered);
        orderRepository.save(delivered);

        assertThrows(AccessDeniedException.class,
                () -> orderService.cancelOrder(delivered.getId(), "too late", manufacturer));
    }

    @Test
    @Transactional
    void retailer_canCancelConfirmedOrder_preShipping_andStockIsRestocked() {
        Role manufacturerRole = ensureRole("MANUFACTURER");
        Role retailerRole = ensureRole("RETAILER");

        User manufacturer = userRepository.save(User.builder()
                .name("M4")
                .email("m_cancel4@test.com")
                .password("pw")
                .roles(Set.of(manufacturerRole))
                .build());
        User retailer = userRepository.save(User.builder()
                .name("R4")
                .email("r_cancel4@test.com")
                .password("pw")
                .roles(Set.of(retailerRole))
                .build());

        Product p = productRepository.save(Product.builder()
                .name("P4")
                .price(new BigDecimal("2.50"))
                .stock(10)
                .status(ProductStatus.ACTIVE)
                .manufacturer(manufacturer)
                .build());

        // simulate stock reduced by ordering 4
        p.setStockQuantity(6);
        productRepository.save(p);

        Order order = orderRepository.save(Order.builder()
                .retailer(retailer)
                .manufacturer(manufacturer)
                .status(OrderStatus.CONFIRMED)
                .totalAmount(new BigDecimal("10.00"))
                .items(List.of(OrderItem.builder().product(p).quantity(4).price(p.getPrice()).build()))
                .build());
        order.getItems().getFirst().setOrder(order);
        orderRepository.save(order);

        orderService.cancelOrder(order.getId(), "Need to cancel after payment", retailer);

        Order updated = orderRepository.findByIdWithRelations(order.getId()).orElseThrow();
        assertEquals(OrderStatus.CANCELLED, updated.getStatus());
        assertEquals(10, productRepository.findById(p.getId()).orElseThrow().getStockQuantity());
    }

    @Test
    @Transactional
    void retailer_canCancelAcceptedOrder_preShipping() {
        Role manufacturerRole = ensureRole("MANUFACTURER");
        Role retailerRole = ensureRole("RETAILER");

        User manufacturer = userRepository.save(User.builder()
                .name("M5")
                .email("m_cancel5@test.com")
                .password("pw")
                .roles(Set.of(manufacturerRole))
                .build());
        User retailer = userRepository.save(User.builder()
                .name("R5")
                .email("r_cancel5@test.com")
                .password("pw")
                .roles(Set.of(retailerRole))
                .build());

        Product p = productRepository.save(Product.builder()
                .name("P5")
                .price(new BigDecimal("3.00"))
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
                .status(OrderStatus.ACCEPTED)
                .totalAmount(new BigDecimal("6.00"))
                .items(List.of(OrderItem.builder().product(p).quantity(2).price(p.getPrice()).build()))
                .build());
        order.getItems().getFirst().setOrder(order);
        orderRepository.save(order);

        orderService.cancelOrder(order.getId(), "Cancel after acceptance", retailer);

        Order updated = orderRepository.findByIdWithRelations(order.getId()).orElseThrow();
        assertEquals(OrderStatus.CANCELLED, updated.getStatus());
        assertEquals(10, productRepository.findById(p.getId()).orElseThrow().getStockQuantity());
    }

    @Test
    @Transactional
    void nonOwnerCannotCancelEvenIfHasRole() {
        Role manufacturerRole = ensureRole("MANUFACTURER");
        Role retailerRole = ensureRole("RETAILER");

        User manufacturer = userRepository.save(User.builder()
                .name("M6")
                .email("m_cancel6@test.com")
                .password("pw")
                .roles(Set.of(manufacturerRole))
                .build());
        User retailer = userRepository.save(User.builder()
                .name("R6")
                .email("r_cancel6@test.com")
                .password("pw")
                .roles(Set.of(retailerRole))
                .build());
        User otherRetailer = userRepository.save(User.builder()
                .name("R6_other")
                .email("r_cancel6_other@test.com")
                .password("pw")
                .roles(Set.of(retailerRole))
                .build());

        Product p = productRepository.save(Product.builder()
                .name("P6")
                .price(new BigDecimal("1.00"))
                .stock(10)
                .status(ProductStatus.ACTIVE)
                .manufacturer(manufacturer)
                .build());

        Order order = orderRepository.save(Order.builder()
                .retailer(retailer)
                .manufacturer(manufacturer)
                .status(OrderStatus.CREATED)
                .totalAmount(new BigDecimal("1.00"))
                .items(List.of(OrderItem.builder().product(p).quantity(1).price(p.getPrice()).build()))
                .build());
        order.getItems().getFirst().setOrder(order);
        orderRepository.save(order);

        assertThrows(AccessDeniedException.class,
                () -> orderService.cancelOrder(order.getId(), "not my order", otherRetailer));
    }
}
