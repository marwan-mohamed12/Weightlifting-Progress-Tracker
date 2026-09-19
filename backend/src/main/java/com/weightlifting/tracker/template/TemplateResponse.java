package com.weightlifting.tracker.template;

import java.time.Instant;
import java.util.List;

public record TemplateResponse(
        Long id,
        String name,
        String notes,
        List<TemplateExerciseResponse> exercises,
        Instant createdAt,
        Instant updatedAt
) {
    public static TemplateResponse from(WorkoutTemplate template) {
        return new TemplateResponse(
                template.getId(),
                template.getName(),
                template.getNotes(),
                template.getExercises().stream().map(TemplateExerciseResponse::from).toList(),
                template.getCreatedAt(),
                template.getUpdatedAt()
        );
    }
}
