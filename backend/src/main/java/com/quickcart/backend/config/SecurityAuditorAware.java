package com.quickcart.backend.config;

import com.quickcart.backend.security.CustomUserDetails;
import org.springframework.data.domain.AuditorAware;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

/**
 * Resolves audit actor from Spring Security context.
 */
public class SecurityAuditorAware implements AuditorAware<String> {

    private static final String SYSTEM_AUDITOR = "SYSTEM";

    @Override
    public Optional<String> getCurrentAuditor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            return Optional.of(SYSTEM_AUDITOR);
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof CustomUserDetails customUserDetails
                && customUserDetails.getUser() != null
                && customUserDetails.getUser().getEmail() != null
                && !customUserDetails.getUser().getEmail().isBlank()) {
            return Optional.of(customUserDetails.getUser().getEmail());
        }

        String name = authentication.getName();
        if (name == null || name.isBlank()) {
            return Optional.of(SYSTEM_AUDITOR);
        }
        return Optional.of(name);
    }
}

