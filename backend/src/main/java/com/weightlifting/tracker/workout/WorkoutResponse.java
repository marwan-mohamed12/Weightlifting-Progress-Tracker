package com.weightlifting.tracker.workout;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record WorkoutResponse(
        Long id,
        Long exerciseId,
        String exerciseName,
        LocalDate performedOn,
        String notes,
        String summary,
        List<SetResponse> sets,
        Instant createdAt,
        Instant updatedAt
) {
    public static WorkoutResponse from(Workout workout) {
        List<SetResponse> sets = workout.getSets().stream().map(SetResponse::from).toList();
        return new WorkoutResponse(
                workout.getId(),
                workout.getExercise().getId(),
                workout.getExercise().getName(),
                workout.getPerformedOn(),
                workout.getNotes(),
                WorkoutSummaries.of(workout.getSets()),
                sets,
                workout.getCreatedAt(),
                workout.getUpdatedAt()
        );
    }
}
