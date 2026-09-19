package com.weightlifting.tracker.stats;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PersonalRecordHit(
        String type,
        String label,
        Long exerciseId,
        String exerciseName,
        BigDecimal previousValue,
        BigDecimal currentValue,
        String detail,
        LocalDate date
) {
}
