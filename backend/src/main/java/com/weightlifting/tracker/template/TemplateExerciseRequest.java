package com.weightlifting.tracker.template;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record TemplateExerciseRequest(
        @NotNull Long exerciseId,
        @NotNull @Min(1) @Max(50) Integer targetSets,
        @NotNull @Min(1) @Max(500) Integer targetReps,
        @NotNull @DecimalMin("0.01") BigDecimal targetWeightKg
) {
}
