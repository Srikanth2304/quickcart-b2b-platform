package com.quickcart.backend.service;

import com.quickcart.backend.entity.RoleType;
import com.quickcart.backend.entity.User;
import com.quickcart.backend.exception.ResourceNotFoundException;
import com.quickcart.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public User getActiveRecordById(Long id) {
        return userRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
    }

    public User getActiveRecordByEmail(String email) {
        return userRepository.findByEmailAndDeletedAtIsNull(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
    }

    public RoleType requirePrimaryRole(User user) {
        RoleType role = user.getPrimaryRole();
        if (role == null) {
            throw new IllegalArgumentException("User has no valid role assigned");
        }
        return role;
    }

    public boolean isManagedByCatalogManager(RoleType role) {
        return role == RoleType.MANUFACTURER || role == RoleType.RETAILER;
    }
}

