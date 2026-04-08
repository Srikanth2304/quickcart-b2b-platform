package com.quickcart.backend.service;

import com.quickcart.backend.dto.*;
import com.quickcart.backend.entity.Brand;
import com.quickcart.backend.exception.ResourceNotFoundException;
import com.quickcart.backend.repository.BrandRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class BrandService {

    private final BrandRepository brandRepository;

    @Transactional
    public BulkCreateBrandsResponse createBrandsBulk(BulkCreateBrandsRequest request) {
        Map<String, BulkCreateBrandsRequest.BrandItem> uniqueBySlug = new LinkedHashMap<>();

        for (BulkCreateBrandsRequest.BrandItem item : request.getBrands()) {
            String name = safeTrim(item.getName());
            if (name == null || name.isBlank()) {
                continue;
            }

            String slug = safeTrim(item.getSlug());
            slug = (slug == null || slug.isBlank()) ? toSlug(name) : toSlug(slug);
            if (slug == null || slug.isBlank()) {
                throw new IllegalArgumentException("Brand slug cannot be empty");
            }

            BulkCreateBrandsRequest.BrandItem normalized = new BulkCreateBrandsRequest.BrandItem();
            normalized.setName(name);
            normalized.setSlug(slug);
            normalized.setLogoUrl(safeTrim(item.getLogoUrl()));
            uniqueBySlug.put(slug.toLowerCase(Locale.ROOT), normalized);
        }

        List<Brand> existingEntities = brandRepository.findBySlugInIgnoreCase(uniqueBySlug.keySet());
        Map<String, Brand> existingBySlug = new HashMap<>();
        for (Brand brand : existingEntities) {
            if (brand.getSlug() != null) {
                existingBySlug.put(brand.getSlug().toLowerCase(Locale.ROOT), brand);
            }
        }

        List<BrandResponse> existing = new ArrayList<>();
        List<Brand> toCreate = new ArrayList<>();

        for (var entry : uniqueBySlug.entrySet()) {
            String slug = entry.getKey();
            BulkCreateBrandsRequest.BrandItem item = entry.getValue();

            Brand already = existingBySlug.get(slug);
            if (already != null) {
                existing.add(toResponse(already));
                continue;
            }

            toCreate.add(Brand.builder()
                    .name(item.getName())
                    .slug(item.getSlug())
                    .logoUrl(item.getLogoUrl())
                    .isActive(true)
                    .build());
        }

        List<Brand> createdEntities = toCreate.isEmpty() ? List.of() : brandRepository.saveAll(toCreate);
        if (!createdEntities.isEmpty()) {
            log.info("Created {} brands (ids={})", createdEntities.size(), createdEntities.stream().map(Brand::getId).toList());
        }

        return BulkCreateBrandsResponse.builder()
                .createdCount(createdEntities.size())
                .existingCount(existing.size())
                .created(createdEntities.stream().map(this::toResponse).toList())
                .existing(existing)
                .build();
    }

    @Transactional(readOnly = true)
    public List<BrandResponse> getActiveBrands() {
        return brandRepository.findByIsActiveTrue().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public BrandResponse getActiveBrandById(Long id) {
        Brand brand = brandRepository.findByIdAndIsActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Brand", "id", id));
        return toResponse(brand);
    }

    @Transactional
    public BrandResponse updateBrand(Long id, UpdateBrandRequest request) {
        Brand brand = brandRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Brand", "id", id));

        String name = safeTrim(request.getName());
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Brand name cannot be empty");
        }

        String slugInput = safeTrim(request.getSlug());
        String slug = toSlug((slugInput == null || slugInput.isBlank()) ? name : slugInput);
        if (brandRepository.existsBySlugIgnoreCaseAndIdNot(slug, id)) {
            throw new DataIntegrityViolationException("Brand slug already exists: " + slug);
        }

        boolean wasActive = brand.isActive();
        boolean nextActive = request.getIsActive() == null ? wasActive : request.getIsActive();

        brand.setName(name);
        brand.setSlug(slug);
        brand.setLogoUrl(safeTrim(request.getLogoUrl()));
        brand.setActive(nextActive);

        Brand saved = brandRepository.save(brand);
        if (wasActive && !nextActive) {
            log.info("Brand deactivated via update: id={}, slug={}", saved.getId(), saved.getSlug());
        } else {
            log.info("Brand updated: id={}, slug={}", saved.getId(), saved.getSlug());
        }
        return toResponse(saved);
    }

    @Transactional
    public void deactivateBrand(Long id) {
        Brand brand = brandRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Brand", "id", id));
        if (!brand.isActive()) {
            return;
        }

        brand.setActive(false);
        brandRepository.save(brand);
        log.info("Brand deactivated: id={}, slug={}", brand.getId(), brand.getSlug());
    }

    @Transactional(readOnly = true)
    public Brand resolveActiveBrand(Long brandId) {
        return brandRepository.findByIdAndIsActiveTrue(brandId)
                .orElseThrow(() -> new ResourceNotFoundException("Brand", "id", brandId));
    }

    @Transactional
    public Brand resolveOrCreateFromLegacyText(String legacyBrand) {
        String name = safeTrim(legacyBrand);
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Brand is required");
        }

        String slug = toSlug(name);
        Brand existing = brandRepository.findBySlugIgnoreCase(slug).orElse(null);
        if (existing != null) {
            if (!existing.isActive()) {
                throw new IllegalArgumentException("Brand is inactive: " + existing.getName());
            }
            return existing;
        }

        Brand created = brandRepository.save(Brand.builder()
                .name(name)
                .slug(slug)
                .isActive(true)
                .build());
        log.info("Brand created from legacy product request: id={}, slug={}", created.getId(), created.getSlug());
        return created;
    }

    private BrandResponse toResponse(Brand brand) {
        return BrandResponse.builder()
                .id(brand.getId())
                .name(brand.getName())
                .slug(brand.getSlug())
                .logoUrl(brand.getLogoUrl())
                .isActive(brand.isActive())
                .build();
    }

    private static String safeTrim(String input) {
        return input == null ? null : input.trim();
    }

    private static String toSlug(String input) {
        if (input == null) {
            return null;
        }
        String s = input.trim().toLowerCase(Locale.ROOT);
        s = s.replaceAll("[^a-z0-9]+", "-");
        s = s.replaceAll("-+", "-");
        s = s.replaceAll("^-", "");
        s = s.replaceAll("-$", "");
        return s;
    }
}
