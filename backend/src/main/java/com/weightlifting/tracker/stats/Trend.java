package com.weightlifting.tracker.stats;

import java.util.List;

public record Trend(
        String direction,
        List<SessionSnapshot> sessions
) {
}
