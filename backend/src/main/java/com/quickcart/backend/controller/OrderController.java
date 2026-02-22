package com.quickcart.backend.controller;

import com.quickcart.backend.dto.CancelOrderRequest;
import com.quickcart.backend.dto.CreateShipmentRequest;
import com.quickcart.backend.dto.InvoiceResponse;
import com.quickcart.backend.dto.OrderCreatedResponse;
import com.quickcart.backend.dto.OrderEventResponse;
import com.quickcart.backend.dto.OrderResponse;
import com.quickcart.backend.dto.OrderSummaryResponse;
import com.quickcart.backend.dto.PlaceOrderRequest;
import com.quickcart.backend.dto.RejectOrderRequest;
import com.quickcart.backend.dto.RefundDecisionRequest;
import com.quickcart.backend.dto.RefundResponse;
import com.quickcart.backend.dto.UpdateOrderStatusRequest;
import com.quickcart.backend.security.CustomUserDetails;
import com.quickcart.backend.service.IdempotencyService;
import com.quickcart.backend.service.InvoiceService;
import com.quickcart.backend.service.OrderAuditService;
import com.quickcart.backend.service.OrderQueryService;
import com.quickcart.backend.service.OrderService;
import com.quickcart.backend.service.RefundService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final OrderQueryService orderQueryService;
    private final OrderAuditService orderAuditService;
    private final InvoiceService invoiceService;
    private final RefundService refundService;
    private final IdempotencyService idempotencyService;

    @PostMapping
    @PreAuthorize("hasRole('RETAILER')")
    public ResponseEntity<OrderCreatedResponse> placeOrder(
            @Valid @RequestBody PlaceOrderRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return idempotencyService.executeIdempotent(
                idempotencyKey,
                "POST /orders",
                OrderCreatedResponse.class,
                () -> {
                    var saved = orderService.placeOrder(request, currentUser.getUser());
                    return ResponseEntity.status(HttpStatus.CREATED)
                            .body(OrderCreatedResponse.builder()
                                    .orderId(saved.getId())
                                    .status(saved.getStatus().name())
                                    .paymentMethod(saved.getPaymentMethod().name())
                                    .totalAmount(saved.getTotalAmount())
                                    .build());
                }
        );
    }

    /**
     * ✅ ORDER SUMMARY COUNTS (single DB round trip)
     * Returns aggregated counts: total, active, delivered, cancelled.
     */
    @GetMapping("/summary")
    public ResponseEntity<OrderSummaryResponse> getOrderSummary(
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(
                orderQueryService.getOrderSummary(currentUser.getUser())
        );
    }

    /**
     * ✅ PAGINATED ORDERS (with optional status filtering, search, and sorting)
     *
     * GET /orders?page=0&size=10&status=ACTIVE&search=keyword&sort=createdAt,desc
     */
    @GetMapping
    public ResponseEntity<Page<OrderResponse>> getOrders(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            Pageable pageable
    ) {
        return ResponseEntity.ok(
                orderQueryService.getOrders(
                        currentUser.getUser(),
                        status,
                        search,
                        pageable
                )
        );
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<OrderResponse> getOrderById(
            @PathVariable Long orderId,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(
                orderQueryService.getOrderById(orderId, currentUser.getUser())
        );
    }

    @GetMapping("/{orderId}/invoice")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<InvoiceResponse> getInvoiceForOrder(
            @PathVariable Long orderId,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(invoiceService.getInvoiceForOrder(orderId, currentUser.getUser()));
    }

    @PostMapping("/{orderId}/accept")
    @PreAuthorize("hasRole('MANUFACTURER')")
    public ResponseEntity<String> acceptOrder(
            @PathVariable Long orderId,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        orderService.acceptOrder(orderId, currentUser.getUser());
        return ResponseEntity.ok("Order accepted");
    }

    @PostMapping("/{orderId}/reject")
    @PreAuthorize("hasRole('MANUFACTURER')")
    public ResponseEntity<String> rejectOrder(
            @PathVariable Long orderId,
            @Valid @RequestBody(required = false) RejectOrderRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        String reason = request == null ? null : request.getReason();
        orderService.rejectOrder(orderId, reason, currentUser.getUser());
        return ResponseEntity.ok("Order rejected");
    }

    @GetMapping("/{orderId}/events")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<OrderEventResponse>> getOrderEvents(
            @PathVariable Long orderId,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(orderAuditService.getOrderEvents(orderId, currentUser.getUser()));
    }

    @PutMapping("/{orderId}/status")
    @PreAuthorize("hasRole('MANUFACTURER')")
    public ResponseEntity<String> updateOrderStatus(
            @PathVariable Long orderId,
            @Valid @RequestBody UpdateOrderStatusRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        orderService.updateOrderStatus(
                orderId,
                request.getStatus(),
                currentUser.getUser()
        );
        return ResponseEntity.ok("Order status updated successfully");
    }

    @PostMapping("/{orderId}/shipment")
    @PreAuthorize("hasRole('MANUFACTURER')")
    public ResponseEntity<String> createShipment(
            @PathVariable Long orderId,
            @Valid @RequestBody(required = false) CreateShipmentRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        orderService.createShipment(
                orderId,
                request == null ? null : request.getCarrier(),
                request == null ? null : request.getTrackingNumber(),
                request == null ? null : request.getTrackingUrl(),
                currentUser.getUser()
        );
        return ResponseEntity.ok("Shipment created");
    }

    @PostMapping("/{orderId}/deliver")
    @PreAuthorize("hasRole('MANUFACTURER')")
    public ResponseEntity<String> markDelivered(
            @PathVariable Long orderId,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        orderService.markDelivered(orderId, currentUser.getUser());
        return ResponseEntity.ok("Order marked as delivered");
    }

    @PostMapping("/{orderId}/cancel")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<String> cancelOrder(
            @PathVariable Long orderId,
            @Valid @RequestBody(required = false) CancelOrderRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return idempotencyService.executeIdempotent(
                idempotencyKey,
                "POST /orders/" + orderId + "/cancel",
                String.class,
                () -> {
                    String reason = request == null ? null : request.getReason();
                    orderService.cancelOrder(orderId, reason, currentUser.getUser());
                    return ResponseEntity.ok("Order cancelled");
                }
        );
    }

    @PostMapping("/{orderId}/refund/approve")
    @PreAuthorize("hasRole('MANUFACTURER')")
    public ResponseEntity<String> approveRefund(
            @PathVariable Long orderId,
            @Valid @RequestBody(required = false) RefundDecisionRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        String note = request == null ? null : request.getNote();
        refundService.approveRefund(orderId, currentUser.getUser(), note);
        return ResponseEntity.ok("Refund approved and processed");
    }

    @PostMapping("/{orderId}/refund/reject")
    @PreAuthorize("hasRole('MANUFACTURER')")
    public ResponseEntity<String> rejectRefund(
            @PathVariable Long orderId,
            @Valid @RequestBody(required = false) RefundDecisionRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        String note = request == null ? null : request.getNote();
        refundService.rejectRefund(orderId, currentUser.getUser(), note);
        return ResponseEntity.ok("Refund rejected");
    }

    @GetMapping("/{orderId}/refund")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<RefundResponse> getRefundForOrder(
            @PathVariable Long orderId,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(refundService.getRefundForOrder(orderId, currentUser.getUser()));
    }
}
