package com.weightlifting.tracker.template;

import java.math.BigDecimal;

public record TemplateExerciseResponse(
        Long id,
        Long exerciseId,
        String exerciseName,
        int targetSets,
        int targetReps,
        BigDecimal targetWeightKg
) {
    public static TemplateExerciseResponse from(TemplateExercise item) {
        return new TemplateExerciseResponse(
                item.getId(),
                item.getExercise().getId(),
                item.getExercise().getName(),
                item.getTargetSets(),
                item.getTargetReps(),
                item.getTargetWeightKg()
        );
    }
}
