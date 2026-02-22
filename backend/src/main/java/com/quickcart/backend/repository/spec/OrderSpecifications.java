package com.quickcart.backend.repository.spec;

import com.quickcart.backend.entity.Order;
import com.quickcart.backend.entity.OrderItem;
import com.quickcart.backend.entity.OrderStatus;
import com.quickcart.backend.entity.Product;
import com.quickcart.backend.entity.User;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

/**
 * JPA Specifications for server-side filtering, searching, and role scoping of Orders.
 *
 * All predicates are designed to work on the ID-projection query (no fetch joins)
 * so that pagination counts remain correct.
 *
 * Search uses EXISTS subqueries instead of JOINs to avoid DISTINCT,
 * which PostgreSQL rejects when ORDER BY columns are not in the SELECT list.
 */
public final class OrderSpecifications {

    private OrderSpecifications() {}

    // ── Role-based ownership ────────────────────────────────────────────

    public static Specification<Order> belongsToUser(User user) {
        return (root, query, cb) -> {
            if (user.hasRole("MANUFACTURER")) {
                return cb.equal(root.get("manufacturer").get("id"), user.getId());
            }
            return cb.equal(root.get("retailer").get("id"), user.getId());
        };
    }

    // ── Status filter ───────────────────────────────────────────────────

    public static Specification<Order> hasStatusIn(List<OrderStatus> statuses) {
        return (root, query, cb) -> {
            if (statuses == null || statuses.isEmpty()) {
                return cb.conjunction();
            }
            return root.get("status").in(statuses);
        };
    }

    // ── Search (case-insensitive, partial match) ────────────────────────

    /**
     * Searches across:
     *   - order id (cast to string)
     *   - product name (via EXISTS subquery on order_items → products)
     *   - retailer name (implicit join, no duplicates)
     *   - manufacturer name (implicit join, no duplicates)
     *
     * Uses an EXISTS subquery for the product-name search to avoid JOINs
     * that would produce duplicate order rows and require DISTINCT.
     * PostgreSQL rejects SELECT DISTINCT with ORDER BY columns not in the select list,
     * so avoiding DISTINCT entirely is critical.
     */
    public static Specification<Order> search(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.isBlank()) {
                return cb.conjunction();
            }

            String pattern = "%" + keyword.trim().toLowerCase() + "%";

            List<Predicate> orPredicates = new ArrayList<>();

            // 1) Order ID as string
            orPredicates.add(cb.like(
                    cb.toString(root.get("id")),
                    pattern
            ));

            // 2) Product name — EXISTS subquery (no join on root, no duplicates)
            Subquery<Long> productSubquery = query.subquery(Long.class);
            Root<OrderItem> itemRoot = productSubquery.from(OrderItem.class);
            Join<OrderItem, Product> productJoin = itemRoot.join("product", JoinType.INNER);
            productSubquery.select(cb.literal(1L));
            productSubquery.where(
                    cb.equal(itemRoot.get("order").get("id"), root.get("id")),
                    cb.like(cb.lower(productJoin.get("name")), pattern)
            );
            orPredicates.add(cb.exists(productSubquery));

            // 3) Retailer name — implicit join (ManyToOne, no duplicates)
            orPredicates.add(cb.like(
                    cb.lower(root.get("retailer").get("name")),
                    pattern
            ));

            // 4) Manufacturer name — implicit join (ManyToOne, no duplicates)
            orPredicates.add(cb.like(
                    cb.lower(root.get("manufacturer").get("name")),
                    pattern
            ));

            return cb.or(orPredicates.toArray(new Predicate[0]));
        };
    }

    // ── Convenience: combine all filters into one specification ─────────

    /**
     * Builds a single composite specification from all optional filters.
     *
     * @param user      authenticated user (required – scopes by role)
     * @param statuses  resolved status list (nullable)
     * @param keyword   search keyword (nullable)
     */
    public static Specification<Order> buildSpec(User user,
                                                  List<OrderStatus> statuses,
                                                  String keyword) {
        Specification<Order> spec = Specification.where(belongsToUser(user));

        if (statuses != null && !statuses.isEmpty()) {
            spec = spec.and(hasStatusIn(statuses));
        }

        if (keyword != null && !keyword.isBlank()) {
            spec = spec.and(search(keyword));
        }

        return spec;
    }
}
