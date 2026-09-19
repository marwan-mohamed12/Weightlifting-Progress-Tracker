package com.weightlifting.tracker.stats;

import java.math.BigDecimal;

public record WeightStatsResponse(
        BigDecimal weightKg,
        Long exerciseId,
        String exerciseName,
        int setCount,
        int totalReps,
        int sessionCount
) {
}
