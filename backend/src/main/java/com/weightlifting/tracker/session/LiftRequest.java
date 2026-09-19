package com.weightlifting.tracker.session;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record LiftRequest(
        Long id,
        @NotNull Long exerciseId,
        @Size(max = 2000) String notes,
        @NotEmpty @Size(max = 50) @Valid List<SetRequest> sets
) {
}
