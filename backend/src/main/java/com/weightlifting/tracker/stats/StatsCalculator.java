package com.weightlifting.tracker.stats;

import com.weightlifting.tracker.exercise.Exercise;
import com.weightlifting.tracker.session.SessionSet;
import com.weightlifting.tracker.workout.Workout;
import com.weightlifting.tracker.workout.WorkoutSet;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class StatsCalculator {

    public static final BigDecimal TREND_THRESHOLD_KG = new BigDecimal("2.5");

    private StatsCalculator() {
    }

    public static LiftVisit toVisit(LocalDate date, List<SessionSet> sets) {
        List<LiftSet> liftSets = new ArrayList<>();
        for (SessionSet set : sets) {
            liftSets.add(new LiftSet(set.getWeightKg(), set.getReps(), set.getSetIndex()));
        }
        return new LiftVisit(date, liftSets);
    }

    public static LiftVisit fromWorkout(Workout workout) {
        List<LiftSet> liftSets = new ArrayList<>();
        for (WorkoutSet set : workout.getSets()) {
            liftSets.add(new LiftSet(set.getWeightKg(), set.getReps(), set.getSetIndex()));
        }
        return new LiftVisit(workout.getPerformedOn(), liftSets);
    }

    public static ExerciseStatsResponse forExercise(Exercise exercise, List<LiftVisit> visitsNewestFirst) {
        if (visitsNewestFirst.isEmpty()) {
            return new ExerciseStatsResponse(
                    exercise.getId(),
                    exercise.getName(),
                    null,
                    null,
                    null,
                    0,
                    0,
                    0,
                    BigDecimal.ZERO,
                    null,
                    new PersonalRecords(null, null, null, null, List.of()),
                    new Trend("insufficient", List.of()),
                    List.of()
            );
        }

        int totalSets = 0;
        int totalReps = 0;
        BigDecimal highestWeight = BigDecimal.ZERO;
        int highestReps = 0;
        BigDecimal highestVolume = BigDecimal.ZERO;
        BigDecimal estimated1Rm = BigDecimal.ZERO;
        BestPerformance best = null;
        Map<BigDecimal, WeightAccumulator> byWeight = new LinkedHashMap<>();
        List<SessionSnapshot> sessionsNewestFirst = new ArrayList<>();
        Map<BigDecimal, Integer> mostRepsAtWeight = new LinkedHashMap<>();

        LiftVisit latest = visitsNewestFirst.get(0);
        BigDecimal currentWeight = latest.maxWeight();

        for (LiftVisit visit : visitsNewestFirst) {
            totalSets += visit.setCount();
            totalReps += visit.totalReps();
            if (visit.volume().compareTo(highestVolume) > 0) {
                highestVolume = visit.volume();
            }
            int setIndex = 0;
            for (LiftSet set : visit.sets()) {
                setIndex += 1;
                if (set.weightKg().compareTo(highestWeight) > 0) {
                    highestWeight = set.weightKg();
                }
                if (set.reps() > highestReps) {
                    highestReps = set.reps();
                }
                BigDecimal e1rm = PersonalRecordDetector.estimatedOneRepMax(set.weightKg(), set.reps());
                if (e1rm.compareTo(estimated1Rm) > 0) {
                    estimated1Rm = e1rm;
                }
                best = better(best, visit.date(), set, setIndex);
                byWeight.computeIfAbsent(normalized(set.weightKg()), key -> new WeightAccumulator())
                        .add(visit, set.reps());
                mostRepsAtWeight.merge(normalized(set.weightKg()), set.reps(), Math::max);
            }
            sessionsNewestFirst.add(new SessionSnapshot(
                    visit.date(),
                    visit.maxWeight(),
                    visit.totalReps(),
                    visit.volume()
            ));
        }

        List<WeightFrequency> frequency = byWeight.entrySet().stream()
                .sorted(Map.Entry.<BigDecimal, WeightAccumulator>comparingByKey().reversed())
                .map(entry -> new WeightFrequency(
                        entry.getKey(),
                        entry.getValue().setCount,
                        entry.getValue().totalReps,
                        entry.getValue().visits.size()
                ))
                .toList();

        List<RepsAtWeight> repsAtWeight = mostRepsAtWeight.entrySet().stream()
                .sorted(Map.Entry.<BigDecimal, Integer>comparingByKey().reversed())
                .map(entry -> new RepsAtWeight(entry.getKey(), entry.getValue()))
                .toList();

        return new ExerciseStatsResponse(
                exercise.getId(),
                exercise.getName(),
                currentWeight,
                highestWeight,
                highestReps,
                totalSets,
                totalReps,
                visitsNewestFirst.size(),
                visitsNewestFirst.stream().map(LiftVisit::volume).reduce(BigDecimal.ZERO, BigDecimal::add),
                best,
                new PersonalRecords(highestWeight, highestReps, highestVolume, estimated1Rm, repsAtWeight),
                new Trend(trendDirection(sessionsNewestFirst), sessionsNewestFirst),
                frequency
        );
    }

    public static WeightStatsResponse forWeight(BigDecimal weightKg, Long exerciseId, String exerciseName, List<LiftVisit> visits) {
        BigDecimal target = normalized(weightKg);
        int setCount = 0;
        int totalReps = 0;
        int sessionCount = 0;
        for (LiftVisit visit : visits) {
            boolean matched = false;
            for (LiftSet set : visit.sets()) {
                if (normalized(set.weightKg()).compareTo(target) == 0) {
                    setCount += 1;
                    totalReps += set.reps();
                    matched = true;
                }
            }
            if (matched) {
                sessionCount += 1;
            }
        }
        return new WeightStatsResponse(target, exerciseId, exerciseName, setCount, totalReps, sessionCount);
    }

    static String trendDirection(List<SessionSnapshot> newestFirst) {
        if (newestFirst.size() < 2) {
            return "insufficient";
        }
        List<SessionSnapshot> chronological = new ArrayList<>(newestFirst);
        java.util.Collections.reverse(chronological);

        int recentCount = Math.min(3, chronological.size());
        List<SessionSnapshot> recent = chronological.subList(chronological.size() - recentCount, chronological.size());
        List<SessionSnapshot> older = chronological.subList(0, chronological.size() - recentCount);
        if (older.isEmpty()) {
            older = chronological.subList(0, chronological.size() - 1);
            recent = chronological.subList(chronological.size() - 1, chronological.size());
        }
        BigDecimal recentAvg = averageMax(recent);
        BigDecimal olderAvg = averageMax(older);
        BigDecimal delta = recentAvg.subtract(olderAvg);
        if (delta.compareTo(TREND_THRESHOLD_KG) >= 0) {
            return "up";
        }
        if (delta.compareTo(TREND_THRESHOLD_KG.negate()) <= 0) {
            return "down";
        }
        return "stable";
    }

    private static BigDecimal averageMax(List<SessionSnapshot> sessions) {
        BigDecimal sum = BigDecimal.ZERO;
        for (SessionSnapshot session : sessions) {
            sum = sum.add(session.maxWeightKg());
        }
        return sum.divide(BigDecimal.valueOf(sessions.size()), 4, RoundingMode.HALF_UP);
    }

    private static BestPerformance better(BestPerformance current, LocalDate date, LiftSet set, int setIndex) {
        BestPerformance candidate = new BestPerformance(date, set.weightKg(), set.reps(), setIndex);
        if (current == null) {
            return candidate;
        }
        int weightCmp = candidate.weightKg().compareTo(current.weightKg());
        if (weightCmp > 0) {
            return candidate;
        }
        if (weightCmp < 0) {
            return current;
        }
        if (candidate.reps() != current.reps()) {
            return candidate.reps() > current.reps() ? candidate : current;
        }
        return candidate.date().isAfter(current.date()) ? candidate : current;
    }

    private static BigDecimal normalized(BigDecimal weight) {
        return weight.stripTrailingZeros();
    }

    private static final class WeightAccumulator {
        private int setCount;
        private int totalReps;
        private final java.util.Set<LiftVisit> visits = new java.util.HashSet<>();

        void add(LiftVisit visit, int reps) {
            setCount += 1;
            totalReps += reps;
            visits.add(visit);
        }
    }
}
