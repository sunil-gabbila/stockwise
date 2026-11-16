package com.kodnest.dto;

import java.time.Instant;

public record StockMovementResponse(
        Long id,
        Long itemId,
        String itemName,
        int quantityChange,
        String reason,
        Instant createdAt
) {
}
