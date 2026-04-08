package com.quickcart.backend.repository;

import com.quickcart.backend.entity.InventoryReservation;
import com.quickcart.backend.entity.InventoryReservationStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface InventoryReservationRepository extends JpaRepository<InventoryReservation, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM InventoryReservation r WHERE r.id = :id")
    Optional<InventoryReservation> findByIdForUpdate(@Param("id") Long id);

    @Query("""
            SELECT COALESCE(SUM(r.reservedQuantity), 0)
            FROM InventoryReservation r
            WHERE r.status = com.quickcart.backend.entity.InventoryReservationStatus.ACTIVE
              AND r.reservationExpiryTime > :now
              AND r.product.id = :productId
              AND r.variant IS NULL
            """)
    long sumActiveReservedForProduct(@Param("productId") Long productId, @Param("now") LocalDateTime now);

    @Query("""
            SELECT COALESCE(SUM(r.reservedQuantity), 0)
            FROM InventoryReservation r
            WHERE r.status = com.quickcart.backend.entity.InventoryReservationStatus.ACTIVE
              AND r.reservationExpiryTime > :now
              AND r.variant.id = :variantId
            """)
    long sumActiveReservedForVariant(@Param("variantId") Long variantId, @Param("now") LocalDateTime now);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT r
            FROM InventoryReservation r
            WHERE r.status = com.quickcart.backend.entity.InventoryReservationStatus.ACTIVE
              AND r.reservationExpiryTime > :now
              AND r.user.id = :userId
              AND r.product.id = :productId
              AND ((:variantId IS NULL AND r.variant IS NULL) OR (r.variant.id = :variantId))
            ORDER BY r.reservationExpiryTime ASC, r.id ASC
            """)
    List<InventoryReservation> findActiveForUserAndItemForUpdate(
            @Param("userId") Long userId,
            @Param("productId") Long productId,
            @Param("variantId") Long variantId,
            @Param("now") LocalDateTime now
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT r
            FROM InventoryReservation r
            WHERE r.status = com.quickcart.backend.entity.InventoryReservationStatus.ACTIVE
              AND r.reservationExpiryTime <= :now
            """)
    List<InventoryReservation> findExpiredActiveReservationsForUpdate(@Param("now") LocalDateTime now);

    List<InventoryReservation> findByUserIdAndStatusOrderByCreatedAtDesc(Long userId, InventoryReservationStatus status);
}
