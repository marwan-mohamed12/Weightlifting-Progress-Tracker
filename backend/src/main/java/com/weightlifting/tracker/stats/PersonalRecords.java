package com.weightlifting.tracker.stats;

import java.math.BigDecimal;
import java.util.List;

public record PersonalRecords(
        BigDecimal heaviestWeightKg,
        Integer mostRepsInOneSet,
        BigDecimal highestVolume,
        BigDecimal estimatedOneRepMax,
        List<RepsAtWeight> mostRepsAtWeight
) {
}
