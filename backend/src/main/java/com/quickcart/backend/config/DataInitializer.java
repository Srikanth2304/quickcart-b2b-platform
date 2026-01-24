package com.quickcart.backend.config;

import com.quickcart.backend.entity.Role;
import com.quickcart.backend.entity.RoleType;
import com.quickcart.backend.entity.User;
import com.quickcart.backend.repository.RoleRepository;
import com.quickcart.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

/**
 * Initializes required data at application startup.
 * Ensures all roles defined in RoleType enum are present in the database.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final BootstrapAdminProperties bootstrapAdminProperties;

    /**
     * Runs at application startup to initialize roles.
     * Transactional to ensure atomicity during role initialization.
     */
    @Override
    @Transactional
    public void run(String... args) {
        initializeRoles();
        bootstrapAdminUser();
    }

    /**
     * Creates all roles from RoleType enum if they don't exist.
     * This operation is idempotent - safe to run on every startup.
     */
    private void initializeRoles() {
        log.info("Initializing roles...");

        for (RoleType roleType : RoleType.values()) {
            String roleName = roleType.getRoleName();

            if (!roleRepository.existsByName(roleName)) {
                Role role = new Role();
                role.setName(roleName);
                roleRepository.save(role);
                log.info("✓ Created role: {}", roleName);
            } else {
                log.debug("Role already exists: {}", roleName);
            }
        }

        log.info("Role initialization complete. Total roles: {}", RoleType.values().length);
    }

    /**
     * Optional, production-grade bootstrap for the very first admin.
     *
     * Idempotent rules:
     * - If disabled: do nothing.
     * - If a user with the configured email exists: do nothing.
     *
     * Security posture:
     * - In production, set email/password via environment variables or a secrets manager.
     */
    private void bootstrapAdminUser() {
        if (bootstrapAdminProperties == null || !bootstrapAdminProperties.enabled()) {
            log.info("Admin bootstrap is disabled.");
            return;
        }

        String email = bootstrapAdminProperties.email();
        String password = bootstrapAdminProperties.password();
        String name = (bootstrapAdminProperties.name() == null || bootstrapAdminProperties.name().isBlank())
                ? "Admin"
                : bootstrapAdminProperties.name();

        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            log.warn("Admin bootstrap is enabled, but app.bootstrap.admin.email/password are not set. Skipping.");
            return;
        }

        if (userRepository.existsByEmail(email)) {
            log.info("Admin bootstrap user already exists ({}). Skipping.", email);
            return;
        }

        Role adminRole = roleRepository.findByName(RoleType.ADMIN.name())
                .orElseThrow(() -> new IllegalStateException("ADMIN role is missing. DataInitializer should have created it."));

        User admin = User.builder()
                .name(name)
                .email(email)
                .password(passwordEncoder.encode(password))
                .isActive(true)
                .roles(Set.of(adminRole))
                .build();

        userRepository.save(admin);
        log.info("✓ Bootstrapped initial ADMIN user: {}", email);
    }
}
