package com.weightlifting.tracker.stats;

import com.weightlifting.tracker.exercise.Exercise;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PersonalRecordDetectorTest {

    @Test
    void detectsHeavierWeightAndHigherVolume() {
        Exercise bench = new Exercise("Bench press", null);
        LiftVisit previous = new LiftVisit(LocalDate.of(2026, 1, 1), List.of(new LiftSet(new BigDecimal("40"), 8, 1)));
        LiftVisit incoming = new LiftVisit(LocalDate.of(2026, 1, 8), List.of(new LiftSet(new BigDecimal("50"), 8, 1)));

        List<PersonalRecordHit> hits = PersonalRecordDetector.detect(bench, List.of(previous), incoming);

        assertThat(hits).extracting(PersonalRecordHit::type)
                .contains("HEAVIEST_WEIGHT", "HIGHEST_VOLUME", "ESTIMATED_1RM");
    }

    @Test
    void detectsMoreRepsAtSameWeight() {
        Exercise squat = new Exercise("Squat", null);
        LiftVisit previous = new LiftVisit(LocalDate.of(2026, 1, 1), List.of(new LiftSet(new BigDecimal("40"), 5, 1)));
        LiftVisit incoming = new LiftVisit(LocalDate.of(2026, 1, 8), List.of(new LiftSet(new BigDecimal("40"), 8, 1)));

        List<PersonalRecordHit> hits = PersonalRecordDetector.detect(squat, List.of(previous), incoming);

        assertThat(hits).extracting(PersonalRecordHit::type)
                .contains("MOST_REPS_AT_WEIGHT", "MOST_REPS_SINGLE_SET");
    }
}
