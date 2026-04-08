package com.quickcart.backend.service;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OtpChallengeService {

    private final StringRedisTemplate redisTemplate;
    private final Map<String, Challenge> localChallenges = new ConcurrentHashMap<>();

    public OtpChallengeService(ObjectProvider<StringRedisTemplate> redisTemplateProvider) {
        this.redisTemplate = redisTemplateProvider.getIfAvailable();
    }

    public void put(String key, String otp, Duration ttl) {
        if (redisTemplate != null) {
            try {
                redisTemplate.opsForValue().set(redisKey(key), otp, ttl);
                return;
            } catch (RuntimeException ignored) {
                // Fallback to local cache if Redis is temporarily unavailable.
            }
        }
        localChallenges.put(key, new Challenge(otp, LocalDateTime.now().plus(ttl)));
    }

    public boolean verify(String key, String otp) {
        if (redisTemplate != null) {
            try {
                String stored = redisTemplate.opsForValue().get(redisKey(key));
                return stored != null && stored.equals(otp);
            } catch (RuntimeException ignored) {
                // fallback below
            }
        }

        Challenge challenge = localChallenges.get(key);
        if (challenge == null) {
            return false;
        }
        if (challenge.expiry().isBefore(LocalDateTime.now())) {
            localChallenges.remove(key);
            return false;
        }
        return challenge.otp().equals(otp);
    }

    public void remove(String key) {
        if (redisTemplate != null) {
            try {
                redisTemplate.delete(redisKey(key));
            } catch (RuntimeException ignored) {
                // fallback below
            }
        }
        localChallenges.remove(key);
    }

    private String redisKey(String key) {
        return "otp:challenge:" + key;
    }

    private record Challenge(String otp, LocalDateTime expiry) {}
}

