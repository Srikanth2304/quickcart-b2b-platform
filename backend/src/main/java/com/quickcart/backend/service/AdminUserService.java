package com.quickcart.backend.service;

import com.quickcart.backend.dto.AdminCreateUserRequest;
import com.quickcart.backend.dto.AdminUserResponse;
import com.quickcart.backend.entity.Role;
import com.quickcart.backend.entity.User;
import com.quickcart.backend.exception.EmailAlreadyExistsException;
import com.quickcart.backend.exception.ResourceNotFoundException;
import com.quickcart.backend.repository.RoleRepository;
import com.quickcart.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public AdminUserResponse createUser(AdminCreateUserRequest request, User createdBy) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new EmailAlreadyExistsException(request.getEmail());
        }

        Set<Role> roles = request.getRoles().stream()
                .map(rt -> roleRepository.findByName(rt.name())
                        .orElseThrow(() -> new ResourceNotFoundException("Role", "name", rt.name())))
                .collect(Collectors.toSet());

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .roles(roles)
                .isActive(request.getIsActive() == null ? true : request.getIsActive())
                .createdBy(createdBy)
                .updatedBy(createdBy)
                .build();

        User saved = userRepository.save(user);
        return toResponse(saved);
    }

    static AdminUserResponse toResponse(User user) {
        return AdminUserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .isActive(user.getIsActive())
                .roles(user.getRoles().stream().map(Role::getName).collect(Collectors.toSet()))
                .createdById(user.getCreatedBy() == null ? null : user.getCreatedBy().getId())
                .createdByEmail(user.getCreatedBy() == null ? null : user.getCreatedBy().getEmail())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
