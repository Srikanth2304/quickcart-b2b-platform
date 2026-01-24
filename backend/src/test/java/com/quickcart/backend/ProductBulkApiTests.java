package com.quickcart.backend;

import com.quickcart.backend.dto.BulkCreateProductsRequest;
import com.quickcart.backend.dto.CreateProductRequest;
import com.quickcart.backend.entity.Category;
import com.quickcart.backend.entity.Product;
import com.quickcart.backend.entity.Role;
import com.quickcart.backend.entity.User;
import com.quickcart.backend.repository.CategoryRepository;
import com.quickcart.backend.repository.ProductRepository;
import com.quickcart.backend.repository.RoleRepository;
import com.quickcart.backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class ProductBulkApiTests {

    @Autowired
    private com.quickcart.backend.service.ProductService productService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Test
    @Transactional
    void bulkCreate_createsMultipleProductsForManufacturer() {
        // Arrange: create a manufacturer user in-test so the test is repeatable in any environment
        Role manufacturerRole = roleRepository.findByName("MANUFACTURER")
                .orElseGet(() -> roleRepository.save(Role.builder().name("MANUFACTURER").build()));

        String email = "bulk-manufacturer-" + UUID.randomUUID() + "@test.local";
        User manufacturer = User.builder()
                .name("Bulk Manufacturer")
                .email(email)
                .password("test")
                .isActive(true)
                .roles(Set.of(manufacturerRole))
                .build();
        final User savedManufacturer = userRepository.save(manufacturer);

        // Category is required by DB schema (products.category_id is NOT NULL)
        Category category = categoryRepository.save(Category.builder()
                .name("Test Category")
                .slug("test-category-" + UUID.randomUUID())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());

        CreateProductRequest p1 = new CreateProductRequest();
        p1.setName("Bulk Product A");
        p1.setDescription("Bulk desc A");
        p1.setPrice(new BigDecimal("10.50"));
        p1.setStock(10);
        p1.setCategoryId(category.getId());

        CreateProductRequest p2 = new CreateProductRequest();
        p2.setName("Bulk Product B");
        p2.setDescription("Bulk desc B");
        p2.setPrice(new BigDecimal("20.00"));
        p2.setStock(5);
        p2.setCategoryId(category.getId());

        BulkCreateProductsRequest bulk = new BulkCreateProductsRequest();
        bulk.setProducts(List.of(p1, p2));

        // Act
        var response = productService.createProductsBulk(bulk, savedManufacturer);

        // Assert
        assertThat(response.getCreatedCount()).isEqualTo(2);
        assertThat(response.getProductIds()).hasSize(2);

        List<Product> saved = productRepository.findAllById(response.getProductIds());
        assertThat(saved).hasSize(2);
        assertThat(saved).allMatch(pr -> pr.getManufacturer().getId().equals(savedManufacturer.getId()));
        assertThat(saved).allMatch(pr -> pr.getCategory() != null && pr.getCategory().getId().equals(category.getId()));
    }
}
