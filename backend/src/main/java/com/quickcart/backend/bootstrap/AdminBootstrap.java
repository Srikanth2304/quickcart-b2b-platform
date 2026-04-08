package com.quickcart.backend.bootstrap;

import com.quickcart.backend.entity.Role;
import com.quickcart.backend.entity.User;
import com.quickcart.backend.repository.RoleRepository;
import com.quickcart.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(Ordered.LOWEST_PRECEDENCE)
public class AdminBootstrap implements CommandLineRunner {

    private static final String DEFAULT_ADMIN_NAME = "System Admin";
    private static final String DEFAULT_ADMIN_EMAIL = "admin@quickcart.com";
    private static final String DEFAULT_ADMIN_PASSWORD = "Admin123";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.existsByEmail(DEFAULT_ADMIN_EMAIL)) {
            log.info("Admin already exists. Skipping bootstrap.");
            log.info("Bootstrap skipped. ADMIN already exists.");
            return;
        }

        Role adminRole = roleRepository.findByName("ADMIN")
                .orElseThrow(() -> new RuntimeException("ADMIN role missing. Please seed roles first."));

        User adminUser = User.builder()
                .name(DEFAULT_ADMIN_NAME)
                .email(DEFAULT_ADMIN_EMAIL)
                .password(passwordEncoder.encode(DEFAULT_ADMIN_PASSWORD))
                .isActive(true)
                .roles(Set.of(adminRole))
                .build();

        userRepository.save(adminUser);

        log.info("Default ADMIN user created successfully.");
        log.info("Bootstrap ADMIN created: {}", DEFAULT_ADMIN_EMAIL);
    }
}

