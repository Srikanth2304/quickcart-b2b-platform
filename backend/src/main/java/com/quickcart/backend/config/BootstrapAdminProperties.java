package com.quickcart.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration for creating an initial admin user on startup.
 *
 * This is intentionally opt-in. In production, set these via environment variables / secrets.
 */
@ConfigurationProperties(prefix = "app.bootstrap.admin")
public record BootstrapAdminProperties(
        boolean enabled,
        String email,
        String password,
        String name
) {
}
