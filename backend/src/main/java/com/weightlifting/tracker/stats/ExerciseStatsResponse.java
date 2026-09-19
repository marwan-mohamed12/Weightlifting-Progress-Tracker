package com.weightlifting.tracker.stats;

import java.math.BigDecimal;
import java.util.List;

public record ExerciseStatsResponse(
        Long exerciseId,
        String exerciseName,
        BigDecimal currentWeightKg,
        BigDecimal highestWeightKg,
        Integer highestReps,
        int totalSets,
        int totalReps,
        int sessionCount,
        BigDecimal lifetimeVolume,
        BestPerformance bestPerformance,
        PersonalRecords personalRecords,
        Trend trend,
        List<WeightFrequency> weightFrequency
) {
}
