package com.weightlifting.tracker.session;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.stream.Collectors;

public record LiftResponse(
        Long id,
        Long exerciseId,
        String exerciseName,
        String notes,
        String summary,
        BigDecimal volume,
        List<SetResponse> sets
) {
    public static LiftResponse from(SessionLift lift) {
        List<SetResponse> sets = lift.getSets().stream().map(SetResponse::from).toList();
        BigDecimal volume = lift.getSets().stream()
                .map(set -> set.getWeightKg().multiply(BigDecimal.valueOf(set.getReps())))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        return new LiftResponse(
                lift.getId(),
                lift.getExercise().getId(),
                lift.getExercise().getName(),
                lift.getNotes(),
                summarize(lift.getSets()),
                volume,
                sets
        );
    }

    static String summarize(List<SessionSet> sets) {
        if (sets == null || sets.isEmpty()) {
            return "";
        }
        boolean sameWeight = sets.stream().map(SessionSet::getWeightKg).distinct().count() == 1;
        if (sameWeight) {
            String reps = sets.stream().map(set -> Integer.toString(set.getReps())).collect(Collectors.joining(", "));
            return sets.get(0).getWeightKg().stripTrailingZeros().toPlainString() + " kg · " + reps;
        }
        return sets.stream()
                .map(set -> set.getWeightKg().stripTrailingZeros().toPlainString() + "×" + set.getReps())
                .collect(Collectors.joining(", "));
    }
}
