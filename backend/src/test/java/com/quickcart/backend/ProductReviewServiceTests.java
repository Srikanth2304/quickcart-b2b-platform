package com.quickcart.backend;

import com.quickcart.backend.dto.UpsertProductReviewRequest;
import com.quickcart.backend.entity.Category;
import com.quickcart.backend.entity.Product;
import com.quickcart.backend.entity.ProductStatus;
import com.quickcart.backend.entity.Role;
import com.quickcart.backend.entity.User;
import com.quickcart.backend.repository.CategoryRepository;
import com.quickcart.backend.repository.ProductRepository;
import com.quickcart.backend.repository.RoleRepository;
import com.quickcart.backend.repository.UserRepository;
import com.quickcart.backend.service.ProductReviewService;
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
class ProductReviewServiceTests {

    @Autowired
    private ProductReviewService productReviewService;

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
    void upsertReview_createsThenUpdatesSingleReviewAndRecomputesAggregates() {
        // Arrange: user + product
        Role retailerRole = roleRepository.findByName("RETAILER")
                .orElseGet(() -> roleRepository.save(Role.builder().name("RETAILER").build()));

        User reviewer = userRepository.save(User.builder()
                .name("Reviewer")
                .email("reviewer-" + UUID.randomUUID() + "@test.local")
                .password("pass")
                .isActive(true)
                .roles(Set.of(retailerRole))
                .build());

        Role manufacturerRole = roleRepository.findByName("MANUFACTURER")
                .orElseGet(() -> roleRepository.save(Role.builder().name("MANUFACTURER").build()));

        User manufacturer = userRepository.save(User.builder()
                .name("Mfg")
                .email("mfg-" + UUID.randomUUID() + "@test.local")
                .password("pass")
                .isActive(true)
                .roles(Set.of(manufacturerRole))
                .build());

        Category category = categoryRepository.save(Category.builder()
                .name("Review Cat")
                .slug("review-cat-" + UUID.randomUUID())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());

        Product product = productRepository.save(Product.builder()
                .name("P")
                .description("D")
                .shortDescription("SD")
                .brand("B")
                .sku("SKU")
                .price(new BigDecimal("10.00"))
                .stock(10)
                .status(ProductStatus.ACTIVE)
                .manufacturer(manufacturer)
                .category(category)
                .reviewCount(0)
                .rating(null)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());

        // Act 1: create review with rating 5
        productReviewService.upsertReview(product.getId(), reviewer, UpsertProductReviewRequest.builder()
                .rating(5)
                .comment("Great")
                .build());

        Product afterCreate = productRepository.findById(product.getId()).orElseThrow();
        assertThat(afterCreate.getReviewCount()).isEqualTo(1);
        assertThat(afterCreate.getRating()).isNotNull();
        assertThat(afterCreate.getRating()).isEqualByComparingTo("5.00");

        // Act 2: update same user's review to rating 3
        productReviewService.upsertReview(product.getId(), reviewer, UpsertProductReviewRequest.builder()
                .rating(3)
                .comment("Okay")
                .build());

        Product afterUpdate = productRepository.findById(product.getId()).orElseThrow();
        assertThat(afterUpdate.getReviewCount()).isEqualTo(1); // still one review
        assertThat(afterUpdate.getRating()).isEqualByComparingTo("3.00");
    }

    @Test
    @Transactional
    void deleteMyReview_removesReviewAndRecomputesAggregates() {
        // Arrange: user + product
        Role retailerRole = roleRepository.findByName("RETAILER")
                .orElseGet(() -> roleRepository.save(Role.builder().name("RETAILER").build()));

        User reviewer = userRepository.save(User.builder()
                .name("Reviewer")
                .email("reviewer-del-" + UUID.randomUUID() + "@test.local")
                .password("pass")
                .isActive(true)
                .roles(Set.of(retailerRole))
                .build());

        Role manufacturerRole = roleRepository.findByName("MANUFACTURER")
                .orElseGet(() -> roleRepository.save(Role.builder().name("MANUFACTURER").build()));

        User manufacturer = userRepository.save(User.builder()
                .name("Mfg")
                .email("mfg-del-" + UUID.randomUUID() + "@test.local")
                .password("pass")
                .isActive(true)
                .roles(Set.of(manufacturerRole))
                .build());

        Category category = categoryRepository.save(Category.builder()
                .name("Review Cat")
                .slug("review-cat-del-" + UUID.randomUUID())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());

        Product product = productRepository.save(Product.builder()
                .name("P")
                .description("D")
                .shortDescription("SD")
                .brand("B")
                .sku("SKU")
                .price(new BigDecimal("10.00"))
                .stock(10)
                .status(ProductStatus.ACTIVE)
                .manufacturer(manufacturer)
                .category(category)
                .reviewCount(0)
                .rating(null)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());

        // Create review
        productReviewService.upsertReview(product.getId(), reviewer, UpsertProductReviewRequest.builder()
                .rating(4)
                .comment("Nice")
                .build());

        Product afterCreate = productRepository.findById(product.getId()).orElseThrow();
        assertThat(afterCreate.getReviewCount()).isEqualTo(1);
        assertThat(afterCreate.getRating()).isEqualByComparingTo("4.00");

        // Act: delete
        productReviewService.deleteMyReview(product.getId(), reviewer);

        Product afterDelete = productRepository.findById(product.getId()).orElseThrow();
        assertThat(afterDelete.getReviewCount()).isEqualTo(0);
        assertThat(afterDelete.getRating()).isNull();
    }
}
