package com.quickcart.backend;

import com.quickcart.backend.entity.Address;
import com.quickcart.backend.entity.AddressType;
import com.quickcart.backend.entity.Role;
import com.quickcart.backend.entity.User;
import com.quickcart.backend.repository.AddressRepository;
import com.quickcart.backend.repository.RoleRepository;
import com.quickcart.backend.repository.UserRepository;
import com.quickcart.backend.service.AddressService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class AddressDefaultConstraintTests {

    @Autowired private AddressService addressService;
    @Autowired private AddressRepository addressRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private UserRepository userRepository;

    private Role ensureRole(String name) {
        return roleRepository.findByName(name)
                .orElseGet(() -> roleRepository.save(Role.builder().name(name).build()));
    }

    @Test
    @Transactional
    void setDefault_unsetsPreviousDefaultWithoutViolatingUniqueIndex() {
        Role retailerRole = ensureRole("RETAILER");

        User retailer = userRepository.save(User.builder()
                .name("R_default_switch")
                .email("r_default_switch@test.com")
                .password("pw")
                .roles(Set.of(retailerRole))
                .build());

        Address a1 = Address.builder()
                .user(retailer)
                .name("A1")
                .addressType(AddressType.HOME)
                .addressLine1("L1")
                .city("C")
                .state("S")
                .pincode("111111")
                .isDefault(true)
                .isActive(true)
                .build();
        a1.setCreatedBy(retailer);
        a1.setUpdatedBy(retailer);
        Long a1Id = addressRepository.save(a1).getId();

        Address a2 = Address.builder()
                .user(retailer)
                .name("A2")
                .addressType(AddressType.OFFICE)
                .addressLine1("L2")
                .city("C")
                .state("S")
                .pincode("222222")
                .isDefault(false)
                .isActive(true)
                .build();
        a2.setCreatedBy(retailer);
        a2.setUpdatedBy(retailer);
        Long a2Id = addressRepository.save(a2).getId();

        assertEquals(1, addressRepository.findByUserAndIsDefaultTrueAndIsActiveTrue(retailer).size());

        assertDoesNotThrow(() -> addressService.setDefault(a2Id, retailer));

        Address reloaded1 = addressRepository.findById(a1Id).orElseThrow();
        Address reloaded2 = addressRepository.findById(a2Id).orElseThrow();

        assertFalse(Boolean.TRUE.equals(reloaded1.getIsDefault()));
        assertTrue(Boolean.TRUE.equals(reloaded2.getIsDefault()));
        assertEquals(1, addressRepository.findByUserAndIsDefaultTrueAndIsActiveTrue(retailer).size());
    }

    @Test
    @Transactional
    void deletingDefaultAddress_autoPromotesAnotherActiveAddressToDefault() {
        Role retailerRole = ensureRole("RETAILER");

        User retailer = userRepository.save(User.builder()
                .name("R_default_delete")
                .email("r_default_delete@test.com")
                .password("pw")
                .roles(Set.of(retailerRole))
                .build());

        Address a1 = Address.builder()
                .user(retailer)
                .name("A1")
                .addressType(AddressType.HOME)
                .addressLine1("L1")
                .city("C")
                .state("S")
                .pincode("111111")
                .isDefault(true)
                .isActive(true)
                .build();
        a1.setCreatedBy(retailer);
        a1.setUpdatedBy(retailer);
        Long a1Id = addressRepository.save(a1).getId();

        Address a2 = Address.builder()
                .user(retailer)
                .name("A2")
                .addressType(AddressType.OFFICE)
                .addressLine1("L2")
                .city("C")
                .state("S")
                .pincode("222222")
                .isDefault(false)
                .isActive(true)
                .build();
        a2.setCreatedBy(retailer);
        a2.setUpdatedBy(retailer);
        Long a2Id = addressRepository.save(a2).getId();

        assertEquals(1, addressRepository.findByUserAndIsDefaultTrueAndIsActiveTrue(retailer).size());

        // delete the current default
        addressService.softDeleteAddress(a1Id, retailer);

        Address deleted = addressRepository.findById(a1Id).orElseThrow();
        assertFalse(Boolean.TRUE.equals(deleted.getIsActive()));
        assertFalse(Boolean.TRUE.equals(deleted.getIsDefault()));

        Address remaining = addressRepository.findById(a2Id).orElseThrow();
        assertTrue(Boolean.TRUE.equals(remaining.getIsActive()));
        assertTrue(Boolean.TRUE.equals(remaining.getIsDefault()));

        assertEquals(1, addressRepository.findByUserAndIsDefaultTrueAndIsActiveTrue(retailer).size());
    }
}
