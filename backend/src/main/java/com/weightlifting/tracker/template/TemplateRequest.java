package com.weightlifting.tracker.template;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record TemplateRequest(
        @NotBlank @Size(max = 120) String name,
        @Size(max = 2000) String notes,
        @NotEmpty @Valid List<TemplateExerciseRequest> exercises
) {
}
