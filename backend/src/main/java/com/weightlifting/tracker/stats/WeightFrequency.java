package com.weightlifting.tracker.stats;

import java.math.BigDecimal;

public record WeightFrequency(
        BigDecimal weightKg,
        int setCount,
        int totalReps,
        int sessionCount
) {
}
