package com.quickcart.backend.service;

import com.quickcart.backend.dto.InvoiceResponse;
import com.quickcart.backend.entity.Invoice;
import com.quickcart.backend.entity.User;
import com.quickcart.backend.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;

    /**
     * Fetch paginated invoices for a retailer and map to response DTOs.
     * Repository eagerly loads all required relationships with JOIN FETCH.
     * Mapping to DTOs happens while Hibernate session is still active.
     */
    public Page<InvoiceResponse> getInvoicesForRetailer(User retailer, Pageable pageable) {
        Page<Invoice> invoicesPage = invoiceRepository.findByRetailer(retailer, pageable);

        // Map all invoices to DTOs while session is active
        List<InvoiceResponse> invoiceResponses = invoicesPage.getContent()
                .stream()
                .map(this::mapToResponse)
                .toList();

        // Return Page with mapped DTOs
        return new PageImpl<>(
                invoiceResponses,
                invoicesPage.getPageable(),
                invoicesPage.getTotalElements()
        );
    }

    /**
     * Map Invoice entity to InvoiceResponse DTO.
     * All relationships are already eagerly loaded by the repository.
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
