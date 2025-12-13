package com.quickcart.backend.security;

import com.quickcart.backend.entity.User;
import com.quickcart.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

/**
 * Custom UserDetailsService implementation for loading user-specific data.
 * Returns CustomUserDetails which wraps the JPA User entity.
 */
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    /**
     * Loads user by email and wraps it in CustomUserDetails.
     * This allows @AuthenticationPrincipal to inject the User entity in controllers.
     *
     * @param email the user's email (used as username)
     * @return CustomUserDetails containing the User entity
     * @throws UsernameNotFoundException if user not found
     */
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        // Return CustomUserDetails which wraps our JPA User entity
        return new CustomUserDetails(user);
    }
}
