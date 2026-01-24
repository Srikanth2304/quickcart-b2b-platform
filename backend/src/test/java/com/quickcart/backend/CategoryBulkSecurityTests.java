package com.quickcart.backend;

import com.quickcart.backend.dto.BulkCreateCategoriesRequest;
import com.quickcart.backend.entity.Role;
import com.quickcart.backend.entity.User;
import com.quickcart.backend.repository.RoleRepository;
import com.quickcart.backend.repository.UserRepository;
import com.quickcart.backend.service.CategoryService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class CategoryBulkSecurityTests {

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CategoryService categoryService;

    @Test
    @Transactional
    void rolesAreSeedable_andUsableForAdminFlows() {
        // This test doesn't hit the controller. It validates that the new roles exist/are usable.
        // (Controller role enforcement is via @PreAuthorize and is covered when we enable proper MockMvc tests.)

        Role adminRole = roleRepository.findByName("ADMIN")
                .orElseGet(() -> roleRepository.save(Role.builder().name("ADMIN").build()));
        Role catalogRole = roleRepository.findByName("CATALOG_MANAGER")
                .orElseGet(() -> roleRepository.save(Role.builder().name("CATALOG_MANAGER").build()));

        User admin = userRepository.save(User.builder()
                .name("Admin")
                .email("admin-" + UUID.randomUUID() + "@test.local")
                .password("pass")
                .isActive(true)
                .roles(Set.of(adminRole))
                .build());

        User catalogManager = userRepository.save(User.builder()
                .name("Catalog")
                .email("catalog-" + UUID.randomUUID() + "@test.local")
                .password("pass")
                .isActive(true)
                .roles(Set.of(catalogRole))
                .build());

        BulkCreateCategoriesRequest req = new BulkCreateCategoriesRequest();
        BulkCreateCategoriesRequest.CategoryItem item = new BulkCreateCategoriesRequest.CategoryItem();
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        item.setName("Test Category " + suffix);
        req.setCategories(List.of(item));

        // We can't pass user identity into CategoryService yet (no method-level auth there),
        // but we can still validate the bulk creation works (used by Admin/Catalog endpoints).
        var res = categoryService.createCategoriesBulk(req);
        assertThat(res.getCreatedCount()).isEqualTo(1);
        assertThat(res.getCreated()).hasSize(1);

        // Sanity: new roles are assigned to created users
        assertThat(admin.getRoles()).anyMatch(r -> r.getName().equals("ADMIN"));
        assertThat(catalogManager.getRoles()).anyMatch(r -> r.getName().equals("CATALOG_MANAGER"));
    }
}
