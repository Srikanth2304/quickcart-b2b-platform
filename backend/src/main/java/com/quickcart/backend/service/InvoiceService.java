package com.quickcart.backend.service;

import com.quickcart.backend.dto.InvoiceResponse;
import com.quickcart.backend.entity.Invoice;
import com.quickcart.backend.entity.User;
import com.quickcart.backend.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;

    /**
     * Fetch invoices for a retailer and map to response DTOs.
     * Prevents lazy initialization errors by mapping entities to DTOs
     * before the Hibernate session is closed.
     */
    public List<InvoiceResponse> getInvoicesForRetailer(User retailer) {
        List<Invoice> invoices = invoiceRepository.findByRetailer(retailer);
        return invoices.stream()
                .map(this::mapToResponse)
                .toList();
    }

    /**
     * Map Invoice entity to InvoiceResponse DTO.
     * Extracts only necessary fields to avoid lazy loading issues.
     */
    private InvoiceResponse mapToResponse(Invoice invoice) {
        return InvoiceResponse.builder()
                .id(invoice.getId())
                .invoiceNumber(invoice.getInvoiceNumber())
                .orderId(invoice.getOrder().getId())
                .amount(invoice.getAmount())
                .status(invoice.getStatus().toString())
                .createdAt(invoice.getCreatedAt())
                .build();
    }
}