package com.quickcart.backend.config;

import com.quickcart.backend.entity.Role;
import com.quickcart.backend.entity.RoleType;
import com.quickcart.backend.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Initializes required data at application startup.
 * Ensures all roles defined in RoleType enum are present in the database.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;

    /**
     * Runs at application startup to initialize roles.
     * Transactional to ensure atomicity during role initialization.
     */
    @Override
    @Transactional
    public void run(String... args) {
        initializeRoles();
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
}
