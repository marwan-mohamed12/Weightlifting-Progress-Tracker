package com.weightlifting.tracker.stats;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record ProgressOverview(
        String range,
        LocalDate from,
        LocalDate to,
        BigDecimal weeklyVolume,
        BigDecimal monthlyVolume,
        BigDecimal weeklyFrequency,
        BigDecimal averageWeight,
        BigDecimal averageReps,
        BigDecimal progressPercent,
        BigDecimal currentVolume,
        BigDecimal previousVolume,
        List<NamedVolume> volumeByMuscle,
        List<ExerciseFrequency> exerciseFrequency,
        PeriodComparison comparison,
        List<PersonalRecordHit> prTimeline
) {
}
