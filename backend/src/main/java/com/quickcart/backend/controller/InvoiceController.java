package com.quickcart.backend.controller;

import com.quickcart.backend.dto.InvoiceResponse;
import com.quickcart.backend.security.CustomUserDetails;
import com.quickcart.backend.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;

    @GetMapping
    @PreAuthorize("hasRole('RETAILER')")
    public List<InvoiceResponse> getRetailerInvoices(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return invoiceService.getInvoicesForRetailer(userDetails.getUser());
    }
}
