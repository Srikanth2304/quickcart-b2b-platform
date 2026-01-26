package com.quickcart.backend.controller;

import com.quickcart.backend.dto.AddressResponse;
import com.quickcart.backend.dto.CreateAddressRequest;
import com.quickcart.backend.dto.UpdateAddressRequest;
import com.quickcart.backend.security.CustomUserDetails;
import com.quickcart.backend.service.AddressService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/addresses")
@RequiredArgsConstructor
public class AddressController {

    private final AddressService addressService;

    @PostMapping
    @PreAuthorize("hasRole('RETAILER')")
    public ResponseEntity<AddressResponse> create(
            @Valid @RequestBody CreateAddressRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(addressService.createAddress(request, currentUser.getUser()));
    }

    @GetMapping
    @PreAuthorize("hasRole('RETAILER')")
    public ResponseEntity<List<AddressResponse>> listMine(
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(addressService.getMyAddresses(currentUser.getUser()));
    }

    /**
     * Partial update support.
     * Example: {"landmark": "Near Rail Station"}
     */
    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('RETAILER')")
    public ResponseEntity<AddressResponse> patch(
            @PathVariable Long id,
            @RequestBody UpdateAddressRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(addressService.updateAddress(id, request, currentUser.getUser()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('RETAILER')")
    public ResponseEntity<String> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        addressService.softDeleteAddress(id, currentUser.getUser());
        return ResponseEntity.ok("Address deleted");
    }

    @PutMapping("/{id}/default")
    @PreAuthorize("hasRole('RETAILER')")
    public ResponseEntity<String> setDefault(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        addressService.setDefault(id, currentUser.getUser());
        return ResponseEntity.ok("Default address updated");
    }
}
