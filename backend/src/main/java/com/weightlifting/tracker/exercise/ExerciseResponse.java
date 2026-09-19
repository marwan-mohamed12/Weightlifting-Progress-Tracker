package com.weightlifting.tracker.exercise;

import java.time.Instant;

public record ExerciseResponse(
        Long id,
        String name,
        String notes,
        String muscleGroup,
        Instant createdAt,
        Instant updatedAt
) {
    public static ExerciseResponse from(Exercise exercise) {
        return new ExerciseResponse(
                exercise.getId(),
                exercise.getName(),
                exercise.getNotes(),
                exercise.getMuscleGroup(),
                exercise.getCreatedAt(),
                exercise.getUpdatedAt()
        );
    }
}
