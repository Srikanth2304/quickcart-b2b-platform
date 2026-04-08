package com.quickcart.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class InventoryBatchExpiryService {

    private final InventoryBatchService inventoryBatchService;

    @Scheduled(cron = "${app.inventory.batches.expiry.cron:0 0 2 * * *}")
    @Transactional
    public void expireBatches() {
        inventoryBatchService.expireBatchesDaily();
    }
}
