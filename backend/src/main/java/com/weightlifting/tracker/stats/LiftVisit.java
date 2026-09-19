package com.weightlifting.tracker.stats;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record LiftVisit(LocalDate date, List<LiftSet> sets) {
    public BigDecimal maxWeight() {
        return sets.stream().map(LiftSet::weightKg).max(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
    }

    public int totalReps() {
        return sets.stream().mapToInt(LiftSet::reps).sum();
    }

    public int setCount() {
        return sets.size();
    }

    public BigDecimal volume() {
        return sets.stream().map(LiftSet::volume).reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
