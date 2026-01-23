package com.quickcart.backend.service;

import com.quickcart.backend.dto.BulkCreateProductsRequest;
import com.quickcart.backend.dto.BulkCreateProductsResponse;
import com.quickcart.backend.dto.CreateProductRequest;
import com.quickcart.backend.dto.ProductDetailsResponse;
import com.quickcart.backend.dto.ProductListResponse;
import com.quickcart.backend.dto.UpdateProductRequest;
import com.quickcart.backend.entity.Category;
import com.quickcart.backend.entity.Product;
import com.quickcart.backend.entity.ProductStatus;
import com.quickcart.backend.entity.User;
import com.quickcart.backend.exception.AccessDeniedException;
import com.quickcart.backend.exception.ResourceNotFoundException;
import com.quickcart.backend.repository.CategoryRepository;
import com.quickcart.backend.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    public void createProduct(CreateProductRequest request, User manufacturer) {
        Category category = resolveCategory(request.getCategoryId());

        Product product = Product.builder()
                .name(request.getName())
                .description(request.getDescription())
                .shortDescription(request.getShortDescription())
                .brand(request.getBrand())
                .sku(request.getSku())
                .price(request.getPrice())
                .mrp(request.getMrp())
                .discountPrice(request.getDiscountPrice())
                .thumbnailUrl(request.getThumbnailUrl())
                .rating(request.getRating())
                .reviewCount(request.getReviewCount())
                .isFeatured(request.getIsFeatured())
                .isReturnable(request.getIsReturnable())
                .warrantyMonths(request.getWarrantyMonths())
                .category(category)
                .stock(request.getStock())
                .status(ProductStatus.ACTIVE)
                .manufacturer(manufacturer)
                .build();

        productRepository.save(product);
    }

    public Page<ProductListResponse> getProductListForUser(User user, Pageable pageable) {

        Page<Product> products;

        boolean isManufacturer = user.hasRole("MANUFACTURER");

        if (isManufacturer) {
            products = productRepository.findByManufacturer(user, pageable);
        } else {
            products = productRepository.findByStatus(ProductStatus.ACTIVE, pageable);
        }

        return products.map(this::mapToListResponse);
    }

    public ProductDetailsResponse getProductDetailsByIdForUser(Long productId, User user) {
        boolean isManufacturer = user.hasRole("MANUFACTURER");

        Product product;
        if (isManufacturer) {
            // Manufacturers can only see their own products
            product = productRepository.findByIdAndManufacturer(productId, user)
                    .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));
        } else {
            // Buyers can only see ACTIVE products
            product = productRepository.findById(productId)
                    .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

            if (!product.isActive()) {
                throw new ResourceNotFoundException("Product", "id", productId);
            }
        }

        return mapToDetailsResponse(product);
    }

    private Category resolveCategory(Long categoryId) {
        if (categoryId == null) {
            return null;
        }
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", categoryId));
    }

    private ProductListResponse mapToListResponse(Product product) {
        return ProductListResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .description(product.getDescription())
                .price(product.getPrice())
                .stock(product.getStock())
                .status(product.getStatus().name())
                .manufacturerName(product.getManufacturer() != null ? product.getManufacturer().getName() : null)
                .build();
    }

    private ProductDetailsResponse mapToDetailsResponse(Product product) {
        return ProductDetailsResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .description(product.getDescription())
                .shortDescription(product.getShortDescription())
                .brand(product.getBrand())
                .sku(product.getSku())
                .price(product.getPrice())
                .mrp(product.getMrp())
                .discountPrice(product.getDiscountPrice())
                .thumbnailUrl(product.getThumbnailUrl())
                .rating(product.getRating())
                .reviewCount(product.getReviewCount())
                .isFeatured(product.getIsFeatured())
                .isReturnable(product.getIsReturnable())
                .warrantyMonths(product.getWarrantyMonths())
                .categoryId(product.getCategory() != null ? product.getCategory().getId() : null)
                .category(product.getCategory() == null ? null : com.quickcart.backend.dto.CategoryResponse.builder()
                        .id(product.getCategory().getId())
                        .name(product.getCategory().getName())
                        .slug(product.getCategory().getSlug())
                        .build())
                .stock(product.getStock())
                .status(product.getStatus().name())
                .manufacturerId(product.getManufacturer() != null ? product.getManufacturer().getId() : null)
                .manufacturerName(product.getManufacturer() != null ? product.getManufacturer().getName() : null)
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .build();
    }

    public void updateProduct(Long productId, UpdateProductRequest request, User manufacturer) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        if (!product.getManufacturer().getId().equals(manufacturer.getId())) {
            throw new AccessDeniedException("Product", productId);
        }

        Category category = resolveCategory(request.getCategoryId());

        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setShortDescription(request.getShortDescription());
        product.setBrand(request.getBrand());
        product.setSku(request.getSku());
        product.setPrice(request.getPrice());
        product.setMrp(request.getMrp());
        product.setDiscountPrice(request.getDiscountPrice());
        product.setThumbnailUrl(request.getThumbnailUrl());
        product.setRating(request.getRating());
        product.setReviewCount(request.getReviewCount());
        product.setIsFeatured(request.getIsFeatured());
        product.setIsReturnable(request.getIsReturnable());
        product.setWarrantyMonths(request.getWarrantyMonths());
        product.setCategory(category);
        product.setStock(request.getStock());

        productRepository.save(product);
    }

    public void deactivateProduct(Long productId, User manufacturer) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        if (!product.getManufacturer().getId().equals(manufacturer.getId())) {
            throw new AccessDeniedException("Product", productId);
        }

        product.setStatus(ProductStatus.INACTIVE);
        productRepository.save(product);
    }

    @Transactional
    public BulkCreateProductsResponse createProductsBulk(BulkCreateProductsRequest request, User manufacturer) {
        if (!manufacturer.hasRole("MANUFACTURER")) {
            throw new AccessDeniedException("Only manufacturers can create products");
        }

        List<Product> products = request.getProducts().stream()
                .map(p -> {
                    Category category = resolveCategory(p.getCategoryId());
                    return Product.builder()
                            .name(p.getName())
                            .description(p.getDescription())
                            .shortDescription(p.getShortDescription())
                            .brand(p.getBrand())
                            .sku(p.getSku())
                            .price(p.getPrice())
                            .mrp(p.getMrp())
                            .discountPrice(p.getDiscountPrice())
                            .thumbnailUrl(p.getThumbnailUrl())
                            .rating(p.getRating())
                            .reviewCount(p.getReviewCount())
                            .isFeatured(p.getIsFeatured())
                            .isReturnable(p.getIsReturnable())
                            .warrantyMonths(p.getWarrantyMonths())
                            .category(category)
                            .stock(p.getStock())
                            .status(ProductStatus.ACTIVE)
                            .manufacturer(manufacturer)
                            .build();
                })
                .toList();

        List<Product> saved = productRepository.saveAll(products);

        List<Long> ids = saved.stream()
                .map(Product::getId)
                .toList();

        return BulkCreateProductsResponse.builder()
                .createdCount(saved.size())
                .productIds(ids)
                .build();
    }
}
