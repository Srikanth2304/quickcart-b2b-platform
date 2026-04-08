package com.quickcart.backend.service;

import com.quickcart.backend.exception.RateLimitExceededException;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimitService {

    private final Map<String, Deque<Long>> eventsByKey = new ConcurrentHashMap<>();

    public void checkLimit(String key, int maxAttempts, Duration window) {
        long now = Instant.now().toEpochMilli();
        long lowerBound = now - window.toMillis();

        Deque<Long> events = eventsByKey.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (events) {
            while (!events.isEmpty() && events.peekFirst() < lowerBound) {
                events.pollFirst();
            }
            if (events.size() >= maxAttempts) {
                throw new RateLimitExceededException("Too many requests. Please try again later.");
            }
            events.addLast(now);
        }
    }
}

