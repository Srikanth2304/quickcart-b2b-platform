package com.quickcart.backend.service;

import com.quickcart.backend.dto.BulkCreateProductsRequest;
import com.quickcart.backend.dto.BulkCreateProductsResponse;
import com.quickcart.backend.dto.CreateProductRequest;
import com.quickcart.backend.dto.ProductDetailsResponse;
import com.quickcart.backend.dto.ProductFacetsResponse;
import com.quickcart.backend.dto.ProductListResponse;
import com.quickcart.backend.dto.UpdateProductRequest;
import com.quickcart.backend.entity.Category;
import com.quickcart.backend.entity.Product;
import com.quickcart.backend.entity.ProductStatus;
import com.quickcart.backend.entity.User;
import com.quickcart.backend.exception.AccessDeniedException;
import com.quickcart.backend.exception.ResourceNotFoundException;
import com.quickcart.backend.repository.CategoryRepository;
import com.quickcart.backend.repository.ProductFacetRepository;
import com.quickcart.backend.repository.ProductRepository;
import com.quickcart.backend.repository.ProductReviewRepository;
import com.quickcart.backend.repository.spec.ProductSpecifications;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductFacetRepository productFacetRepository;
    private final ProductReviewRepository productReviewRepository;

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
                .isFeatured(request.getIsFeatured())
                .isReturnable(request.getIsReturnable())
                .warrantyMonths(request.getWarrantyMonths())
                .category(category)
                .stock(request.getStock())
                .status(ProductStatus.ACTIVE)
                .manufacturer(manufacturer)
                // rating/review_count are derived from product_reviews; do not accept from request
                .rating(null)
                .reviewCount(0)
                .build();

        productRepository.save(product);
    }

    public Page<ProductListResponse> getProductListForUser(User user, Pageable pageable) {
        return getProductListForUser(user, pageable, null, null, null, null, null, null);
    }

    public Page<ProductListResponse> getProductListForUser(
            User user,
            Pageable pageable,
            String category,
            String brand,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            BigDecimal rating,
            Boolean inStock
    ) {
        return getProductListForUser(user, pageable, category, brand, minPrice, maxPrice, rating, inStock, null, null, null, null);
    }

    public Page<ProductListResponse> getProductListForUser(
            User user,
            Pageable pageable,
            String category,
            String brand,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            BigDecimal rating,
            Boolean inStock,
            Boolean featured,
            Boolean returnable,
            Boolean hasDiscountPrice,
            BigDecimal minDiscount
    ) {
        Specification<Product> spec = Specification
                .where(ProductSpecifications.visibleToUser(user))
                .and(ProductSpecifications.hasCategorySlugs(category))
                .and(ProductSpecifications.hasBrand(brand))
                .and(ProductSpecifications.priceGte(minPrice))
                .and(ProductSpecifications.priceLte(maxPrice))
                .and(ProductSpecifications.ratingGte(rating))
                .and(ProductSpecifications.inStock(inStock))
                .and(ProductSpecifications.isFeatured(featured))
                .and(ProductSpecifications.isReturnable(returnable))
                .and(ProductSpecifications.hasDiscountPrice(hasDiscountPrice))
                .and(ProductSpecifications.discountGte(minDiscount));

        Page<Product> products = productRepository.findAll(spec, pageable);
        return products.map(this::mapToListResponse);
    }

    @Transactional(readOnly = true)
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
        BigDecimal mrp = product.getMrp();
        BigDecimal price = product.getPrice();

        BigDecimal discount = BigDecimal.ZERO;
        BigDecimal discountPercent = BigDecimal.ZERO;

        if (mrp != null && price != null && mrp.signum() > 0) {
            discount = mrp.subtract(price);
            if (discount.signum() < 0) {
                discount = BigDecimal.ZERO;
            }
            if (discount.signum() > 0) {
                discountPercent = discount
                        .multiply(BigDecimal.valueOf(100))
                        .divide(mrp, 2, RoundingMode.HALF_UP);
            }
        }

        Integer stock = product.getStock();
        boolean inStock = stock != null && stock > 0;

        Double avg = productReviewRepository.averageRatingByProductId(product.getId());
        long reviewCount = productReviewRepository.countByProductId(product.getId());

        BigDecimal avgRating = avg == null ? null : BigDecimal.valueOf(avg).setScale(2, java.math.RoundingMode.HALF_UP);

        return ProductListResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .description(product.getDescription())
                .brand(product.getBrand())
                .imageUrl(product.getThumbnailUrl())
                .price(price)
                .mrp(mrp)
                .discount(discount)
                .discountPercent(discountPercent)
                .rating(avgRating)
                .reviewsCount((int) reviewCount)
                .stock(stock)
                .isInStock(inStock)
                .manufacturerId(product.getManufacturer() != null ? product.getManufacturer().getId() : null)
                .manufacturerName(product.getManufacturer() != null ? product.getManufacturer().getName() : null)
                .categoryId(product.getCategory() != null ? product.getCategory().getId() : null)
                .category(product.getCategory() == null ? null : com.quickcart.backend.dto.CategoryResponse.builder()
                        .id(product.getCategory().getId())
                        .name(product.getCategory().getName())
                        .slug(product.getCategory().getSlug())
                        .build())
                .build();
    }

    private ProductDetailsResponse mapToDetailsResponse(Product product) {
        Double avg = productReviewRepository.averageRatingByProductId(product.getId());
        long reviewCount = productReviewRepository.countByProductId(product.getId());
        BigDecimal avgRating = avg == null ? null : BigDecimal.valueOf(avg).setScale(2, java.math.RoundingMode.HALF_UP);

        BigDecimal mrp = product.getMrp();
        BigDecimal price = product.getPrice();
        BigDecimal discount = BigDecimal.ZERO;
        BigDecimal discountPercent = BigDecimal.ZERO;

        if (mrp != null && price != null && mrp.signum() > 0) {
            discount = mrp.subtract(price);
            if (discount.signum() < 0) {
                discount = BigDecimal.ZERO;
            }
            if (discount.signum() > 0) {
                discountPercent = discount
                        .multiply(BigDecimal.valueOf(100))
                        .divide(mrp, 2, RoundingMode.HALF_UP);
            }
        }

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
                .discount(discount)
                .discountPercent(discountPercent)
                .thumbnailUrl(product.getThumbnailUrl())
                .rating(avgRating)
                .reviewCount((int) reviewCount)
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

        // rating/review_count are derived from product_reviews; do not allow direct updates
        // product.setRating(request.getRating());
        // product.setReviewCount(request.getReviewCount());

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
                            // rating/review_count are derived from product_reviews; do not accept from request
                            .rating(null)
                            .reviewCount(0)
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

    @Transactional(readOnly = true)
    public ProductFacetsResponse getProductFacetsForUser(
            User user,
            String category,
            String brand,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            BigDecimal rating,
            Boolean inStock,
            Boolean featured,
            Boolean returnable,
            Boolean hasDiscountPrice,
            BigDecimal minDiscount
    ) {
        return ProductFacetsResponse.builder()
                .categories(productFacetRepository.getCategoryFacets(
                        user,
                        category,
                        brand,
                        minPrice,
                        maxPrice,
                        rating,
                        inStock,
                        featured,
                        returnable,
                        hasDiscountPrice,
                        minDiscount
                ))
                .brands(productFacetRepository.getBrandFacets(
                        user,
                        category,
                        brand,
                        minPrice,
                        maxPrice,
                        rating,
                        inStock,
                        featured,
                        returnable,
                        hasDiscountPrice,
                        minDiscount
                ))
                .build();
    }
}
