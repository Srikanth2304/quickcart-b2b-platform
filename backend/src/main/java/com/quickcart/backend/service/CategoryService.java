package com.quickcart.backend.service;

import com.quickcart.backend.dto.BulkCreateCategoriesRequest;
import com.quickcart.backend.dto.BulkCreateCategoriesResponse;
import com.quickcart.backend.dto.CategoryResponse;
import com.quickcart.backend.entity.Category;
import com.quickcart.backend.entity.User;
import com.quickcart.backend.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;

    /**
     * Production-grade bulk category insert:
     * - Normalizes/generates slugs
     * - Deduplicates within request
     * - Returns which were created vs already existed
     * - Idempotent: re-sending the same payload is safe
     * - Audited: sets createdBy/updatedBy for newly created categories
     */
    @Transactional
    public BulkCreateCategoriesResponse createCategoriesBulk(BulkCreateCategoriesRequest request, User actor) {
        List<BulkCreateCategoriesRequest.CategoryItem> items = request.getCategories();

        // Normalize + dedupe by slug
        Map<String, BulkCreateCategoriesRequest.CategoryItem> uniqueBySlug = new LinkedHashMap<>();
        for (BulkCreateCategoriesRequest.CategoryItem item : items) {
            String name = safeTrim(item.getName());
            if (name == null || name.isBlank()) {
                continue; // validation should catch, but keep safe
            }

            String slug = safeTrim(item.getSlug());
            if (slug == null || slug.isBlank()) {
                slug = toSlug(name);
            } else {
                slug = toSlug(slug);
            }

            // last one wins if duplicate slug is sent
            BulkCreateCategoriesRequest.CategoryItem normalized = new BulkCreateCategoriesRequest.CategoryItem();
            normalized.setName(name);
            normalized.setSlug(slug);
            uniqueBySlug.put(slug.toLowerCase(Locale.ROOT), normalized);
        }

        List<String> slugsLower = new ArrayList<>(uniqueBySlug.keySet());

        // Find existing by slug (case-insensitive). We store query slugs in their normalized form.
        List<Category> existingEntities = categoryRepository.findBySlugInIgnoreCase(slugsLower);
        Map<String, Category> existingByLowerSlug = new HashMap<>();
        for (Category c : existingEntities) {
            if (c.getSlug() != null) {
                existingByLowerSlug.put(c.getSlug().toLowerCase(Locale.ROOT), c);
            }
        }

        List<CategoryResponse> existing = new ArrayList<>();
        List<Category> toCreate = new ArrayList<>();

        LocalDateTime now = LocalDateTime.now();

        for (var entry : uniqueBySlug.entrySet()) {
            String lowerSlug = entry.getKey();
            var item = entry.getValue();

            Category already = existingByLowerSlug.get(lowerSlug);
            if (already != null) {
                existing.add(CategoryResponse.builder()
                        .id(already.getId())
                        .name(already.getName())
                        .slug(already.getSlug())
                        .build());
                continue;
            }

            Category c = Category.builder()
                    .name(item.getName())
                    .slug(item.getSlug())
                    .createdAt(now)
                    .updatedAt(now)
                    .createdBy(actor)
                    .updatedBy(actor)
                    .build();
            toCreate.add(c);
        }

        List<Category> createdEntities = toCreate.isEmpty() ? List.of() : categoryRepository.saveAll(toCreate);
        List<CategoryResponse> created = createdEntities.stream()
                .map(c -> CategoryResponse.builder()
                        .id(c.getId())
                        .name(c.getName())
                        .slug(c.getSlug())
                        .build())
                .toList();

        return BulkCreateCategoriesResponse.builder()
                .createdCount(created.size())
                .existingCount(existing.size())
                .created(created)
                .existing(existing)
                .build();
    }

    private static String safeTrim(String s) {
        return s == null ? null : s.trim();
    }

    /**
     * Very small slugifier (no extra deps):
     * - lowercases
     * - replaces non-alphanumeric with '-'
     * - collapses repeats
     * - trims leading/trailing '-'
     */
    static String toSlug(String input) {
        if (input == null) return null;
        String s = input.trim().toLowerCase(Locale.ROOT);
        s = s.replaceAll("[^a-z0-9]+", "-");
        s = s.replaceAll("-+", "-");
        s = s.replaceAll("^-", "");
        s = s.replaceAll("-$", "");
        return s;
    }
}
