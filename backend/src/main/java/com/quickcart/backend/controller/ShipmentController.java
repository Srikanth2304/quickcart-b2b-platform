package com.quickcart.backend.controller;

import com.quickcart.backend.dto.ApiResponse;
import com.quickcart.backend.dto.ShipmentCreateRequest;
import com.quickcart.backend.dto.ShipmentDetailsResponse;
import com.quickcart.backend.dto.ShipmentStatusUpdateRequest;
import com.quickcart.backend.security.CustomUserDetails;
import com.quickcart.backend.service.ShipmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/shipments")
@RequiredArgsConstructor
public class ShipmentController {

    private final ShipmentService shipmentService;

    @PostMapping
    @PreAuthorize("hasRole('MANUFACTURER')")
    public ResponseEntity<ApiResponse<ShipmentDetailsResponse>> createShipment(
            @Valid @RequestBody ShipmentCreateRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Shipment created", shipmentService.createShipment(request, currentUser.getUser())));
    }

    @GetMapping("/{orderId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ShipmentDetailsResponse>> getShipmentByOrder(
            @PathVariable Long orderId,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.success("Operation successful", shipmentService.getShipmentByOrderId(orderId, currentUser.getUser())));
    }

    @PatchMapping("/{shipmentId}/status")
    @PreAuthorize("hasRole('MANUFACTURER')")
    public ResponseEntity<ApiResponse<ShipmentDetailsResponse>> updateShipmentStatus(
            @PathVariable Long shipmentId,
            @Valid @RequestBody ShipmentStatusUpdateRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.success("Shipment status updated", shipmentService.updateShipmentStatus(shipmentId, request, currentUser.getUser())));
    }
}
