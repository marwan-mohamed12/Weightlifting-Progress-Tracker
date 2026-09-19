package com.weightlifting.tracker.session;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record SetRequest(
        @NotNull @DecimalMin(value = "0.01") @DecimalMax(value = "1000") BigDecimal weightKg,
        @NotNull @Min(1) @Max(500) Integer reps
) {
}
