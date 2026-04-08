package com.quickcart.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class InventoryReservationExpiryService {

    private final InventoryService inventoryService;

    @Scheduled(fixedRateString = "${app.inventory.reservations.expiry.fixedRateMs:300000}")
    @Transactional
    public void expireReservations() {
        inventoryService.expireReservations();
    }
}
