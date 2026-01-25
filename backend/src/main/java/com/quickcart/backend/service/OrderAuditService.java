package com.quickcart.backend.service;

import com.quickcart.backend.dto.OrderEventResponse;
import com.quickcart.backend.entity.*;
import com.quickcart.backend.exception.AccessDeniedException;
import com.quickcart.backend.exception.ResourceNotFoundException;
import com.quickcart.backend.repository.OrderEventRepository;
import com.quickcart.backend.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderAuditService {

    private final OrderEventRepository orderEventRepository;
    private final OrderRepository orderRepository;

    @Transactional
    public void recordEvent(Order order,
                            OrderEventType eventType,
                            OrderStatus fromStatus,
                            OrderStatus toStatus,
                            User actor,
                            String note) {
        OrderEvent event = OrderEvent.builder()
                .order(order)
                .eventType(eventType)
                .fromStatus(fromStatus)
                .toStatus(toStatus)
                .actor(actor)
                .note(note)
                .build();
        orderEventRepository.save(event);
    }

    @Transactional(readOnly = true)
    public List<OrderEventResponse> getOrderEvents(Long orderId, User requester) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        boolean canView = order.getRetailer().getId().equals(requester.getId())
                || order.getManufacturer().getId().equals(requester.getId());

        if (!canView) {
            throw new AccessDeniedException("Order", orderId);
        }

        return orderEventRepository.findByOrderIdOrderByCreatedAtAsc(orderId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    private OrderEventResponse mapToResponse(OrderEvent event) {
        return OrderEventResponse.builder()
                .id(event.getId())
                .orderId(event.getOrder().getId())
                .eventType(event.getEventType())
                .fromStatus(event.getFromStatus())
                .toStatus(event.getToStatus())
                .actorUserId(event.getActor() == null ? null : event.getActor().getId())
                .actorName(event.getActor() == null ? null : event.getActor().getName())
                .note(event.getNote())
                .createdAt(event.getCreatedAt())
                .build();
    }
}
