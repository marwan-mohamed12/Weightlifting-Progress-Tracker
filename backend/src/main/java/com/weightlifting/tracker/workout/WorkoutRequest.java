package com.weightlifting.tracker.workout;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record WorkoutRequest(
        @NotNull Long exerciseId,
        @NotNull LocalDate performedOn,
        @Size(max = 2000) String notes,
        @NotEmpty @Size(max = 50) @Valid List<SetRequest> sets
) {
}
