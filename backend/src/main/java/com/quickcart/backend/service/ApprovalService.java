package com.quickcart.backend.service;

import com.quickcart.backend.dto.PendingUserResponse;
import com.quickcart.backend.dto.UserStatusActionResponse;
import com.quickcart.backend.entity.RoleType;
import com.quickcart.backend.entity.User;
import com.quickcart.backend.entity.UserStatus;
import com.quickcart.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ApprovalService {

    private final UserRepository userRepository;
    private final UserService userService;

    @Transactional(readOnly = true)
    public List<PendingUserResponse> listPendingUsers() {
        return userRepository.findAllByStatusOrderByCreatedAtAsc(UserStatus.PENDING)
                .stream()
                .map(this::toPendingResponse)
                .toList();
    }

    @Transactional
    public UserStatusActionResponse approve(Long userId, User actor) {
        User target = userService.getActiveRecordById(userId);
        validateActorCanManage(actor, target);
        if (target.getStatus() != UserStatus.PENDING) {
            throw new IllegalStateException("Only PENDING users can be approved");
        }

        target.setStatus(UserStatus.ACTIVE);
        target.setIsActive(true);
        User saved = userRepository.save(target);
        log.info("User approval: actor={} target={} newStatus={}", actor.getEmail(), target.getEmail(), saved.getStatus());
        return toActionResponse(saved);
    }

    @Transactional
    public UserStatusActionResponse reject(Long userId, User actor) {
        User target = userService.getActiveRecordById(userId);
        validateActorCanManage(actor, target);
        if (target.getStatus() != UserStatus.PENDING) {
            throw new IllegalStateException("Only PENDING users can be rejected");
        }

        target.setStatus(UserStatus.SUSPENDED);
        target.setIsActive(false);
        User saved = userRepository.save(target);
        log.info("User rejection: actor={} target={} newStatus={}", actor.getEmail(), target.getEmail(), saved.getStatus());
        return toActionResponse(saved);
    }

    @Transactional
    public UserStatusActionResponse deactivate(Long userId, User actor) {
        User target = userService.getActiveRecordById(userId);
        validateActorCanManage(actor, target);
        if (target.getStatus() == UserStatus.INACTIVE) {
            throw new IllegalStateException("User is already INACTIVE");
        }

        target.setStatus(UserStatus.INACTIVE);
        target.setIsActive(false);
        User saved = userRepository.save(target);
        log.info("User deactivation: actor={} target={} newStatus={}", actor.getEmail(), target.getEmail(), saved.getStatus());
        return toActionResponse(saved);
    }

    @Transactional
    public UserStatusActionResponse activate(Long userId, User actor) {
        User target = userService.getActiveRecordById(userId);
        validateActorCanManage(actor, target);

        if (target.getStatus() == UserStatus.PENDING) {
            throw new IllegalStateException("Pending users must be approved before activation");
        }

        target.setStatus(UserStatus.ACTIVE);
        target.setIsActive(true);
        User saved = userRepository.save(target);
        log.info("User activation: actor={} target={} newStatus={}", actor.getEmail(), target.getEmail(), saved.getStatus());
        return toActionResponse(saved);
    }

    private void validateActorCanManage(User actor, User target) {
        RoleType actorRole = userService.requirePrimaryRole(actor);
        RoleType targetRole = userService.requirePrimaryRole(target);

        if (targetRole == RoleType.SUPER_ADMIN && actorRole != RoleType.SUPER_ADMIN) {
            throw new IllegalArgumentException("Only SUPER_ADMIN can manage SUPER_ADMIN users");
        }

        if (actorRole == RoleType.CATALOG_MANAGER && !userService.isManagedByCatalogManager(targetRole)) {
            throw new IllegalArgumentException("CATALOG_MANAGER can manage only MANUFACTURER and RETAILER users");
        }

        if (actorRole == RoleType.MANUFACTURER || actorRole == RoleType.RETAILER) {
            throw new IllegalArgumentException(actorRole + " cannot manage users");
        }
    }

    private PendingUserResponse toPendingResponse(User user) {
        return PendingUserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getPrimaryRole())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .createdBy(user.getCreatedBy())
                .build();
    }

    private UserStatusActionResponse toActionResponse(User user) {
        return UserStatusActionResponse.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .role(user.getPrimaryRole())
                .status(user.getStatus())
                .isActive(user.getIsActive())
                .updatedBy(user.getUpdatedBy())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}

