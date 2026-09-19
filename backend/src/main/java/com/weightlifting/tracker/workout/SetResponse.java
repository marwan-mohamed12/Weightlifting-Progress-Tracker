package com.weightlifting.tracker.workout;

import java.math.BigDecimal;

public record SetResponse(
        Long id,
        int setIndex,
        BigDecimal weightKg,
        int reps
) {
    public static SetResponse from(WorkoutSet set) {
        return new SetResponse(set.getId(), set.getSetIndex(), set.getWeightKg(), set.getReps());
    }
}
