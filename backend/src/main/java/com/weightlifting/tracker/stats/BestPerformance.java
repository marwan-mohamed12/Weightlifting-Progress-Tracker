package com.weightlifting.tracker.stats;

import java.math.BigDecimal;
import java.time.LocalDate;

public record BestPerformance(
        LocalDate date,
        BigDecimal weightKg,
        int reps,
        int setIndex
) {
}
