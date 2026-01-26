package com.quickcart.backend;

import com.quickcart.backend.dto.OrderItemRequest;
import com.quickcart.backend.dto.PlaceOrderRequest;
import com.quickcart.backend.dto.UpdateAddressRequest;
import com.quickcart.backend.entity.*;
import com.quickcart.backend.exception.ResourceNotFoundException;
import com.quickcart.backend.repository.*;
import com.quickcart.backend.service.AddressService;
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
class OrderDeliveryAddressSnapshotTests {

    @Autowired private OrderService orderService;
    @Autowired private AddressService addressService;

    @Autowired private RoleRepository roleRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private OrderRepository orderRepository;
    @Autowired private AddressRepository addressRepository;

    private Role ensureRole(String name) {
        return roleRepository.findByName(name)
                .orElseGet(() -> roleRepository.save(Role.builder().name(name).build()));
    }

    private Product createProduct(User manufacturer) {
        return productRepository.save(Product.builder()
                .name("P_" + System.nanoTime())
                .price(new BigDecimal("9.00"))
                .stock(10)
                .status(ProductStatus.ACTIVE)
                .manufacturer(manufacturer)
                .build());
    }

    private PlaceOrderRequest makeOrderReq(Long productId, Long addressId) {
        PlaceOrderRequest req = new PlaceOrderRequest();
        OrderItemRequest item = new OrderItemRequest();
        item.setProductId(productId);
        item.setQuantity(1);
        req.setItems(List.of(item));
        req.setDeliveryAddressId(addressId);
        return req;
    }

    @Test
    @Transactional
    void placeOrder_copiesDeliveryAddressSnapshot() {
        Role retailerRole = ensureRole("RETAILER");
        Role manufacturerRole = ensureRole("MANUFACTURER");

        User manufacturer = userRepository.save(User.builder()
                .name("M_addr_snapshot")
                .email("m_addr_snapshot@test.com")
                .password("pw")
                .roles(Set.of(manufacturerRole))
                .build());

        User retailer = userRepository.save(User.builder()
                .name("R_addr_snapshot")
                .email("r_addr_snapshot@test.com")
                .password("pw")
                .roles(Set.of(retailerRole))
                .build());

        Address address = Address.builder()
                .user(retailer)
                .name("Ramesh Traders")
                .phone("9876543210")
                .alternatePhone("9000000000")
                .addressType(AddressType.HOME)
                .locality("Locality")
                .landmark("Landmark")
                .addressLine1("MG Road")
                .city("Bangalore")
                .state("Karnataka")
                .pincode("560001")
                .isDefault(true)
                .isActive(true)
                .build();
        address.setCreatedBy(retailer);
        address.setUpdatedBy(retailer);
        address = addressRepository.save(address);

        Product p = createProduct(manufacturer);

        orderService.placeOrder(makeOrderReq(p.getId(), address.getId()), retailer);

        Order saved = orderRepository.findAll().stream()
                .filter(o -> o.getRetailer().getId().equals(retailer.getId()))
                .findFirst()
                .orElseThrow();

        assertEquals("Ramesh Traders", saved.getDeliveryName());
        assertEquals("9876543210", saved.getDeliveryPhone());
        assertEquals("MG Road", saved.getDeliveryAddressLine1());
        assertEquals("Bangalore", saved.getDeliveryCity());
        assertEquals("Karnataka", saved.getDeliveryState());
        assertEquals("560001", saved.getDeliveryPincode());

        // mutate address to ensure order snapshot doesn't change
        address.setCity("Mysore");
        addressRepository.save(address);

        Order reloaded = orderRepository.findById(saved.getId()).orElseThrow();
        assertEquals("Bangalore", reloaded.getDeliveryCity());
    }

    @Test
    @Transactional
    void placeOrder_rejectsOtherUsersAddress() {
        Role retailerRole = ensureRole("RETAILER");
        Role manufacturerRole = ensureRole("MANUFACTURER");

        User manufacturer = userRepository.save(User.builder()
                .name("M_addr_denied")
                .email("m_addr_denied@test.com")
                .password("pw")
                .roles(Set.of(manufacturerRole))
                .build());

        User retailer = userRepository.save(User.builder()
                .name("R_addr_denied")
                .email("r_addr_denied@test.com")
                .password("pw")
                .roles(Set.of(retailerRole))
                .build());

        User otherRetailer = userRepository.save(User.builder()
                .name("R_other_addr_denied")
                .email("r_other_addr_denied@test.com")
                .password("pw")
                .roles(Set.of(retailerRole))
                .build());

        Address address = Address.builder()
                .user(otherRetailer)
                .name("Other")
                .addressLine1("X")
                .city("C")
                .state("S")
                .pincode("111111")
                .isDefault(false)
                .isActive(true)
                .build();
        address.setCreatedBy(otherRetailer);
        address.setUpdatedBy(otherRetailer);
        address = addressRepository.save(address);

        Product p = createProduct(manufacturer);

        assertThrows(ResourceNotFoundException.class,
                () -> orderService.placeOrder(makeOrderReq(p.getId(), address.getId()), retailer));
    }

