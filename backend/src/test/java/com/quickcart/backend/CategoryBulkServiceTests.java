package com.quickcart.backend;

import com.quickcart.backend.dto.BulkCreateCategoriesRequest;
import com.quickcart.backend.repository.CategoryRepository;
import com.quickcart.backend.service.CategoryService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class CategoryBulkServiceTests {

    @Autowired
    private CategoryService categoryService;

    @Autowired
    private CategoryRepository categoryRepository;

    @Test
    @Transactional
    void bulkCreate_isIdempotent_andGeneratesSlugs() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        BulkCreateCategoriesRequest req = new BulkCreateCategoriesRequest();

        BulkCreateCategoriesRequest.CategoryItem a = new BulkCreateCategoriesRequest.CategoryItem();
        a.setName("Office Supplies " + suffix);
        // no slug => auto

        BulkCreateCategoriesRequest.CategoryItem b = new BulkCreateCategoriesRequest.CategoryItem();
        b.setName("Electronics " + suffix);
        b.setSlug(" Electronics--" + suffix + " ");

        req.setCategories(List.of(a, b));

        var first = categoryService.createCategoriesBulk(req);
        assertThat(first.getCreatedCount()).isEqualTo(2);
        assertThat(first.getExistingCount()).isEqualTo(0);
        assertThat(first.getCreated()).hasSize(2);
        assertThat(first.getCreated().getFirst().getSlug()).isNotBlank();

        var second = categoryService.createCategoriesBulk(req);
        assertThat(second.getCreatedCount()).isEqualTo(0);
        assertThat(second.getExistingCount()).isEqualTo(2);

        // verify persisted
        assertThat(categoryRepository.findBySlugIgnoreCase(first.getCreated().getFirst().getSlug())).isPresent();
    }
}
