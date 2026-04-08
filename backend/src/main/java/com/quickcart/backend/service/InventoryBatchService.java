package com.quickcart.backend.service;

import com.quickcart.backend.dto.CreateInventoryBatchRequest;
import com.quickcart.backend.dto.InventoryBatchResponse;
import com.quickcart.backend.dto.UpdateInventoryBatchRequest;
import com.quickcart.backend.entity.InventoryBatch;
import com.quickcart.backend.entity.Product;
import com.quickcart.backend.entity.ProductVariant;
import com.quickcart.backend.exception.OutOfStockException;
import com.quickcart.backend.exception.ResourceNotFoundException;
import com.quickcart.backend.repository.InventoryBatchRepository;
import com.quickcart.backend.repository.ProductRepository;
import com.quickcart.backend.repository.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryBatchService {

    private final InventoryBatchRepository inventoryBatchRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;

    @Transactional
    public InventoryBatchResponse createBatch(CreateInventoryBatchRequest request) {
        validateBatchRequest(request.getQuantity(), request.getExpiryDate());

        Product product = productRepository.findByIdForUpdate(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", request.getProductId()));

        ProductVariant variant = null;
        if (request.getVariantId() != null) {
            variant = productVariantRepository.findByIdForUpdate(request.getVariantId())
                    .orElseThrow(() -> new ResourceNotFoundException("Variant", "id", request.getVariantId()));
            if (!variant.getProduct().getId().equals(product.getId())) {
                throw new IllegalArgumentException("Variant does not belong to product");
            }
            variant.setStock(variant.getStock() + request.getQuantity());
        }

        product.setStock(product.getStock() + request.getQuantity());

        InventoryBatch saved = inventoryBatchRepository.save(InventoryBatch.builder()
                .product(product)
                .variant(variant)
                .batchCode(request.getBatchCode().trim())
                .quantity(request.getQuantity())
                .remainingQuantity(request.getQuantity())
                .expiryDate(request.getExpiryDate())
                .supplierName(trimOrNull(request.getSupplierName()))
                .isActive(true)
                .build());

        log.info("Batch created: id={}, batchCode={}, qty={}", saved.getId(), saved.getBatchCode(), saved.getQuantity());
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<InventoryBatchResponse> listBatches(Long productId, Long variantId) {
        if (variantId != null) {
            return inventoryBatchRepository.findByVariantIdOrderByCreatedAtDesc(variantId).stream().map(this::toResponse).toList();
        }
        if (productId != null) {
            return inventoryBatchRepository.findByProductIdOrderByCreatedAtDesc(productId).stream().map(this::toResponse).toList();
        }
        return inventoryBatchRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public InventoryBatchResponse getBatch(Long id) {
        InventoryBatch batch = inventoryBatchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("InventoryBatch", "id", id));
        return toResponse(batch);
    }

    @Transactional
    public InventoryBatchResponse updateBatch(Long id, UpdateInventoryBatchRequest request) {
        InventoryBatch batch = inventoryBatchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("InventoryBatch", "id", id));

        if (request.getExpiryDate() != null && request.getExpiryDate().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("expiryDate must be today or future date");
        }

        if (request.getRemainingQuantity() != null) {
            if (request.getRemainingQuantity() < 0) {
                throw new IllegalArgumentException("remainingQuantity cannot be negative");
            }
            if (request.getRemainingQuantity() > batch.getQuantity()) {
                throw new IllegalArgumentException("remainingQuantity cannot exceed quantity");
            }
            batch.setRemainingQuantity(request.getRemainingQuantity());
        }

        if (request.getSupplierName() != null) {
            batch.setSupplierName(trimOrNull(request.getSupplierName()));
        }
        if (request.getExpiryDate() != null) {
            batch.setExpiryDate(request.getExpiryDate());
        }
        if (request.getIsActive() != null) {
            batch.setIsActive(request.getIsActive());
        }

        return toResponse(batch);
    }

    @Transactional
    public boolean deductFifoIfBatchesExist(Product product, ProductVariant variant, int quantity) {
        List<InventoryBatch> batches = (variant == null)
                ? inventoryBatchRepository.findFifoProductBatchesForUpdate(product.getId(), LocalDate.now())
                : inventoryBatchRepository.findFifoVariantBatchesForUpdate(variant.getId(), LocalDate.now());

        if (batches.isEmpty()) {
            return false;
        }

        int remaining = quantity;
        for (InventoryBatch batch : batches) {
            if (remaining <= 0) {
                break;
            }
            int available = batch.getRemainingQuantity() == null ? 0 : batch.getRemainingQuantity();
            if (available <= 0) {
                continue;
            }

            int consume = Math.min(available, remaining);
            batch.setRemainingQuantity(available - consume);
            if (batch.getRemainingQuantity() == 0) {
                batch.setIsActive(false);
            }
            remaining -= consume;
        }

        if (remaining > 0) {
            String sku = variant != null ? variant.getSku() : product.getSku();
            int available = quantity - remaining;
            throw new OutOfStockException(sku, quantity, available);
        }

        return true;
    }

    @Transactional
    public void createRestockBatch(Product product, ProductVariant variant, int quantity, String sourceTag) {
        if (quantity <= 0) {
            return;
        }

        String code = sourceTag + "-" + System.currentTimeMillis();
        inventoryBatchRepository.save(InventoryBatch.builder()
                .product(product)
                .variant(variant)
                .batchCode(code)
                .quantity(quantity)
                .remainingQuantity(quantity)
                .supplierName("SYSTEM_RESTOCK")
                .isActive(true)
                .build());
    }

    @Transactional
    public void expireBatchesDaily() {
        LocalDate today = LocalDate.now();
        List<InventoryBatch> expired = inventoryBatchRepository.findExpiredActiveBatches(today);
        for (InventoryBatch batch : expired) {
            int releasing = batch.getRemainingQuantity() == null ? 0 : batch.getRemainingQuantity();
            if (releasing > 0) {
                Product product = productRepository.findByIdForUpdate(batch.getProduct().getId())
                        .orElseThrow(() -> new ResourceNotFoundException("Product", "id", batch.getProduct().getId()));
                product.setStock(Math.max(0, product.getStock() - releasing));

                if (batch.getVariant() != null) {
                    ProductVariant variant = productVariantRepository.findByIdForUpdate(batch.getVariant().getId())
                            .orElseThrow(() -> new ResourceNotFoundException("Variant", "id", batch.getVariant().getId()));
                    variant.setStock(Math.max(0, variant.getStock() - releasing));
                }
            }

            batch.setRemainingQuantity(0);
            batch.setIsActive(false);
            log.info("Batch expired: id={}, batchCode={}", batch.getId(), batch.getBatchCode());
        }
    }

    private void validateBatchRequest(Integer quantity, LocalDate expiryDate) {
        if (quantity == null || quantity <= 0) {
            throw new IllegalArgumentException("quantity must be greater than 0");
        }
        if (expiryDate != null && expiryDate.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("expiryDate must be today or future date");
        }
    }

    private InventoryBatchResponse toResponse(InventoryBatch batch) {
        return InventoryBatchResponse.builder()
                .id(batch.getId())
                .productId(batch.getProduct() != null ? batch.getProduct().getId() : null)
                .variantId(batch.getVariant() != null ? batch.getVariant().getId() : null)
                .batchCode(batch.getBatchCode())
                .quantity(batch.getQuantity())
                .remainingQuantity(batch.getRemainingQuantity())
                .expiryDate(batch.getExpiryDate())
                .supplierName(batch.getSupplierName())
                .isActive(batch.getIsActive())
                .createdAt(batch.getCreatedAt())
                .build();
    }

    private String trimOrNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
