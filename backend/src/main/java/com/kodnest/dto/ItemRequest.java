package com.kodnest.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Min;

public record ItemRequest(
        @NotBlank(message = "Name is required") String name,
        String description,
        @Min(value = 0, message = "Quantity cannot be negative") int quantity,
        @Min(value = 0, message = "Reorder level cannot be negative") int reorderLevel
) {
    public ItemRequest(String name, String description) {
        this(name, description, 0, 0);
    }

    public ItemRequest(String name, String description, int quantity) {
        this(name, description, quantity, 0);
    }
}
