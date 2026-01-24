package com.quickcart.backend.repository;

import com.quickcart.backend.dto.ProductFacetsResponse;
import com.quickcart.backend.entity.Category;
import com.quickcart.backend.entity.Product;
import com.quickcart.backend.entity.User;
import com.quickcart.backend.repository.spec.ProductSpecifications;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Tuple;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class ProductFacetRepositoryImpl implements ProductFacetRepository {

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public List<ProductFacetsResponse.CategoryFacet> getCategoryFacets(
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
        // For category facets we intentionally DO NOT apply the category filter itself.
        Specification<Product> spec = Specification
                .where(ProductSpecifications.visibleToUser(user))
                .and(ProductSpecifications.hasBrand(brand))
                .and(ProductSpecifications.priceGte(minPrice))
                .and(ProductSpecifications.priceLte(maxPrice))
                .and(ProductSpecifications.ratingGte(rating))
                .and(ProductSpecifications.inStock(inStock))
                .and(ProductSpecifications.isFeatured(featured))
                .and(ProductSpecifications.isReturnable(returnable))
                .and(ProductSpecifications.hasDiscountPrice(hasDiscountPrice))
                .and(ProductSpecifications.discountGte(minDiscount));

        var cb = entityManager.getCriteriaBuilder();
        var query = cb.createTupleQuery();
        var root = query.from(Product.class);

        Join<Product, Category> categoryJoin = root.join("category");

        Expression<Long> categoryId = categoryJoin.get("id");
        Expression<String> categoryName = categoryJoin.get("name");
        Expression<String> categorySlug = categoryJoin.get("slug");
        Expression<Long> countDistinctProducts = cb.countDistinct(root.get("id"));

        query.multiselect(
                categoryId.alias("id"),
                categoryName.alias("name"),
                categorySlug.alias("slug"),
                countDistinctProducts.alias("count")
        );

        Predicate predicate = spec.toPredicate(root, query, cb);
        if (predicate != null) {
            query.where(predicate);
        }

        query.groupBy(categoryId, categoryName, categorySlug);
        query.orderBy(cb.asc(categoryName));

        List<Tuple> rows = entityManager.createQuery(query).getResultList();
        return rows.stream()
                .map(t -> ProductFacetsResponse.CategoryFacet.builder()
                        .id(t.get("id", Long.class))
                        .name(t.get("name", String.class))
                        .slug(t.get("slug", String.class))
                        .count(t.get("count", Long.class))
                        .build())
                .toList();
    }

    @Override
    public List<ProductFacetsResponse.BrandFacet> getBrandFacets(
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
        // For brand facets we intentionally DO NOT apply the brand filter itself.
        Specification<Product> spec = Specification
                .where(ProductSpecifications.visibleToUser(user))
                .and(ProductSpecifications.hasCategorySlugs(category))
                .and(ProductSpecifications.priceGte(minPrice))
                .and(ProductSpecifications.priceLte(maxPrice))
                .and(ProductSpecifications.ratingGte(rating))
                .and(ProductSpecifications.inStock(inStock))
                .and(ProductSpecifications.isFeatured(featured))
                .and(ProductSpecifications.isReturnable(returnable))
                .and(ProductSpecifications.hasDiscountPrice(hasDiscountPrice))
                .and(ProductSpecifications.discountGte(minDiscount));

        var cb = entityManager.getCriteriaBuilder();
        var query = cb.createTupleQuery();
        var root = query.from(Product.class);

        // normalize brand display: use the stored value, but group by lower() to merge casing differences.
        Expression<String> brandValue = root.get("brand");
        Expression<String> brandKey = cb.lower(root.get("brand"));
        Expression<Long> countDistinctProducts = cb.countDistinct(root.get("id"));

        query.multiselect(
                brandValue.alias("value"),
                brandKey.alias("key"),
                countDistinctProducts.alias("count")
        );

        Predicate predicate = spec.toPredicate(root, query, cb);
        if (predicate != null) {
            query.where(predicate);
        }

        // omit null/blank brands from facets
        Predicate brandNotNull = cb.isNotNull(root.get("brand"));
        Predicate brandNotBlank = cb.notEqual(cb.trim(cb.literal(' '), root.get("brand")), "");
        query.where(predicate == null ? cb.and(brandNotNull, brandNotBlank) : cb.and(predicate, brandNotNull, brandNotBlank));

        query.groupBy(brandKey, brandValue);
        query.orderBy(cb.asc(brandKey));

        List<Tuple> rows = entityManager.createQuery(query).getResultList();

        // Merge same lower-cased brands but potentially different original casing by summing counts.
        // Since we group by both key and value, duplicates are less likely; but we keep it simple by choosing first value per key.
        return rows.stream()
                .collect(java.util.stream.Collectors.groupingBy(t -> t.get("key", String.class)))
                .values().stream()
                .map(group -> {
                    Tuple first = group.getFirst();
                    long sum = group.stream().mapToLong(t -> t.get("count", Long.class)).sum();
                    return ProductFacetsResponse.BrandFacet.builder()
                            .value(first.get("value", String.class))
                            .count(sum)
                            .build();
                })
                .sorted(java.util.Comparator.comparing(ProductFacetsResponse.BrandFacet::getValue, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }
}

