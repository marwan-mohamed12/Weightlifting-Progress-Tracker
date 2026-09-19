package com.weightlifting.tracker.stats;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SessionSnapshot(
        LocalDate date,
        BigDecimal maxWeightKg,
        int totalReps,
        BigDecimal totalVolume
) {
}
