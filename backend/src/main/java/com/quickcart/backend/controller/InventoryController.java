package com.quickcart.backend.controller;

import com.quickcart.backend.dto.ApiResponse;
import com.quickcart.backend.dto.LowStockInventoryResponse;
import com.quickcart.backend.service.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;

    @GetMapping("/low-stock")
    @PreAuthorize("hasAnyRole('ADMIN','CATALOG_MANAGER')")
    public ResponseEntity<ApiResponse<LowStockInventoryResponse>> getLowStock(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(
                        "Operation successful",
                        inventoryService.getLowStockProducts(PageRequest.of(page, size))
                )
        );
    }
}
