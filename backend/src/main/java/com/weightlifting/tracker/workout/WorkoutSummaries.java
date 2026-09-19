package com.weightlifting.tracker.workout;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

public final class WorkoutSummaries {

    private WorkoutSummaries() {
    }

    public static String of(List<WorkoutSet> sets) {
        if (sets == null || sets.isEmpty()) {
            return "";
        }
        boolean sameWeight = sets.stream()
                .map(WorkoutSet::getWeightKg)
                .distinct()
                .count() == 1;
        if (sameWeight) {
            String reps = sets.stream()
                    .map(set -> Integer.toString(set.getReps()))
                    .collect(Collectors.joining(", "));
            return formatKg(sets.get(0).getWeightKg()) + " kg · " + reps;
        }
        return sets.stream()
                .map(set -> formatKg(set.getWeightKg()) + "×" + set.getReps())
                .collect(Collectors.joining(", "));
    }

    static String formatKg(BigDecimal weight) {
        return weight.stripTrailingZeros().toPlainString();
    }
}
