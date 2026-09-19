package com.weightlifting.tracker.session;

import java.math.BigDecimal;

public record SetResponse(
        Long id,
        int setIndex,
        BigDecimal weightKg,
        int reps
) {
    public static SetResponse from(SessionSet set) {
        return new SetResponse(set.getId(), set.getSetIndex(), set.getWeightKg(), set.getReps());
    }
}
