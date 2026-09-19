package com.weightlifting.tracker.session;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record SessionRequest(
        @NotNull LocalDate performedOn,
        @Size(max = 2000) String notes,
        SessionStatus status,
        @Valid List<LiftRequest> lifts
) {
}
