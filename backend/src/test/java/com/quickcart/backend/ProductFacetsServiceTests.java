


package com.quickcart.backend;

import com.quickcart.backend.dto.ProductFacetsResponse;
import com.quickcart.backend.entity.Category;
import com.quickcart.backend.entity.Role;
import com.quickcart.backend.entity.User;
import com.quickcart.backend.repository.CategoryRepository;
import com.quickcart.backend.repository.RoleRepository;
import com.quickcart.backend.repository.UserRepository;
import com.quickcart.backend.service.ProductService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class ProductFacetsServiceTests {

    @Autowired
    private ProductService productService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Test
    @Transactional
    void facets_returnTotalCountsNotLimitedByPagination() {
        // Arrange: manufacturer + two categories + multiple products across both categories + brands
        Role manufacturerRole = roleRepository.findByName("MANUFACTURER")
                .orElseGet(() -> roleRepository.save(Role.builder().name("MANUFACTURER").build()));

        User manufacturer = userRepository.save(User.builder()
                .name("Facet Mfg")
                .email("facets-mfg-" + UUID.randomUUID() + "@test.local")
                .password("pass")
                .isActive(true)
                .roles(Set.of(manufacturerRole))
                .build());

        Category catA = categoryRepository.save(Category.builder()
                .name("Office Supplies")
                .slug("office-supplies-" + UUID.randomUUID())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());

        Category catB = categoryRepository.save(Category.builder()
                .name("Electronics")
                .slug("electronics-" + UUID.randomUUID())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());

        // Create 20 products in catA brand HP and 5 products in catB brand Dell
        for (int i = 0; i < 20; i++) {
            var req = new com.quickcart.backend.dto.CreateProductRequest();
            req.setName("A-" + i);
            req.setDescription("A desc");
            req.setBrand("HP");
            req.setPrice(new BigDecimal("10.00"));
            req.setStock(10);
            req.setCategoryId(catA.getId());
            productService.createProduct(req, manufacturer);
        }

        for (int i = 0; i < 5; i++) {
            var req = new com.quickcart.backend.dto.CreateProductRequest();
            req.setName("B-" + i);
            req.setDescription("B desc");
            req.setBrand("Dell");
            req.setPrice(new BigDecimal("99.00"));
            req.setStock(10);
            req.setCategoryId(catB.getId());
            productService.createProduct(req, manufacturer);
        }

        // Act: request facets (no pagination) - should return totals
        ProductFacetsResponse facets = productService.getProductFacetsForUser(
                manufacturer,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );

        // Assert: category totals should be 20 and 5
        assertThat(facets.getCategories()).isNotEmpty();
        assertThat(facets.getCategories().stream().filter(c -> c.getId().equals(catA.getId())).findFirst().orElseThrow().getCount())
                .isEqualTo(20);
        assertThat(facets.getCategories().stream().filter(c -> c.getId().equals(catB.getId())).findFirst().orElseThrow().getCount())
                .isEqualTo(5);

        // Assert: brand totals should be 20 and 5
        assertThat(facets.getBrands()).isNotEmpty();
        assertThat(facets.getBrands().stream().filter(b -> b.getValue().equalsIgnoreCase("HP")).findFirst().orElseThrow().getCount())
                .isEqualTo(20);
        assertThat(facets.getBrands().stream().filter(b -> b.getValue().equalsIgnoreCase("Dell")).findFirst().orElseThrow().getCount())
                .isEqualTo(5);
    }
}