    @Test
    @Transactional
    void updateAddress_updatesAuditAndFields() {
        Role retailerRole = ensureRole("RETAILER");
        User retailer = userRepository.save(User.builder()
                .name("R_addr_update")
                .email("r_addr_update@test.com")
                .password("pw")
                .roles(Set.of(retailerRole))
                .build());

        Address address = Address.builder()
                .user(retailer)
                .name("Old")
                .phone("111")
                .alternatePhone("222")
                .addressType(AddressType.OTHER)
                .city("OldCity")
                .state("S")
                .pincode("123456")
                .isDefault(false)
                .isActive(true)
                .build();
        address.setCreatedBy(retailer);
        address.setUpdatedBy(retailer);
        address = addressRepository.save(address);

        UpdateAddressRequest req = new UpdateAddressRequest();
        req.setName("New");
        req.setCity("NewCity");
        req.setAddressType("OFFICE");
        req.setAlternatePhone("333");
        req.setIsDefault(true);

        addressService.updateAddress(address.getId(), req, retailer);

        Address updated = addressRepository.findById(address.getId()).orElseThrow();
        assertEquals("New", updated.getName());
        assertEquals("NewCity", updated.getCity());
        assertEquals(AddressType.OFFICE, updated.getAddressType());
        assertEquals("333", updated.getAlternatePhone());
        assertTrue(Boolean.TRUE.equals(updated.getIsDefault()));
        assertEquals(retailer.getId(), updated.getUpdatedBy().getId());
        assertNotNull(updated.getUpdatedAt());
    }

    @Test
    @Transactional
    void softDeletedAddress_isNotListable_andCannotBeUsedForOrder() {
        Role retailerRole = ensureRole("RETAILER");
        Role manufacturerRole = ensureRole("MANUFACTURER");

        User manufacturer = userRepository.save(User.builder()
                .name("M_addr_soft")
                .email("m_addr_soft@test.com")
                .password("pw")
                .roles(Set.of(manufacturerRole))
                .build());

        User retailer = userRepository.save(User.builder()
                .name("R_addr_soft")
                .email("r_addr_soft@test.com")
                .password("pw")
                .roles(Set.of(retailerRole))
                .build());

        Address address = Address.builder()
                .user(retailer)
                .name("ToDelete")
                .addressLine1("A")
                .city("C")
                .state("S")
                .pincode("123456")
                .isDefault(true)
                .isActive(true)
                .build();
        address.setCreatedBy(retailer);
        address.setUpdatedBy(retailer);
        address = addressRepository.save(address);

        addressService.softDeleteAddress(address.getId(), retailer);

        // should not show up in active list
        assertTrue(addressRepository.findByUserAndIsActiveTrueOrderByIdDesc(retailer).isEmpty());

        // cannot be used for ordering
        Product p = createProduct(manufacturer);
        assertThrows(ResourceNotFoundException.class,
                () -> orderService.placeOrder(makeOrderReq(p.getId(), address.getId()), retailer));

        Address stored = addressRepository.findById(address.getId()).orElseThrow();
        assertFalse(Boolean.TRUE.equals(stored.getIsActive()));
        assertNotNull(stored.getDeletedAt());
        assertFalse(Boolean.TRUE.equals(stored.getIsDefault()));
    }

    @Test
    @Transactional
    void createAddress_firstAddressDefaultsToTrue_whenIsDefaultOmitted() {
        Role retailerRole = ensureRole("RETAILER");
        User retailer = userRepository.save(User.builder()
                .name("R_first_default")
                .email("r_first_default@test.com")
                .password("pw")
                .roles(Set.of(retailerRole))
                .build());

        // First address: do NOT set isDefault in request (null)
        com.quickcart.backend.dto.CreateAddressRequest req1 = new com.quickcart.backend.dto.CreateAddressRequest();
        req1.setName("First");
        req1.setPhone("9999999999");
        req1.setAddressLine1("Line1");
        req1.setCity("City");
        req1.setState("State");
        req1.setPincode("560001");

        var a1 = addressService.createAddress(req1, retailer);
        assertTrue(Boolean.TRUE.equals(a1.getIsDefault()));

        // Second address: also omit isDefault -> should NOT become default automatically
        com.quickcart.backend.dto.CreateAddressRequest req2 = new com.quickcart.backend.dto.CreateAddressRequest();
        req2.setName("Second");
        req2.setPhone("8888888888");
        req2.setAddressLine1("Line2");
        req2.setCity("City");
        req2.setState("State");
        req2.setPincode("560002");

        var a2 = addressService.createAddress(req2, retailer);
        assertFalse(Boolean.TRUE.equals(a2.getIsDefault()));

        // Only one default should exist
        var defaults = addressRepository.findByUserAndIsDefaultTrueAndIsActiveTrue(retailer);
        assertEquals(1, defaults.size());
        assertEquals(a1.getId(), defaults.get(0).getId());
    }
}