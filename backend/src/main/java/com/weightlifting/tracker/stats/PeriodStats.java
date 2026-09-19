package com.weightlifting.tracker.stats;

import java.math.BigDecimal;

public record PeriodStats(String label, BigDecimal volume, int sessions, BigDecimal averageWeight) {
}
