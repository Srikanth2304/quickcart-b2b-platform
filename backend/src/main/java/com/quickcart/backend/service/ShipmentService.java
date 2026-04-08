package com.quickcart.backend.service;

import com.quickcart.backend.dto.ShipmentCreateRequest;
import com.quickcart.backend.dto.ShipmentDetailsResponse;
import com.quickcart.backend.dto.ShipmentStatusUpdateRequest;
import com.quickcart.backend.entity.*;
import com.quickcart.backend.exception.AccessDeniedException;
import com.quickcart.backend.exception.InvalidShipmentTransitionException;
import com.quickcart.backend.exception.ResourceNotFoundException;
import com.quickcart.backend.exception.ShipmentFailedException;
import com.quickcart.backend.repository.OrderRepository;
import com.quickcart.backend.repository.ShipmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ShipmentService {

    private static final Map<ShipmentStatus, Set<ShipmentStatus>> ALLOWED_TRANSITIONS = Map.of(
            ShipmentStatus.CREATED, Set.of(ShipmentStatus.SHIPPED),
            ShipmentStatus.SHIPPED, Set.of(ShipmentStatus.IN_TRANSIT, ShipmentStatus.DELIVERED, ShipmentStatus.FAILED),
            ShipmentStatus.IN_TRANSIT, Set.of(ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.FAILED),
            ShipmentStatus.OUT_FOR_DELIVERY, Set.of(ShipmentStatus.DELIVERED, ShipmentStatus.FAILED),
            ShipmentStatus.FAILED, Set.of(ShipmentStatus.RTO)
    );

    private final ShipmentRepository shipmentRepository;
    private final OrderRepository orderRepository;
    private final OrderAuditService orderAuditService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public ShipmentDetailsResponse createShipment(ShipmentCreateRequest request, User manufacturer) {
        Order order = orderRepository.findByIdAndManufacturer(request.getOrderId(), manufacturer)
                .orElseThrow(() -> new AccessDeniedException("Order", request.getOrderId()));

        Shipment shipment = shipmentRepository.findByOrderId(order.getId())
                .orElseGet(() -> Shipment.builder().order(order).shipmentStatus(ShipmentStatus.CREATED).build());

        shipment.setTrackingNumber(trimOrNull(request.getTrackingNumber()));
        shipment.setCarrierName(trimOrNull(request.getCarrierName()));
        shipment.setTrackingUrl(trimOrNull(request.getTrackingUrl()));
        shipment.setEstimatedDeliveryDate(request.getEstimatedDeliveryDate());

        transition(shipment, ShipmentStatus.SHIPPED, null, null, null, null);

        order.setStatus(OrderStatus.SHIPPED);
        Shipment saved = shipmentRepository.save(shipment);

        orderAuditService.recordEvent(order, OrderEventType.SHIPMENT_CREATED, OrderStatus.ACCEPTED, OrderStatus.SHIPPED, manufacturer,
                "Shipment created tracking=" + saved.getTrackingNumber());
        orderAuditService.recordEvent(order, OrderEventType.STATUS_CHANGED, OrderStatus.ACCEPTED, OrderStatus.SHIPPED, manufacturer,
                "Shipment created");
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public ShipmentDetailsResponse getShipmentByOrderId(Long orderId, User requester) {
        Order order = orderRepository.findByIdWithRelations(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));
        boolean canView = (order.getRetailer() != null && order.getRetailer().getId().equals(requester.getId()))
                || (order.getManufacturer() != null && order.getManufacturer().getId().equals(requester.getId()));
        if (!canView) {
            throw new AccessDeniedException("Order", orderId);
        }

        Shipment shipment = shipmentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment", "orderId", orderId));
        return toResponse(shipment);
    }

    @Transactional
    public ShipmentDetailsResponse updateShipmentStatus(Long shipmentId, ShipmentStatusUpdateRequest request, User manufacturer) {
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment", "id", shipmentId));
        Order order = shipment.getOrder();
        if (order == null || order.getManufacturer() == null || !order.getManufacturer().getId().equals(manufacturer.getId())) {
            throw new AccessDeniedException("Shipment", shipmentId);
        }

        transition(
                shipment,
                request.getStatus(),
                request.getFailureReason(),
                request.getDeliveryOtp(),
                request.getDeliveryConfirmedBy(),
                request.getDeliveryProofUrl()
        );

        syncOrderStatus(order, shipment.getShipmentStatus());
        orderAuditService.recordEvent(order, OrderEventType.SHIPMENT_STATUS_UPDATED, order.getStatus(), order.getStatus(), manufacturer,
                "Shipment status -> " + shipment.getShipmentStatus().name());
        if (shipment.getShipmentStatus() == ShipmentStatus.DELIVERED) {
            orderAuditService.recordEvent(order, OrderEventType.SHIPMENT_DELIVERED, OrderStatus.SHIPPED, OrderStatus.DELIVERED, manufacturer,
                    "Shipment delivered");
        }
        return toResponse(shipment);
    }

    @Transactional
    public ShipmentDetailsResponse markDelivered(Long orderId, String otp, String confirmedBy, String proofUrl, User manufacturer) {
        Shipment shipment = shipmentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment", "orderId", orderId));
        ShipmentStatusUpdateRequest request = new ShipmentStatusUpdateRequest();
        request.setStatus(ShipmentStatus.DELIVERED);
        request.setDeliveryOtp(otp);
        request.setDeliveryConfirmedBy(confirmedBy);
        request.setDeliveryProofUrl(proofUrl);
        return updateShipmentStatus(shipment.getId(), request, manufacturer);
    }

    @Transactional
    public ShipmentDetailsResponse markFailed(Long shipmentId, String failureReason, User manufacturer) {
        ShipmentStatusUpdateRequest request = new ShipmentStatusUpdateRequest();
        request.setStatus(ShipmentStatus.FAILED);
        request.setFailureReason(failureReason);
        return updateShipmentStatus(shipmentId, request, manufacturer);
    }

    private void transition(Shipment shipment,
                            ShipmentStatus to,
                            String failureReason,
                            String deliveryOtp,
                            String deliveryConfirmedBy,
                            String deliveryProofUrl) {
        ShipmentStatus from = shipment.getShipmentStatus();
        if (from != null && from != to) {
            Set<ShipmentStatus> allowed = ALLOWED_TRANSITIONS.getOrDefault(from, Set.of());
            if (!allowed.contains(to)) {
                throw new InvalidShipmentTransitionException(from.name(), to.name());
            }
        }

        if (to == ShipmentStatus.OUT_FOR_DELIVERY) {
            shipment.setDeliveryOtp(generateOtp());
        }

        if (to == ShipmentStatus.DELIVERED) {
            if (from == ShipmentStatus.OUT_FOR_DELIVERY) {
                if (shipment.getDeliveryOtp() == null || deliveryOtp == null || !shipment.getDeliveryOtp().equals(deliveryOtp.trim())) {
                    throw new InvalidShipmentTransitionException("OUT_FOR_DELIVERY", "DELIVERED (OTP mismatch)");
                }
            }
            shipment.setDeliveredAt(LocalDateTime.now());
            shipment.setDeliveryConfirmedBy(trimOrNull(deliveryConfirmedBy));
            shipment.setDeliveryProofUrl(trimOrNull(deliveryProofUrl));
        }

        if (to == ShipmentStatus.SHIPPED && shipment.getShippedAt() == null) {
            shipment.setShippedAt(LocalDateTime.now());
        }

        if (to == ShipmentStatus.FAILED) {
            String reason = trimOrNull(failureReason);
            if (reason == null) {
                throw new ShipmentFailedException("failureReason is required when shipment status is FAILED");
            }
            shipment.setFailureReason(reason);
        }

        shipment.setShipmentStatus(to);
    }

    private void syncOrderStatus(Order order, ShipmentStatus shipmentStatus) {
        if (shipmentStatus == ShipmentStatus.SHIPPED || shipmentStatus == ShipmentStatus.IN_TRANSIT
                || shipmentStatus == ShipmentStatus.OUT_FOR_DELIVERY) {
            order.setStatus(OrderStatus.SHIPPED);
            return;
        }
        if (shipmentStatus == ShipmentStatus.DELIVERED) {
            order.setStatus(OrderStatus.DELIVERED);
        }
    }

    private String generateOtp() {
        int value = 100000 + secureRandom.nextInt(900000);
        return Integer.toString(value);
    }

    private String trimOrNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private ShipmentDetailsResponse toResponse(Shipment shipment) {
        return ShipmentDetailsResponse.builder()
                .id(shipment.getId())
                .orderId(shipment.getOrder() == null ? null : shipment.getOrder().getId())
                .trackingNumber(shipment.getTrackingNumber())
                .carrierName(shipment.getCarrierName())
                .trackingUrl(shipment.getTrackingUrl())
                .shipmentStatus(shipment.getShipmentStatus())
                .shippedAt(shipment.getShippedAt())
                .estimatedDeliveryDate(shipment.getEstimatedDeliveryDate())
                .deliveredAt(shipment.getDeliveredAt())
                .failureReason(shipment.getFailureReason())
                .deliveryConfirmedBy(shipment.getDeliveryConfirmedBy())
                .deliveryProofUrl(shipment.getDeliveryProofUrl())
                .build();
    }
}
