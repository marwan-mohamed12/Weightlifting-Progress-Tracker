package com.weightlifting.tracker.stats;

import java.math.BigDecimal;

public record LiftSet(BigDecimal weightKg, int reps, int setIndex) {
    public BigDecimal volume() {
        return weightKg.multiply(BigDecimal.valueOf(reps));
    }
}
