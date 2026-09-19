package com.weightlifting.tracker.stats;

import java.math.BigDecimal;

public record PeriodComparison(
        PeriodStats thisMonth,
        PeriodStats lastMonth,
        BigDecimal volumeDeltaPercent
) {
}
