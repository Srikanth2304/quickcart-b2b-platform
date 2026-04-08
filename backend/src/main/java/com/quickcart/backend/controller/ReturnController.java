package com.quickcart.backend.controller;

import com.quickcart.backend.dto.*;
import com.quickcart.backend.security.CustomUserDetails;
import com.quickcart.backend.service.ReturnService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/returns")
@RequiredArgsConstructor
public class ReturnController {

    private final ReturnService returnService;

    @PostMapping
    @PreAuthorize("hasRole('RETAILER')")
    public ResponseEntity<ApiResponse<ReturnRequestResponse>> requestReturn(
            @Valid @RequestBody CreateReturnRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Return requested", returnService.requestReturn(request, currentUser.getUser())));
    }

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasRole('MANUFACTURER')")
    public ResponseEntity<ApiResponse<ReturnRequestResponse>> approveReturn(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) ReturnActionRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        String note = request == null ? null : request.getNote();
        return ResponseEntity.ok(ApiResponse.success("Return approved", returnService.approveReturn(id, currentUser.getUser(), note)));
    }

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasRole('MANUFACTURER')")
    public ResponseEntity<ApiResponse<ReturnRequestResponse>> rejectReturn(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) ReturnActionRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        String note = request == null ? null : request.getNote();
        return ResponseEntity.ok(ApiResponse.success("Return rejected", returnService.rejectReturn(id, currentUser.getUser(), note)));
    }

    @PatchMapping("/{id}/receive")
    @PreAuthorize("hasRole('MANUFACTURER')")
    public ResponseEntity<ApiResponse<ReturnRequestResponse>> receiveReturn(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.success("Return received", returnService.receiveReturn(id, currentUser.getUser())));
    }

    @PatchMapping("/{id}/inspect")
    @PreAuthorize("hasRole('MANUFACTURER')")
    public ResponseEntity<ApiResponse<ReturnRequestResponse>> inspectReturn(
            @PathVariable Long id,
            @Valid @RequestBody ReturnInspectionRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.success("Return inspected",
                returnService.inspectReturn(id, request.getInspectionStatus(), currentUser.getUser())));
    }

    @PatchMapping("/{id}/complete")
    @PreAuthorize("hasRole('MANUFACTURER')")
    public ResponseEntity<ApiResponse<ReturnRequestResponse>> completeReturn(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.success("Return completed", returnService.completeReturn(id, currentUser.getUser())));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ReturnRequestResponse>> getReturn(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.success("Operation successful", returnService.getReturn(id, currentUser.getUser())));
    }
}
