package com.quickcart.backend;

import com.quickcart.backend.dto.AdminCreateUserRequest;
import com.quickcart.backend.entity.Role;
import com.quickcart.backend.entity.RoleType;
import com.quickcart.backend.entity.User;
import com.quickcart.backend.repository.RoleRepository;
import com.quickcart.backend.repository.UserRepository;
import com.quickcart.backend.service.AdminUserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class AdminUserAuditServiceTests {

    @Autowired
    private AdminUserService adminUserService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Test
    @Transactional
    void adminCreateUser_setsCreatedBy_andTimestamps() {
        Role adminRole = roleRepository.findByName("ADMIN")
                .orElseGet(() -> roleRepository.save(Role.builder().name("ADMIN").build()));

        User admin = userRepository.save(User.builder()
                .name("Admin")
                .email("admin-" + UUID.randomUUID() + "@test.local")
                .password("pass")
                .isActive(true)
                .roles(Set.of(adminRole))
                .build());

        AdminCreateUserRequest req = new AdminCreateUserRequest();
        req.setName("Retailer User");
        req.setEmail("retailer-" + UUID.randomUUID() + "@test.local");
        req.setPassword("secret");
        req.setRoles(Set.of(RoleType.RETAILER));
        req.setIsActive(true);

        var created = adminUserService.createUser(req, admin);
        assertThat(created.getId()).isNotNull();
        assertThat(created.getCreatedById()).isEqualTo(admin.getId());
        assertThat(created.getCreatedByEmail()).isEqualTo(admin.getEmail());
        assertThat(created.getCreatedAt()).isNotNull();
        assertThat(created.getUpdatedAt()).isNotNull();

        User saved = userRepository.findById(created.getId()).orElseThrow();
        assertThat(saved.getCreatedBy()).isNotNull();
        assertThat(saved.getCreatedBy().getId()).isEqualTo(admin.getId());
        assertThat(saved.getUpdatedBy()).isNotNull();
        assertThat(saved.getUpdatedBy().getId()).isEqualTo(admin.getId());
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isNotNull();
    }
}
