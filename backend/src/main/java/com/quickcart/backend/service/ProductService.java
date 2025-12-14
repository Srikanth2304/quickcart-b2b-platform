package com.quickcart.backend.service;

import com.quickcart.backend.dto.CreateProductRequest;
import com.quickcart.backend.dto.ProductResponse;
import com.quickcart.backend.dto.UpdateProductRequest;
import com.quickcart.backend.entity.Product;
import com.quickcart.backend.entity.ProductStatus;
import com.quickcart.backend.entity.User;
import com.quickcart.backend.exception.AccessDeniedException;
import com.quickcart.backend.exception.ResourceNotFoundException;
import com.quickcart.backend.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;

    public void createProduct(CreateProductRequest request, User manufacturer) {
        Product product = Product.builder()
                .name(request.getName())
                .description(request.getDescription())
                .price(request.getPrice())
                .stock(request.getStock())
                .status(ProductStatus.ACTIVE)
                .manufacturer(manufacturer)
                .build();

        productRepository.save(product);
    }

    public Page<ProductResponse> getProductsForUser(User user, Pageable pageable) {

        Page<Product> products;

        boolean isManufacturer = user.hasRole("MANUFACTURER");

        if (isManufacturer) {
            products = productRepository.findByManufacturer(user, pageable);
        } else {
            products = productRepository.findByStatus(ProductStatus.ACTIVE, pageable);
        }

        return products.map(product -> ProductResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .description(product.getDescription())
                .price(product.getPrice())
                .stock(product.getStock())
                .status(product.getStatus().name())
                .manufacturerName(product.getManufacturer().getName())
                .build()
        );
    }


    private ProductResponse mapToResponse(Product product) {
        return ProductResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .description(product.getDescription())
                .price(product.getPrice())
                .stock(product.getStock())
                .status(product.getStatus().name())
                .manufacturerName(product.getManufacturer().getName())
                .build();
    }

    public void updateProduct(Long productId, UpdateProductRequest request, User manufacturer) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        if (!product.getManufacturer().getId().equals(manufacturer.getId())) {
            throw new AccessDeniedException("Product", productId);
        }

        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        product.setStock(request.getStock());

        productRepository.save(product);
    }

    public void deactivateProduct(Long productId, User manufacturer) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        if (!product.getManufacturer().getId().equals(manufacturer.getId())) {
            throw new AccessDeniedException("Product", productId);
        }

        product.setStatus(ProductStatus.INACTIVE);
        productRepository.save(product);
    }
}
