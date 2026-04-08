package com.quickcart.backend.pdf;

import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfWriter;
import com.quickcart.backend.dto.InvoiceResponse;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;

@Component
public class InvoicePdfGenerator {

    public byte[] generate(InvoiceResponse invoice) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document();
        try {
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16);
            document.add(new Paragraph("QuickCart Invoice", titleFont));
            document.add(new Paragraph("Invoice Number: " + invoice.getInvoiceNumber()));
            document.add(new Paragraph("Order ID: " + invoice.getOrderId()));
            document.add(new Paragraph("Status: " + invoice.getStatus()));
            document.add(new Paragraph("Amount: " + invoice.getAmount()));
            document.add(new Paragraph("Generated At: " + invoice.getCreatedAt()));
            document.add(new Paragraph(" "));
            document.add(new Paragraph("This is a computer-generated invoice."));
        } catch (DocumentException ex) {
            throw new IllegalStateException("Failed to generate invoice PDF", ex);
        } finally {
            document.close();
        }
        return out.toByteArray();
    }
}

