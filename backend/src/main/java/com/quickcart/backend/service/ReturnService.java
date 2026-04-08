package com.quickcart.backend.service;

import com.quickcart.backend.dto.CreateReturnRequest;
import com.quickcart.backend.dto.ReturnRequestResponse;
import com.quickcart.backend.entity.*;
import com.quickcart.backend.exception.AccessDeniedException;
import com.quickcart.backend.exception.InvalidReturnStateException;
import com.quickcart.backend.exception.ResourceNotFoundException;
import com.quickcart.backend.repository.OrderItemRepository;
import com.quickcart.backend.repository.OrderRepository;
import com.quickcart.backend.repository.RefundRepository;
import com.quickcart.backend.repository.ReturnRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ReturnService {

    private final ReturnRequestRepository returnRequestRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final InventoryService inventoryService;
    private final PaymentService paymentService;
    private final RefundRepository refundRepository;
    private final OrderAuditService orderAuditService;

    @Transactional
    public ReturnRequestResponse requestReturn(CreateReturnRequest request, User retailer) {
        Order order = orderRepository.findByIdWithRelations(request.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", request.getOrderId()));

        if (order.getRetailer() == null || !order.getRetailer().getId().equals(retailer.getId())) {
            throw new AccessDeniedException("Order", order.getId());
        }
        if (order.getStatus() != OrderStatus.DELIVERED) {
            throw new InvalidReturnStateException("Returns are allowed only for delivered orders");
        }

        OrderItem item = orderItemRepository.findById(request.getOrderItemId())
                .orElseThrow(() -> new ResourceNotFoundException("OrderItem", "id", request.getOrderItemId()));
        if (item.getOrder() == null || !item.getOrder().getId().equals(order.getId())) {
            throw new InvalidReturnStateException("Order item does not belong to the specified order");
        }

        int qty = request.getQuantity() == null ? 1 : request.getQuantity();
        if (qty <= 0 || qty > item.getQuantity()) {
            throw new InvalidReturnStateException("Return quantity must be between 1 and ordered quantity");
        }

        ReturnRequest saved = returnRequestRepository.save(ReturnRequest.builder()
                .order(order)
                .orderItem(item)
                .reason(trimOrNull(request.getReason()))
                .returnStatus(ReturnStatus.REQUESTED)
                .requestedAt(LocalDateTime.now())
                .inspectionStatus(ReturnInspectionStatus.PENDING)
                .refundStatus(ReturnRefundStatus.PENDING)
                .quantity(qty)
                .build());

        orderAuditService.recordEvent(order, OrderEventType.RETURN_REQUESTED, order.getStatus(), order.getStatus(), retailer,
                "Return requested for orderItem=" + item.getId() + " qty=" + qty);

        return toResponse(saved);
    }

    @Transactional
    public ReturnRequestResponse approveReturn(Long returnId, User manufacturer, String note) {
        ReturnRequest rr = getOwnedReturn(returnId, manufacturer);
        ensureStatus(rr, ReturnStatus.REQUESTED, "Only REQUESTED return can be approved");

        rr.setReturnStatus(ReturnStatus.APPROVED);
        rr.setApprovedAt(LocalDateTime.now());
        if (trimOrNull(note) != null) {
            rr.setRejectionReason(null);
        }

        orderAuditService.recordEvent(rr.getOrder(), OrderEventType.RETURN_APPROVED,
                rr.getOrder().getStatus(), rr.getOrder().getStatus(), manufacturer, "Return approved");
        return toResponse(rr);
    }

    @Transactional
    public ReturnRequestResponse rejectReturn(Long returnId, User manufacturer, String note) {
        ReturnRequest rr = getOwnedReturn(returnId, manufacturer);
        ensureStatus(rr, ReturnStatus.REQUESTED, "Only REQUESTED return can be rejected");

        rr.setReturnStatus(ReturnStatus.REJECTED);
        rr.setRejectionReason(trimOrNull(note));

        orderAuditService.recordEvent(rr.getOrder(), OrderEventType.RETURN_REJECTED,
                rr.getOrder().getStatus(), rr.getOrder().getStatus(), manufacturer, "Return rejected");
        return toResponse(rr);
    }

    @Transactional
    public ReturnRequestResponse receiveReturn(Long returnId, User manufacturer) {
        ReturnRequest rr = getOwnedReturn(returnId, manufacturer);
        if (rr.getReturnStatus() != ReturnStatus.APPROVED && rr.getReturnStatus() != ReturnStatus.PICKED_UP
                && rr.getReturnStatus() != ReturnStatus.PICKUP_SCHEDULED) {
            throw new InvalidReturnStateException("Return must be approved before receiving");
        }

        rr.setReturnStatus(ReturnStatus.RECEIVED);
        rr.setReceivedAt(LocalDateTime.now());
        return toResponse(rr);
    }

    @Transactional
    public ReturnRequestResponse inspectReturn(Long returnId, ReturnInspectionStatus inspectionStatus, User manufacturer) {
        ReturnRequest rr = getOwnedReturn(returnId, manufacturer);
        ensureStatus(rr, ReturnStatus.RECEIVED, "Return must be RECEIVED before inspection");
        rr.setInspectionStatus(inspectionStatus);
        rr.setReturnStatus(ReturnStatus.INSPECTED);
        return toResponse(rr);
    }

    @Transactional
    public ReturnRequestResponse completeReturn(Long returnId, User manufacturer) {
        ReturnRequest rr = getOwnedReturn(returnId, manufacturer);
        ensureStatus(rr, ReturnStatus.INSPECTED, "Return must be INSPECTED before completion");
        if (rr.getReceivedAt() == null) {
            throw new InvalidReturnStateException("Return must be RECEIVED before stock restoration");
        }
        if (rr.getInspectionStatus() != ReturnInspectionStatus.PASSED) {
            throw new InvalidReturnStateException("Only PASSED inspection can be completed");
        }
        if (rr.getCompletedAt() != null || rr.getReturnStatus() == ReturnStatus.COMPLETED) {
            throw new InvalidReturnStateException("Return already completed");
        }

        inventoryService.restockForReturn(rr.getOrderItem(), rr.getQuantity());
        orderAuditService.recordEvent(rr.getOrder(), OrderEventType.STOCK_RESTORED,
                rr.getOrder().getStatus(), rr.getOrder().getStatus(), manufacturer,
                "Stock restored for return id=" + rr.getId());

        rr.setReturnStatus(ReturnStatus.COMPLETED);
        rr.setCompletedAt(LocalDateTime.now());

        if (rr.getOrder().getPaymentMethod() == PaymentMethod.CASH_ON_DELIVERY) {
            rr.setRefundStatus(ReturnRefundStatus.NOT_REQUIRED);
        } else {
            rr.setRefundStatus(ReturnRefundStatus.PROCESSING);
            Payment payment = paymentService.refundPayment(rr.getOrder(), "Return completed id=" + rr.getId());

            Refund refund = refundRepository.findByOrderId(rr.getOrder().getId()).orElseGet(() -> Refund.builder()
                    .order(rr.getOrder())
                    .payment(payment)
                    .gateway(payment.getGateway() == null ? null : payment.getGateway().name())
                    .initiatedBy(RefundInitiatedBy.SYSTEM)
                    .status(RefundStatus.PROCESSING)
                    .reason("Return completed")
                    .approvedAt(LocalDateTime.now())
                    .build());
            refund.setStatus(RefundStatus.PROCESSING);
            refund.setApprovedAt(LocalDateTime.now());
            refundRepository.save(refund);

            orderAuditService.recordEvent(rr.getOrder(), OrderEventType.REFUND_TRIGGERED,
                    rr.getOrder().getStatus(), rr.getOrder().getStatus(), manufacturer,
                    "Refund triggered from completed return id=" + rr.getId());
        }

        orderAuditService.recordEvent(rr.getOrder(), OrderEventType.RETURN_COMPLETED,
                rr.getOrder().getStatus(), rr.getOrder().getStatus(), manufacturer,
                "Return completed id=" + rr.getId());
        return toResponse(rr);
    }

    @Transactional(readOnly = true)
    public ReturnRequestResponse getReturn(Long returnId, User requester) {
        ReturnRequest rr = returnRequestRepository.findById(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("ReturnRequest", "id", returnId));
        Long requesterId = requester.getId();
        boolean canView = (rr.getOrder().getRetailer() != null && rr.getOrder().getRetailer().getId().equals(requesterId))
                || (rr.getOrder().getManufacturer() != null && rr.getOrder().getManufacturer().getId().equals(requesterId));
        if (!canView) {
            throw new AccessDeniedException("ReturnRequest", returnId);
        }
        return toResponse(rr);
    }

    private ReturnRequest getOwnedReturn(Long returnId, User manufacturer) {
        ReturnRequest rr = returnRequestRepository.findById(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("ReturnRequest", "id", returnId));
        if (rr.getOrder() == null || rr.getOrder().getManufacturer() == null
                || !rr.getOrder().getManufacturer().getId().equals(manufacturer.getId())) {
            throw new AccessDeniedException("ReturnRequest", returnId);
        }
        return rr;
    }

    private void ensureStatus(ReturnRequest rr, ReturnStatus expected, String message) {
        if (rr.getReturnStatus() != expected) {
            throw new InvalidReturnStateException(message + ". Current=" + rr.getReturnStatus());
        }
    }

    private String trimOrNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private ReturnRequestResponse toResponse(ReturnRequest rr) {
        return ReturnRequestResponse.builder()
                .id(rr.getId())
                .orderId(rr.getOrder() == null ? null : rr.getOrder().getId())
                .orderItemId(rr.getOrderItem() == null ? null : rr.getOrderItem().getId())
                .quantity(rr.getQuantity())
                .reason(rr.getReason())
                .returnStatus(rr.getReturnStatus())
                .requestedAt(rr.getRequestedAt())
                .approvedAt(rr.getApprovedAt())
                .receivedAt(rr.getReceivedAt())
                .completedAt(rr.getCompletedAt())
                .inspectionStatus(rr.getInspectionStatus())
                .refundStatus(rr.getRefundStatus())
                .rejectionReason(rr.getRejectionReason())
                .build();
    }
}
