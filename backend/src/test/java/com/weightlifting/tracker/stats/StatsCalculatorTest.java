package com.weightlifting.tracker.stats;

import com.weightlifting.tracker.exercise.Exercise;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class StatsCalculatorTest {

    @Test
    void benchPressFortyKiloExample() {
        Exercise bench = new Exercise("Bench press", null);
        LiftVisit visit = visit(LocalDate.of(2026, 9, 19), set("40", 8), set("40", 7), set("40", 6));

        ExerciseStatsResponse stats = StatsCalculator.forExercise(bench, List.of(visit));

        assertThat(stats.highestWeightKg()).isEqualByComparingTo("40");
        assertThat(stats.currentWeightKg()).isEqualByComparingTo("40");
        assertThat(stats.highestReps()).isEqualTo(8);
        assertThat(stats.totalSets()).isEqualTo(3);
        assertThat(stats.totalReps()).isEqualTo(21);
        assertThat(stats.sessionCount()).isEqualTo(1);
        assertThat(stats.lifetimeVolume()).isEqualByComparingTo("840");
        assertThat(stats.bestPerformance().weightKg()).isEqualByComparingTo("40");
        assertThat(stats.bestPerformance().reps()).isEqualTo(8);
        assertThat(stats.trend().direction()).isEqualTo("insufficient");
        assertThat(stats.weightFrequency()).hasSize(1);
        assertThat(stats.weightFrequency().get(0).setCount()).isEqualTo(3);
        assertThat(stats.weightFrequency().get(0).totalReps()).isEqualTo(21);
        assertThat(stats.weightFrequency().get(0).sessionCount()).isEqualTo(1);
        assertThat(stats.personalRecords().estimatedOneRepMax()).isNotNull();
    }

    @Test
    void trendGoesUpWhenRecentMaxClimbsByAtLeastTwoAndAHalfKilos() {
        Exercise squat = new Exercise("Squat", null);
        LiftVisit early = visit(LocalDate.of(2026, 1, 1), set("40", 5));
        LiftVisit later = visit(LocalDate.of(2026, 2, 1), set("50", 5));

        ExerciseStatsResponse stats = StatsCalculator.forExercise(squat, List.of(later, early));

        assertThat(stats.trend().direction()).isEqualTo("up");
        assertThat(stats.highestWeightKg()).isEqualByComparingTo("50");
    }

    @Test
    void trendIsStableInsideTheThreshold() {
        Exercise row = new Exercise("Barbell row", null);
        LiftVisit first = visit(LocalDate.of(2026, 1, 1), set("40", 8));
        LiftVisit second = visit(LocalDate.of(2026, 1, 8), set("42", 8));

        ExerciseStatsResponse stats = StatsCalculator.forExercise(row, List.of(second, first));

        assertThat(stats.trend().direction()).isEqualTo("stable");
    }

    @Test
    void bestPerformancePrefersHeavierSetThenMoreRepsThenNewerDate() {
        Exercise press = new Exercise("Overhead press", null);
        LiftVisit older = visit(LocalDate.of(2026, 3, 1), set("40", 6), set("40", 8));
        LiftVisit newer = visit(LocalDate.of(2026, 3, 8), set("40", 8), set("42.5", 3));

        ExerciseStatsResponse stats = StatsCalculator.forExercise(press, List.of(newer, older));

        assertThat(stats.bestPerformance().weightKg()).isEqualByComparingTo("42.5");
        assertThat(stats.bestPerformance().reps()).isEqualTo(3);
        assertThat(stats.bestPerformance().date()).isEqualTo(LocalDate.of(2026, 3, 8));
        assertThat(stats.highestReps()).isEqualTo(8);
    }

    @Test
    void weightStatsCountSetsRepsAndSessionsAtThatLoad() {
        LiftVisit first = visit(LocalDate.of(2026, 4, 1), set("40", 8), set("40", 7), set("35", 10));
        LiftVisit second = visit(LocalDate.of(2026, 4, 8), set("40", 6));

        WeightStatsResponse stats = StatsCalculator.forWeight(
                new BigDecimal("40.00"), 1L, "Bench press", List.of(first, second)
        );

        assertThat(stats.setCount()).isEqualTo(3);
        assertThat(stats.totalReps()).isEqualTo(21);
        assertThat(stats.sessionCount()).isEqualTo(2);
    }

    private static LiftVisit visit(LocalDate date, LiftSet... sets) {
        return new LiftVisit(date, List.of(sets));
    }

    private static LiftSet set(String kg, int reps) {
        return new LiftSet(new BigDecimal(kg), reps, 1);
    }
}
