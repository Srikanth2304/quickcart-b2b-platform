package com.quickcart.backend.repository.spec;

import com.quickcart.backend.entity.Product;
import com.quickcart.backend.entity.ProductStatus;
import com.quickcart.backend.entity.User;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

public final class ProductSpecifications {

    private ProductSpecifications() {}

    public static Specification<Product> visibleToUser(User user) {
        return (root, query, cb) -> {
            // Avoid duplicates when joins are added
            query.distinct(true);

            if (user != null && user.hasRole("MANUFACTURER")) {
                return cb.equal(root.get("manufacturer"), user);
            }
            return cb.equal(root.get("status"), ProductStatus.ACTIVE);
        };
    }

    /**
     * Supports either:
     * - category=electronics
     * - category=electronics,furniture
     * Matching is done by category.slug (case-insensitive).
     */
    public static Specification<Product> hasCategorySlugs(String categorySlugs) {
        return (root, query, cb) -> {
            if (categorySlugs == null || categorySlugs.isBlank()) {
                return cb.conjunction();
            }

            List<String> slugs = Arrays.stream(categorySlugs.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isBlank())
                    .map(String::toLowerCase)
                    .distinct()
                    .collect(Collectors.toList());

            if (slugs.isEmpty()) {
                return cb.conjunction();
            }

            var categoryJoin = root.join("category");
            return cb.lower(categoryJoin.get("slug")).in(slugs);
        };
    }

    public static Specification<Product> hasBrand(String brand) {
        return (root, query, cb) -> {
            if (brand == null || brand.isBlank()) {
                return cb.conjunction();
            }
            return cb.equal(cb.lower(root.get("brand")), brand.trim().toLowerCase());
        };
    }

    public static Specification<Product> priceGte(BigDecimal minPrice) {
        return (root, query, cb) -> {
            if (minPrice == null) {
                return cb.conjunction();
            }
            return cb.greaterThanOrEqualTo(root.get("price"), minPrice);
        };
    }

    public static Specification<Product> priceLte(BigDecimal maxPrice) {
        return (root, query, cb) -> {
            if (maxPrice == null) {
                return cb.conjunction();
            }
            return cb.lessThanOrEqualTo(root.get("price"), maxPrice);
        };
    }

    public static Specification<Product> ratingGte(BigDecimal rating) {
        return (root, query, cb) -> {
            if (rating == null) {
                return cb.conjunction();
            }
            return cb.greaterThanOrEqualTo(root.get("rating"), rating);
        };
    }

    public static Specification<Product> inStock(Boolean inStock) {
        return (root, query, cb) -> {
            if (inStock == null) {
                return cb.conjunction();
            }
            if (Boolean.TRUE.equals(inStock)) {
                return cb.greaterThan(root.get("stock"), 0);
            }
            // if inStock=false => include out-of-stock only
            return cb.or(cb.isNull(root.get("stock")), cb.lessThanOrEqualTo(root.get("stock"), 0));
        };
    }

    public static Specification<Product> isFeatured(Boolean featured) {
        return (root, query, cb) -> {
            if (featured == null) {
                return cb.conjunction();
            }
            return cb.equal(root.get("isFeatured"), featured);
        };
    }

    public static Specification<Product> isReturnable(Boolean returnable) {
        return (root, query, cb) -> {
            if (returnable == null) {
                return cb.conjunction();
            }
            return cb.equal(root.get("isReturnable"), returnable);
        };
    }

    /**
     * Filter by discountPrice (stored field) being set or not.
     */
    public static Specification<Product> hasDiscountPrice(Boolean hasDiscountPrice) {
        return (root, query, cb) -> {
            if (hasDiscountPrice == null) {
                return cb.conjunction();
            }
            if (Boolean.TRUE.equals(hasDiscountPrice)) {
                return cb.isNotNull(root.get("discountPrice"));
            }
            return cb.isNull(root.get("discountPrice"));
        };
    }

    /**
     * Filter by computed discount amount: (mrp - price) >= minDiscount.
     * Only applies when both mrp and price exist.
     */
    public static Specification<Product> discountGte(BigDecimal minDiscount) {
        return (root, query, cb) -> {
            if (minDiscount == null) {
                return cb.conjunction();
            }

            // Force correct numeric typing for CriteriaBuilder#diff
            var mrp = root.<BigDecimal>get("mrp");
            var price = root.<BigDecimal>get("price");

            // (mrp is not null) AND (price is not null) AND (mrp - price >= minDiscount)
            return cb.and(
                    cb.isNotNull(mrp),
                    cb.isNotNull(price),
                    cb.greaterThanOrEqualTo(cb.diff(mrp, price), minDiscount)
            );
        };
    }
}
