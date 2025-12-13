package com.quickcart.backend.security;

import com.quickcart.backend.entity.User;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.stream.Collectors;

/**
 * Custom UserDetails implementation that wraps the JPA User entity.
 * Allows @AuthenticationPrincipal to inject the authenticated User.
 *
 * This bridges Spring Security's authentication system with our domain model.
 */
@RequiredArgsConstructor
public class CustomUserDetails implements UserDetails {

    /**
     * The wrapped JPA User entity.
     * Can be accessed in controllers via @AuthenticationPrincipal.
     */
    @Getter
    private final User user;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // Map User roles to Spring Security authorities with ROLE_ prefix
        return user.getRoles().stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role.getName()))
                .collect(Collectors.toList());
    }

    @Override
    public String getPassword() {
        return user.getPassword();
    }

    @Override
    public String getUsername() {
        // Using email as username
        return user.getEmail();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        // Use the isActive field from User entity
        return user.getIsActive() != null && user.getIsActive();
    }
}

