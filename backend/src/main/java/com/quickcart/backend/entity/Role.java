package com.quickcart.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "roles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String name;

    /**
     * Mapped by roles field in User entity
     * This side is inverse (non-owning)
     */
    @ManyToMany(mappedBy = "roles")
    private Set<User> users = new HashSet<>();
}