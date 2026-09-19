package com.weightlifting.tracker.exercise;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ExerciseRequest(
        @NotBlank @Size(max = 120) String name,
        @Size(max = 1000) String notes,
        @Size(max = 32) String muscleGroup
) {
}
