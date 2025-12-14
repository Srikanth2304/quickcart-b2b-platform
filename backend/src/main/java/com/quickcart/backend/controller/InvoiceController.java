package com.quickcart.backend.controller;

import com.quickcart.backend.dto.InvoiceResponse;
import com.quickcart.backend.security.CustomUserDetails;
import com.quickcart.backend.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;

    @GetMapping
    @PreAuthorize("hasRole('RETAILER')")
    public Page<InvoiceResponse> getRetailerInvoices(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            Pageable pageable
    ) {
        return invoiceService.getInvoicesForRetailer(
                userDetails.getUser(),
                pageable
        );
    }
}
