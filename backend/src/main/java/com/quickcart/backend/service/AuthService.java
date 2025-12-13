package com.quickcart.backend.service;

import com.quickcart.backend.dto.AuthResponse;
import com.quickcart.backend.dto.LoginRequest;
import com.quickcart.backend.dto.RegisterRequest;
import com.quickcart.backend.entity.Role;
import com.quickcart.backend.entity.User;
import com.quickcart.backend.exception.EmailAlreadyExistsException;
import com.quickcart.backend.exception.ResourceNotFoundException;
import com.quickcart.backend.repository.RoleRepository;
import com.quickcart.backend.repository.UserRepository;
import com.quickcart.backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Set;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    /**
     * Registers a new user with the specified role.
     * Role is guaranteed to exist because it's initialized at startup.
     *
     * @param request the registration request containing user details and role
     * @throws EmailAlreadyExistsException if email already exists
     * @throws ResourceNotFoundException if role not found
     */
    public void register(RegisterRequest request) {

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new EmailAlreadyExistsException(request.getEmail());
        }

        // Convert RoleType enum to Role entity using the enum's name
        String roleName = request.getRole().name();
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new ResourceNotFoundException("Role", "name", roleName));

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .roles(Set.of(role))
                .isActive(true)
                .build();

        userRepository.save(user);
    }

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
