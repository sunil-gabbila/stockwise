package com.kodnest.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record QuantityRequest(
        @Min(value = 0, message = "Quantity cannot be negative") int quantity,
        @Size(max = 120, message = "Adjustment note must be 120 characters or fewer") String reason
) {
    public QuantityRequest(int quantity) {
        this(quantity, null);
    }
}
