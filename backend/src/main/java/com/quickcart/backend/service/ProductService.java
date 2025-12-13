package com.quickcart.backend.service;

import com.quickcart.backend.dto.CreateProductRequest;
import com.quickcart.backend.dto.ProductResponse;
import com.quickcart.backend.dto.UpdateProductRequest;
import com.quickcart.backend.entity.Product;
import com.quickcart.backend.entity.ProductStatus;
import com.quickcart.backend.entity.User;
import com.quickcart.backend.exception.ResourceNotFoundException;
import com.quickcart.backend.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;

    /**
     * Creates a new product associated with the manufacturer.
     *
     * @param request the product creation request
     * @param manufacturer the authenticated manufacturer user
     * @return the created product
     */
    public Product createProduct(CreateProductRequest request, User manufacturer) {
        Product product = Product.builder()
                .name(request.getName())
                .description(request.getDescription())
                .price(request.getPrice())
                .stock(request.getStock())
                .status(ProductStatus.ACTIVE)
                .manufacturer(manufacturer)
                .build();

        return productRepository.save(product);
    }

    public List<ProductResponse> getProductsForUser(User user) {

        List<Product> products;

        boolean isManufacturer = user.getRoles().stream()
                .anyMatch(role -> role.getName().equals("MANUFACTURER"));

        if (isManufacturer) {
            products = productRepository.findByManufacturer(user);
        } else {
            products = productRepository.findByStatus(ProductStatus.ACTIVE);
        }

        return products.stream()
                .map(this::mapToResponse)
                .toList();
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

    public void updateProduct(
            Long productId,
            UpdateProductRequest request,
            User manufacturer
    ) {
        Product product = productRepository
                .findByIdAndManufacturer(productId, manufacturer)
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Product", "id", productId
                ));

        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        product.setStock(request.getStock());

        productRepository.save(product);
    }

    public void deactivateProduct(Long productId, User manufacturer) {
        Product product = productRepository
                .findByIdAndManufacturer(productId, manufacturer)
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Product", "id", productId
                ));

        product.setStatus(ProductStatus.INACTIVE);
        productRepository.save(product);
    }

}
