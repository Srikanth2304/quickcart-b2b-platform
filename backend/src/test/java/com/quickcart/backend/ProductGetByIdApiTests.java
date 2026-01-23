package com.quickcart.backend;

import com.quickcart.backend.dto.CreateProductRequest;
import com.quickcart.backend.dto.ProductDetailsResponse;
import com.quickcart.backend.entity.Product;
import com.quickcart.backend.entity.Role;
import com.quickcart.backend.entity.User;
import com.quickcart.backend.repository.ProductRepository;
import com.quickcart.backend.repository.RoleRepository;
import com.quickcart.backend.repository.UserRepository;
import com.quickcart.backend.service.ProductService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class ProductGetByIdApiTests {

    @Autowired
    private ProductService productService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Test
    @Transactional
    void getProductById_returnsFullProductResponse() {
        // Arrange: manufacturer + product
        Role manufacturerRole = roleRepository.findByName("MANUFACTURER")
                .orElseGet(() -> roleRepository.save(Role.builder().name("MANUFACTURER").build()));

        User manufacturer = userRepository.save(User.builder()
                .name("Mfg")
                .email("mfg-" + UUID.randomUUID() + "@test.local")
                .password("pass")
                .isActive(true)
                .roles(Set.of(manufacturerRole))
                .build());

        CreateProductRequest req = new CreateProductRequest();
        req.setName("P1");
        req.setDescription("D1");
        req.setShortDescription("SD1");
        req.setBrand("BrandX");
        req.setSku("SKU-1");
        req.setPrice(new BigDecimal("12.34"));
        req.setMrp(new BigDecimal("15.00"));
        req.setDiscountPrice(new BigDecimal("11.00"));
        req.setThumbnailUrl("https://example.com/p1.png");
        req.setRating(new BigDecimal("4.50"));
        req.setReviewCount(10);
        req.setIsFeatured(true);
        req.setIsReturnable(true);
        req.setWarrantyMonths(12);
        req.setCategoryId(99L);
        req.setStock(7);

        productService.createProduct(req, manufacturer);
        Product saved = productRepository.findAll().stream()
                .filter(p -> p.getManufacturer().getId().equals(manufacturer.getId()))
                .reduce((first, second) -> second)
                .orElseThrow();

        // Act
        ProductDetailsResponse res = productService.getProductDetailsByIdForUser(saved.getId(), manufacturer);

        // Assert: verify the response contains all fields we expose
        assertThat(res.getId()).isEqualTo(saved.getId());
        assertThat(res.getName()).isEqualTo("P1");
        assertThat(res.getDescription()).isEqualTo("D1");
        assertThat(res.getShortDescription()).isEqualTo("SD1");
        assertThat(res.getBrand()).isEqualTo("BrandX");
        assertThat(res.getSku()).isEqualTo("SKU-1");

        assertThat(res.getPrice()).isEqualByComparingTo("12.34");
        assertThat(res.getMrp()).isEqualByComparingTo("15.00");
        assertThat(res.getDiscountPrice()).isEqualByComparingTo("11.00");

        assertThat(res.getThumbnailUrl()).isEqualTo("https://example.com/p1.png");
        assertThat(res.getRating()).isEqualByComparingTo("4.50");
        assertThat(res.getReviewCount()).isEqualTo(10);
        assertThat(res.getIsFeatured()).isTrue();
        assertThat(res.getIsReturnable()).isTrue();
        assertThat(res.getWarrantyMonths()).isEqualTo(12);
        assertThat(res.getCategoryId()).isEqualTo(99L);

        assertThat(res.getStock()).isEqualTo(7);
        assertThat(res.getStatus()).isNotBlank();

        assertThat(res.getManufacturerId()).isEqualTo(manufacturer.getId());
        assertThat(res.getManufacturerName()).isEqualTo(manufacturer.getName());

        assertThat(res.getCreatedAt()).isNotNull();
        assertThat(res.getUpdatedAt()).isNotNull();
    }
}
