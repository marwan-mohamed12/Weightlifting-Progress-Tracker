package com.weightlifting.tracker.stats;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class ProgressCalculatorTest {

    @Test
    void rangeStartMapsKnownWindows() {
        LocalDate today = LocalDate.of(2026, 9, 20);
        assertThat(ProgressCalculator.startFor("7d", today)).isEqualTo(LocalDate.of(2026, 9, 14));
        assertThat(ProgressCalculator.startFor("30d", today)).isEqualTo(LocalDate.of(2026, 8, 22));
        assertThat(ProgressCalculator.startFor("90d", today)).isEqualTo(LocalDate.of(2026, 6, 23));
        assertThat(ProgressCalculator.startFor("all", today)).isNull();
    }

    @Test
    void percentDeltaFromZeroPreviousIsOneHundred() {
        assertThat(ProgressCalculator.percentDelta(BigDecimal.ZERO, new BigDecimal("50"))).isEqualByComparingTo("100");
        assertThat(ProgressCalculator.percentDelta(new BigDecimal("100"), new BigDecimal("150"))).isEqualByComparingTo("50.0");
    }
}
