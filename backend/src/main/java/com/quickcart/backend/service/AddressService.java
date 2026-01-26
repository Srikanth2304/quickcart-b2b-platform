package com.quickcart.backend.service;

import com.quickcart.backend.dto.AddressResponse;
import com.quickcart.backend.dto.CreateAddressRequest;
import com.quickcart.backend.dto.UpdateAddressRequest;
import com.quickcart.backend.entity.Address;
import com.quickcart.backend.entity.AddressType;
import com.quickcart.backend.entity.User;
import com.quickcart.backend.exception.AccessDeniedException;
import com.quickcart.backend.exception.ResourceNotFoundException;
import com.quickcart.backend.repository.AddressRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AddressService {

    private final AddressRepository addressRepository;

    @Transactional
    public AddressResponse createAddress(CreateAddressRequest req, User user) {
        if (!user.hasRole("RETAILER")) {
            throw new AccessDeniedException("Only retailers can manage delivery addresses");
        }

        // UX: if this is the user's first active address and isDefault is not provided, make it default.
        Boolean requestedDefault = req.getIsDefault();
        boolean makeDefault;
        if (requestedDefault == null) {
            makeDefault = !addressRepository.existsByUserAndIsActiveTrue(user);
        } else {
            makeDefault = Boolean.TRUE.equals(requestedDefault);
        }

        if (makeDefault) {
            unsetDefaultForUser(user);
        }

        Address address = Address.builder()
                .user(user)
                .name(trim(req.getName()))
                .phone(trim(req.getPhone()))
                .alternatePhone(trim(req.getAlternatePhone()))
                .addressType(parseAddressType(req.getAddressType()))
                .locality(trim(req.getLocality()))
                .landmark(trim(req.getLandmark()))
                .addressLine1(trim(req.getAddressLine1()))
                .city(trim(req.getCity()))
                .state(trim(req.getState()))
                .pincode(trim(req.getPincode()))
                .isDefault(makeDefault)
                .isActive(true)
                .deletedAt(null)
                .build();

        address.setCreatedBy(user);
        address.setUpdatedBy(user);

        Address saved = addressRepository.save(address);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<AddressResponse> getMyAddresses(User user) {
        if (!user.hasRole("RETAILER")) {
            throw new AccessDeniedException("Only retailers can manage delivery addresses");
        }
        return addressRepository.findByUserAndIsActiveTrueOrderByIdDesc(user).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Address getAddressOwnedByUserOrThrow(Long addressId, User user) {
        return addressRepository.findByIdAndUserAndIsActiveTrue(addressId, user)
                .orElseThrow(() -> new ResourceNotFoundException("Address", "id", addressId));
    }

    @Transactional
    public AddressResponse updateAddress(Long addressId, UpdateAddressRequest req, User user) {
        if (!user.hasRole("RETAILER")) {
            throw new AccessDeniedException("Only retailers can manage delivery addresses");
        }

        Address address = getAddressOwnedByUserOrThrow(addressId, user);

        address.setName(trim(req.getName()));
        address.setPhone(trim(req.getPhone()));
        address.setAlternatePhone(trim(req.getAlternatePhone()));
        address.setAddressType(parseAddressType(req.getAddressType()));
        address.setLocality(trim(req.getLocality()));
        address.setLandmark(trim(req.getLandmark()));
        address.setAddressLine1(trim(req.getAddressLine1()));
        address.setCity(trim(req.getCity()));
        address.setState(trim(req.getState()));
        address.setPincode(trim(req.getPincode()));

        // Optional: Promote to default.
        // Use the same safe bulk-update approach as setDefault to avoid unique index violations.
        boolean promoteToDefault = Boolean.TRUE.equals(req.getIsDefault());
        if (promoteToDefault) {
            unsetDefaultForUser(user);
        }

        address.setUpdatedBy(user);

        Address saved = addressRepository.save(address);

        if (promoteToDefault) {
            // Ensure exactly this address becomes default at the DB level.
            addressRepository.setDefaultForUser(saved.getId(), user);
        }

        // Reload not strictly required, but keeps response consistent with DB state.
        Address reloaded = addressRepository.findByIdAndUserAndIsActiveTrue(saved.getId(), user)
                .orElseThrow(() -> new ResourceNotFoundException("Address", "id", saved.getId()));

        return toResponse(reloaded);
    }

    @Transactional
    public void softDeleteAddress(Long addressId, User user) {
        if (!user.hasRole("RETAILER")) {
            throw new AccessDeniedException("Only retailers can manage delivery addresses");
        }

        Address address = getAddressOwnedByUserOrThrow(addressId, user);
        boolean wasDefault = Boolean.TRUE.equals(address.getIsDefault());

        // soft delete
        address.setIsActive(false);
        address.setDeletedAt(LocalDateTime.now());
        address.setIsDefault(false);
        address.setUpdatedBy(user);

        addressRepository.save(address);

        // If the deleted address was default, auto-promote another active address (if any)
        if (wasDefault) {
            addressRepository.findFirstByUserAndIsActiveTrueOrderByIdDesc(user)
                    .ifPresent(next -> {
                        // Clear any lingering defaults (defensive) then set the chosen one
                        unsetDefaultForUser(user);
                        addressRepository.setDefaultForUser(next.getId(), user);
                    });
        }
    }

    @Transactional
    public void setDefault(Long addressId, User user) {
        if (!user.hasRole("RETAILER")) {
            throw new AccessDeniedException("Only retailers can manage delivery addresses");
        }

        // Validate ownership and active status (also gives nice 404 for wrong ids)
        getAddressOwnedByUserOrThrow(addressId, user);

        // Important: use a bulk UPDATE + flush to clear existing defaults first.
        unsetDefaultForUser(user);

        int updated = addressRepository.setDefaultForUser(addressId, user);
        if (updated != 1) {
            throw new ResourceNotFoundException("Address", "id", addressId);
        }
    }

    private void unsetDefaultForUser(User user) {
        // Use a bulk update to avoid Hibernate flush ordering issues that can violate the unique partial index.
        addressRepository.unsetDefaultForUser(user);
    }

    private AddressResponse toResponse(Address a) {
        AddressType type = a.getAddressType();
        return AddressResponse.builder()
                .id(a.getId())
                .name(a.getName())
                .phone(a.getPhone())
                .alternatePhone(a.getAlternatePhone())
                .addressType(type == null ? null : type.name())
                .locality(a.getLocality())
                .landmark(a.getLandmark())
                .addressLine1(a.getAddressLine1())
                .city(a.getCity())
                .state(a.getState())
                .pincode(a.getPincode())
                .isDefault(Boolean.TRUE.equals(a.getIsDefault()))
                .build();
    }

    private String trim(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private AddressType parseAddressType(String raw) {
        String t = trim(raw);
        if (t == null) return null;
        try {
            return AddressType.valueOf(t.toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new AccessDeniedException("Invalid addressType: " + t + ". Allowed: HOME, OFFICE, OTHER");
        }
    }
}