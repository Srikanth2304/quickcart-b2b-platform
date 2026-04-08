package com.quickcart.backend.controller;

import com.quickcart.backend.dto.ApiResponse;
import com.quickcart.backend.dto.PendingUserResponse;
import com.quickcart.backend.dto.UserStatusActionResponse;
import com.quickcart.backend.security.CustomUserDetails;
import com.quickcart.backend.service.ApprovalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserApprovalController {

    private final ApprovalService approvalService;

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','CATALOG_MANAGER')")
    public ResponseEntity<ApiResponse<List<PendingUserResponse>>> pendingUsers() {
        return ResponseEntity.ok(ApiResponse.success("Pending users fetched", approvalService.listPendingUsers()));
    }

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','CATALOG_MANAGER')")
    public ResponseEntity<ApiResponse<UserStatusActionResponse>> approve(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.success("User approved", approvalService.approve(id, currentUser.getUser())));
    }

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','CATALOG_MANAGER')")
    public ResponseEntity<ApiResponse<UserStatusActionResponse>> reject(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.success("User rejected", approvalService.reject(id, currentUser.getUser())));
    }

    @PatchMapping("/{id}/deactivate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','CATALOG_MANAGER')")
    public ResponseEntity<ApiResponse<UserStatusActionResponse>> deactivate(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.success("User deactivated", approvalService.deactivate(id, currentUser.getUser())));
    }

    @PatchMapping("/{id}/activate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','CATALOG_MANAGER')")
    public ResponseEntity<ApiResponse<UserStatusActionResponse>> activate(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.success("User activated", approvalService.activate(id, currentUser.getUser())));
    }
}

