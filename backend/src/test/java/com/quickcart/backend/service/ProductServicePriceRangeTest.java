package com.quickcart.backend.service;

import com.quickcart.backend.dto.PriceRangeResponse;
import com.quickcart.backend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductServicePriceRangeTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private ProductImageRepository productImageRepository;

    @Mock
    private ProductVariantRepository productVariantRepository;

    @Mock
    private BrandService brandService;

    @Mock
    private ProductFacetRepository productFacetRepository;

    @Mock
    private ProductReviewRepository productReviewRepository;

    private ProductService productService;

    @BeforeEach
    void setUp() {
        productService = new ProductService(
                productRepository,
                categoryRepository,
                productImageRepository,
                productVariantRepository,
                brandService,
                productFacetRepository,
                productReviewRepository
        );
    }

    @Test
    void returnsZeroRangeWhenRepositoryHasNoProducts() {
        when(productRepository.getPriceRange(null, null, null)).thenReturn(new Object[]{null, null});

        PriceRangeResponse response = productService.getPriceRange(null, null, null);

        assertEquals(0D, response.getMinPrice());
        assertEquals(0D, response.getMaxPrice());
    }

    @Test
    void trimsSearchAndMapsAggregateValues() {
        when(productRepository.getPriceRange(5L, 2L, "pen")).thenReturn(new Object[]{BigDecimal.TEN, BigDecimal.valueOf(300)});

        PriceRangeResponse response = productService.getPriceRange(5L, 2L, "  pen  ");

        verify(productRepository).getPriceRange(5L, 2L, "pen");
        assertEquals(10D, response.getMinPrice());
        assertEquals(300D, response.getMaxPrice());
    }
}

