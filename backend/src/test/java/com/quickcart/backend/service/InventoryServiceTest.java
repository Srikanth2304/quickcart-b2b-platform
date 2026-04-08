package com.quickcart.backend.service;

import com.quickcart.backend.dto.CartReserveRequest;
import com.quickcart.backend.dto.LowStockInventoryResponse;
import com.quickcart.backend.dto.OrderItemRequest;
import com.quickcart.backend.entity.*;
import com.quickcart.backend.exception.OutOfStockException;
import com.quickcart.backend.repository.InventoryReservationRepository;
import com.quickcart.backend.repository.ProductRepository;
import com.quickcart.backend.repository.ProductVariantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InventoryServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ProductVariantRepository productVariantRepository;

    @Mock
    private InventoryReservationRepository inventoryReservationRepository;

    private InventoryService inventoryService;

    @BeforeEach
    void setUp() {
        inventoryService = new InventoryService(productRepository, productVariantRepository, inventoryReservationRepository);
    }

    @Test
    void reducesProductStockWhenNoVariants() {
        User user = retailer(1L);
        Product product = product(10L, "MOB-SAM-0001", 10, 2);

        OrderItemRequest request = new OrderItemRequest();
        request.setProductId(10L);
        request.setQuantity(3);

        when(productRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(product));
        when(inventoryReservationRepository.sumActiveReservedForProduct(eq(10L), any(LocalDateTime.class))).thenReturn(0L);
        when(inventoryReservationRepository.findActiveForUserAndItemForUpdate(eq(1L), eq(10L), isNull(), any(LocalDateTime.class)))
                .thenReturn(List.of());

        Product resolved = inventoryService.resolveForOrderAndReduceStock(request, user);

        assertEquals(7, resolved.getStock());
        assertEquals(7, product.getStock());
    }

    @Test
    void reducesVariantStockAndSyncsProductStock() {
        User user = retailer(1L);
        Product product = product(10L, "MOB-SAM-0001", 99, 5);
        ProductVariant variant = variant(20L, product, "MOB-SAM-0001-STO128-01", 8);
        product.setVariants(List.of(variant));

        OrderItemRequest request = new OrderItemRequest();
        request.setProductId(10L);
        request.setVariantId(20L);
        request.setQuantity(3);

        when(productRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(product));
        when(productVariantRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(variant));
        when(inventoryReservationRepository.sumActiveReservedForVariant(eq(20L), any(LocalDateTime.class))).thenReturn(0L);
        when(inventoryReservationRepository.findActiveForUserAndItemForUpdate(eq(1L), eq(10L), eq(20L), any(LocalDateTime.class)))
                .thenReturn(List.of());
        when(productVariantRepository.findByProductIdOrderByIdAsc(10L)).thenReturn(List.of(variant));

        Product resolved = inventoryService.resolveForOrderAndReduceStock(request, user);

        assertEquals(5, variant.getStock());
        assertEquals(5, resolved.getStock());
    }

    @Test
    void detectsLowStockProductsAndVariants() {
        Product lowProduct = product(10L, "MOB-SAM-0001", 2, 5);
        Product parent = product(11L, "TV-LG-0001", 10, 4);
        ProductVariant lowVariant = variant(30L, parent, "TV-LG-0001-COLBLA-01", 1);

        when(productRepository.findByStockLessThanLowStockThreshold(any())).thenReturn(new PageImpl<>(List.of(lowProduct)));
        when(productVariantRepository.findLowStockVariants(any())).thenReturn(new PageImpl<>(List.of(lowVariant)));

        LowStockInventoryResponse response = inventoryService.getLowStockProducts(PageRequest.of(0, 20));

        assertEquals(1, response.getProducts().getContent().size());
        assertEquals(1, response.getVariants().getContent().size());
        assertEquals("MOB-SAM-0001", response.getProducts().getContent().getFirst().getSku());
        assertEquals("TV-LG-0001-COLBLA-01", response.getVariants().getContent().getFirst().getSku());
    }

    @Test
    void expiresActiveReservations() {
        InventoryReservation reservation = InventoryReservation.builder()
                .id(99L)
                .reservedQuantity(2)
                .reservationExpiryTime(LocalDateTime.now().minusMinutes(1))
                .status(InventoryReservationStatus.ACTIVE)
                .build();

        when(inventoryReservationRepository.findExpiredActiveReservationsForUpdate(any(LocalDateTime.class)))
                .thenReturn(List.of(reservation));

        inventoryService.expireReservations();

        assertEquals(InventoryReservationStatus.EXPIRED, reservation.getStatus());
    }

    @Test
    void preventsOversellWhenReservationsConsumeStock() {
        User user = retailer(1L);
        Product product = product(10L, "MOB-SAM-0001", 5, 2);

        OrderItemRequest request = new OrderItemRequest();
        request.setProductId(10L);
        request.setQuantity(2);

        when(productRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(product));
        when(inventoryReservationRepository.sumActiveReservedForProduct(eq(10L), any(LocalDateTime.class))).thenReturn(4L);
        when(inventoryReservationRepository.findActiveForUserAndItemForUpdate(eq(1L), eq(10L), isNull(), any(LocalDateTime.class)))
                .thenReturn(List.of());

        assertThrows(OutOfStockException.class, () -> inventoryService.resolveForOrderAndReduceStock(request, user));
    }

    @Test
    void reserveRejectsNonPositiveQuantity() {
        CartReserveRequest request = new CartReserveRequest();
        request.setProductId(10L);
        request.setQuantity(0);

        assertThrows(IllegalArgumentException.class, () -> inventoryService.reserveForCart(request, retailer(1L)));
    }

    private Product product(Long id, String sku, int stock, int threshold) {
        return Product.builder()
                .id(id)
                .name("Test")
                .price(BigDecimal.TEN)
                .stock(stock)
                .lowStockThreshold(threshold)
                .status(ProductStatus.ACTIVE)
                .sku(sku)
                .build();
    }

    private ProductVariant variant(Long id, Product product, String sku, int stock) {
        return ProductVariant.builder()
                .id(id)
                .product(product)
                .variantName("Storage")
                .variantValue("128GB")
                .price(BigDecimal.valueOf(100))
                .stock(stock)
                .sku(sku)
                .build();
    }

    private User retailer(Long id) {
        Role role = Role.builder().id(1L).name("RETAILER").build();
        return User.builder()
                .id(id)
                .name("Retailer")
                .email("r@quickcart.com")
                .password("x")
                .roles(Set.of(role))
                .build();
    }
}

