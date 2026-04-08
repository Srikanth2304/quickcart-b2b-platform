package com.quickcart.backend.service;

import com.quickcart.backend.dto.ShipmentCreateRequest;
import com.quickcart.backend.dto.ShipmentStatusUpdateRequest;
import com.quickcart.backend.entity.*;
import com.quickcart.backend.exception.InvalidShipmentTransitionException;
import com.quickcart.backend.repository.OrderRepository;
import com.quickcart.backend.repository.ShipmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ShipmentServiceTest {

    @Mock
    private ShipmentRepository shipmentRepository;
    @Mock
    private OrderRepository orderRepository;
    @Mock
    private OrderAuditService orderAuditService;

    private ShipmentService shipmentService;

    @BeforeEach
    void setUp() {
        shipmentService = new ShipmentService(shipmentRepository, orderRepository, orderAuditService);
    }

    @Test
    void createShipmentMovesOrderToShipped() {
        User manufacturer = manufacturer(10L);
        Order order = order(100L, manufacturer, OrderStatus.ACCEPTED);

        ShipmentCreateRequest request = new ShipmentCreateRequest();
        request.setOrderId(100L);
        request.setCarrierName("DHL");
        request.setTrackingNumber("TRK-1");
        request.setTrackingUrl("http://trk");

        when(orderRepository.findByIdAndManufacturer(100L, manufacturer)).thenReturn(Optional.of(order));
        when(shipmentRepository.findByOrderId(100L)).thenReturn(Optional.empty());
        when(shipmentRepository.save(any(Shipment.class))).thenAnswer(i -> i.getArgument(0));

        var response = shipmentService.createShipment(request, manufacturer);

        assertEquals(ShipmentStatus.SHIPPED, response.getShipmentStatus());
        assertEquals(OrderStatus.SHIPPED, order.getStatus());
        assertNotNull(response.getShippedAt());
    }

    @Test
    void rejectsInvalidShipmentJump() {
        User manufacturer = manufacturer(10L);
        Order order = order(100L, manufacturer, OrderStatus.ACCEPTED);
        Shipment shipment = Shipment.builder().id(1L).order(order).shipmentStatus(ShipmentStatus.CREATED).build();

        when(shipmentRepository.findById(1L)).thenReturn(Optional.of(shipment));

        ShipmentStatusUpdateRequest request = new ShipmentStatusUpdateRequest();
        request.setStatus(ShipmentStatus.OUT_FOR_DELIVERY);

        assertThrows(InvalidShipmentTransitionException.class,
                () -> shipmentService.updateShipmentStatus(1L, request, manufacturer));
    }

    @Test
    void deliveredFromOutForDeliveryRequiresMatchingOtp() {
        User manufacturer = manufacturer(10L);
        Order order = order(100L, manufacturer, OrderStatus.SHIPPED);
        Shipment shipment = Shipment.builder().id(1L).order(order).shipmentStatus(ShipmentStatus.IN_TRANSIT).build();

        when(shipmentRepository.findById(1L)).thenReturn(Optional.of(shipment));

        ShipmentStatusUpdateRequest toOut = new ShipmentStatusUpdateRequest();
        toOut.setStatus(ShipmentStatus.OUT_FOR_DELIVERY);
        shipmentService.updateShipmentStatus(1L, toOut, manufacturer);
        assertNotNull(shipment.getDeliveryOtp());

        ShipmentStatusUpdateRequest deliver = new ShipmentStatusUpdateRequest();
        deliver.setStatus(ShipmentStatus.DELIVERED);
        deliver.setDeliveryOtp("000000");

        assertThrows(InvalidShipmentTransitionException.class,
                () -> shipmentService.updateShipmentStatus(1L, deliver, manufacturer));
    }

    private Order order(Long id, User manufacturer, OrderStatus status) {
        return Order.builder()
                .id(id)
                .status(status)
                .manufacturer(manufacturer)
                .retailer(User.builder().id(99L).roles(Set.of(Role.builder().name("RETAILER").build())).build())
                .totalAmount(BigDecimal.TEN)
                .paymentMethod(PaymentMethod.ONLINE)
                .build();
    }

    private User manufacturer(Long id) {
        return User.builder()
                .id(id)
                .roles(Set.of(Role.builder().name("MANUFACTURER").build()))
                .build();
    }
}
