package com.quickcart.backend.service;

import com.quickcart.backend.dto.AuthResponse;
import com.quickcart.backend.dto.LoginRequest;
import com.quickcart.backend.entity.User;
import com.quickcart.backend.exception.ResourceNotFoundException;
import com.quickcart.backend.repository.UserRepository;
import com.quickcart.backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    /**
     * Authenticates a user and generates a JWT token.
     *
     * @param request the login request containing email and password
     * @return AuthResponse containing the JWT token
     * @throws ResourceNotFoundException if user not found
     */
    public AuthResponse login(LoginRequest request) {

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", request.getEmail()));

        String token = jwtUtil.generateToken(user);

        return new AuthResponse(token);
    }
}
