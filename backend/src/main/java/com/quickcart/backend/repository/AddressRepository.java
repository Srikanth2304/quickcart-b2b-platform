package com.quickcart.backend.repository;

import com.quickcart.backend.entity.Address;
import com.quickcart.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AddressRepository extends JpaRepository<Address, Long> {

    List<Address> findByUserAndIsActiveTrueOrderByIdDesc(User user);

    Optional<Address> findByIdAndUserAndIsActiveTrue(Long id, User user);

    List<Address> findByUserAndIsDefaultTrueAndIsActiveTrue(User user);

    boolean existsByUserAndIsDefaultTrueAndIsActiveTrue(User user);

    boolean existsByUserAndIsActiveTrue(User user);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Address a set a.isDefault = false where a.user = :user and a.isActive = true and a.isDefault = true")
    int unsetDefaultForUser(@Param("user") User user);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Address a set a.isDefault = true where a.id = :addressId and a.user = :user and a.isActive = true")
    int setDefaultForUser(@Param("addressId") Long addressId, @Param("user") User user);

    Optional<Address> findFirstByUserAndIsActiveTrueOrderByIdDesc(User user);
}
