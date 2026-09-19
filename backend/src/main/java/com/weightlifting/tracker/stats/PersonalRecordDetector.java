package com.weightlifting.tracker.stats;

import com.weightlifting.tracker.exercise.Exercise;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public final class PersonalRecordDetector {

    private PersonalRecordDetector() {
    }

    public static List<PersonalRecordHit> detect(Exercise exercise, List<LiftVisit> previous, LiftVisit incoming) {
        List<PersonalRecordHit> hits = new ArrayList<>();
        if (incoming.sets().isEmpty()) {
            return hits;
        }
        Snapshot before = Snapshot.from(previous);
        Snapshot now = Snapshot.from(List.of(incoming));

        if (now.heaviest.compareTo(before.heaviest) > 0) {
            hits.add(hit(exercise, "HEAVIEST_WEIGHT", "Heaviest weight", before.heaviestOrNull(), now.heaviest,
                    now.heaviest.stripTrailingZeros().toPlainString() + " kg", incoming.date()));
        }
        if (now.mostReps > before.mostReps) {
            hits.add(hit(exercise, "MOST_REPS_SINGLE_SET", "Most reps in one set",
                    before.mostReps == 0 ? null : BigDecimal.valueOf(before.mostReps),
                    BigDecimal.valueOf(now.mostReps), now.mostReps + " reps", incoming.date()));
        }
        if (now.volume.compareTo(before.volume) > 0) {
            hits.add(hit(exercise, "HIGHEST_VOLUME", "Highest total volume", before.volumeOrNull(), now.volume,
                    now.volume.stripTrailingZeros().toPlainString() + " kg", incoming.date()));
        }
        if (now.oneRepMax.compareTo(before.oneRepMax) > 0) {
            hits.add(hit(exercise, "ESTIMATED_1RM", "Estimated 1 rep max", before.oneRepMaxOrNull(), now.oneRepMax,
                    now.oneRepMax.stripTrailingZeros().toPlainString() + " kg", incoming.date()));
        }
        for (Map.Entry<BigDecimal, Integer> entry : now.repsAtWeight.entrySet()) {
            int previousReps = before.repsAtWeight.getOrDefault(entry.getKey(), 0);
            if (entry.getValue() > previousReps) {
                hits.add(hit(exercise, "MOST_REPS_AT_WEIGHT", "Most reps at " + entry.getKey().stripTrailingZeros().toPlainString() + " kg",
                        previousReps == 0 ? null : BigDecimal.valueOf(previousReps),
                        BigDecimal.valueOf(entry.getValue()),
                        entry.getValue() + " reps at " + entry.getKey().stripTrailingZeros().toPlainString() + " kg",
                        incoming.date()));
            }
        }
        return hits;
    }

    private static PersonalRecordHit hit(
            Exercise exercise,
            String type,
            String label,
            BigDecimal previous,
            BigDecimal current,
            String detail,
            java.time.LocalDate date
    ) {
        return new PersonalRecordHit(type, label, exercise.getId(), exercise.getName(), previous, current, detail, date);
    }

    static final class Snapshot {
        private BigDecimal heaviest = BigDecimal.ZERO;
        private int mostReps;
        private BigDecimal volume = BigDecimal.ZERO;
        private BigDecimal oneRepMax = BigDecimal.ZERO;
        private final Map<BigDecimal, Integer> repsAtWeight = new HashMap<>();

        static Snapshot from(List<LiftVisit> visits) {
            Snapshot snapshot = new Snapshot();
            for (LiftVisit visit : visits) {
                snapshot.volume = snapshot.volume.max(visit.volume());
                for (LiftSet set : visit.sets()) {
                    if (set.weightKg().compareTo(snapshot.heaviest) > 0) {
                        snapshot.heaviest = set.weightKg();
                    }
                    if (set.reps() > snapshot.mostReps) {
                        snapshot.mostReps = set.reps();
                    }
                    BigDecimal e1rm = estimatedOneRepMax(set.weightKg(), set.reps());
                    if (e1rm.compareTo(snapshot.oneRepMax) > 0) {
                        snapshot.oneRepMax = e1rm;
                    }
                    BigDecimal key = set.weightKg().stripTrailingZeros();
                    snapshot.repsAtWeight.merge(key, set.reps(), Math::max);
                }
            }
            return snapshot;
        }

        BigDecimal heaviestOrNull() {
            return heaviest.compareTo(BigDecimal.ZERO) == 0 ? null : heaviest;
        }

        BigDecimal volumeOrNull() {
            return volume.compareTo(BigDecimal.ZERO) == 0 ? null : volume;
        }

        BigDecimal oneRepMaxOrNull() {
            return oneRepMax.compareTo(BigDecimal.ZERO) == 0 ? null : oneRepMax;
        }
    }

    static BigDecimal estimatedOneRepMax(BigDecimal weight, int reps) {
        if (reps <= 1) {
            return weight;
        }
        return weight.multiply(BigDecimal.ONE.add(BigDecimal.valueOf(reps).divide(BigDecimal.valueOf(30), 6, RoundingMode.HALF_UP)))
                .setScale(2, RoundingMode.HALF_UP);
    }
}
