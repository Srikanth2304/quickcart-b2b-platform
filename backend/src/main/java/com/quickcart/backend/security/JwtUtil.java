package com.quickcart.backend.security;

import com.quickcart.backend.entity.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class JwtUtil {

    // Inject JWT secret from application.yml
    @Value("${security.jwt.secret}")
    private String secretKey;

    // Inject JWT expiration time from application.yml
    @Value("${security.jwt.expiration}")
    private long expiration;

    /**
     * Generates a SecretKey from the configured secret for signing JWTs.
     * Uses UTF-8 encoding and HMAC-SHA for secure key generation.
     */
    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Generates a JWT token for the authenticated user.
     * Token includes user email as subject and roles as claims.
     *
     * @param user the authenticated user
     * @return JWT token string
     */
    public String generateToken(User user) {

        return Jwts.builder()
                .setSubject(user.getEmail())
                .claim("roles",
                        user.getRoles().stream()
                                .map(r -> r.getName())
                                .collect(Collectors.toList()))
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Extracts the username (email) from the JWT token.
     *
     * @param token JWT token
     * @return username (email)
     */
    public String extractUsername(String token) {
        return getClaims(token).getSubject();
    }

    /**
     * Extracts roles from the JWT token.
     *
     * @param token JWT token
     * @return list of role names
     */
    public List<String> extractRoles(String token) {
        Claims claims = getClaims(token);
        return claims.get("roles", List.class);
    }

    /**
     * Validates if the JWT token is valid and not expired.
     *
     * @param token JWT token
     * @return true if valid, false otherwise
     */
    public boolean validateToken(String token) {
        try {
            getClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Parses and validates the JWT token to extract claims.
     *
     * @param token JWT token
     * @return Claims object containing token data
     */
    private Claims getClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
