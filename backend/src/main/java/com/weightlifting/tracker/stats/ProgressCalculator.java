package com.weightlifting.tracker.stats;

import com.weightlifting.tracker.session.GymSession;
import com.weightlifting.tracker.session.SessionLift;
import com.weightlifting.tracker.session.SessionSet;
import com.weightlifting.tracker.session.SessionStatus;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class ProgressCalculator {

    private ProgressCalculator() {
    }

    public static LocalDate startFor(String range, LocalDate today) {
        if (range == null || range.isBlank() || "all".equalsIgnoreCase(range)) {
            return null;
        }
        return switch (range.toLowerCase()) {
            case "7d" -> today.minusDays(6);
            case "30d" -> today.minusDays(29);
            case "90d", "3m" -> today.minusDays(89);
            case "6m" -> today.minusMonths(6);
            case "1y" -> today.minusYears(1);
            case "30m" -> today.minusMonths(30);
            default -> today.minusDays(29);
        };
    }

    public static ProgressOverview overview(List<GymSession> completed, String range, LocalDate today) {
        LocalDate from = startFor(range, today);
        List<GymSession> inRange = completed.stream()
                .filter(session -> from == null || !session.getPerformedOn().isBefore(from))
                .filter(session -> !session.getPerformedOn().isAfter(today))
                .toList();

        BigDecimal currentVolume = volume(inRange);
        long days = from == null ? Math.max(1, ChronoUnit.DAYS.between(earliest(inRange, today), today) + 1) : ChronoUnit.DAYS.between(from, today) + 1;
        BigDecimal weeks = BigDecimal.valueOf(Math.max(days / 7.0, 1.0));
        BigDecimal weeklyVolume = currentVolume.divide(weeks, 2, RoundingMode.HALF_UP);
        BigDecimal weeklyFrequency = BigDecimal.valueOf(inRange.size()).divide(weeks, 2, RoundingMode.HALF_UP);

        LocalDate monthStart = today.withDayOfMonth(1);
        BigDecimal monthlyVolume = volume(completed.stream()
                .filter(session -> !session.getPerformedOn().isBefore(monthStart) && !session.getPerformedOn().isAfter(today))
                .toList());

        WeightRepTotals totals = totals(inRange);
        BigDecimal avgWeight = totals.sets == 0 ? BigDecimal.ZERO : totals.weightSum.divide(BigDecimal.valueOf(totals.sets), 2, RoundingMode.HALF_UP);
        BigDecimal avgReps = totals.sets == 0 ? BigDecimal.ZERO : BigDecimal.valueOf(totals.repsSum).divide(BigDecimal.valueOf(totals.sets), 2, RoundingMode.HALF_UP);

        LocalDate previousFrom = from == null ? null : from.minusDays(days);
        LocalDate previousTo = from == null ? null : from.minusDays(1);
        BigDecimal previousVolume = previousFrom == null ? BigDecimal.ZERO : volume(completed.stream()
                .filter(session -> !session.getPerformedOn().isBefore(previousFrom) && !session.getPerformedOn().isAfter(previousTo))
                .toList());
        BigDecimal progressPercent = percentDelta(previousVolume, currentVolume);

        return new ProgressOverview(
                range == null ? "all" : range,
                from,
                today,
                weeklyVolume,
                monthlyVolume,
                weeklyFrequency,
                avgWeight,
                avgReps,
                progressPercent,
                currentVolume,
                previousVolume,
                volumeByMuscle(inRange),
                exerciseFrequency(inRange),
                monthComparison(completed, today),
                prTimeline(completed, from, today)
        );
    }

    static PeriodComparison monthComparison(List<GymSession> completed, LocalDate today) {
        LocalDate thisStart = today.withDayOfMonth(1);
        LocalDate lastStart = thisStart.minusMonths(1);
        LocalDate lastEnd = thisStart.minusDays(1);
        PeriodStats thisMonth = period("This month", completed, thisStart, today);
        PeriodStats lastMonth = period("Last month", completed, lastStart, lastEnd);
        return new PeriodComparison(thisMonth, lastMonth, percentDelta(lastMonth.volume(), thisMonth.volume()));
    }

    private static PeriodStats period(String label, List<GymSession> completed, LocalDate from, LocalDate to) {
        List<GymSession> rows = completed.stream()
                .filter(session -> !session.getPerformedOn().isBefore(from) && !session.getPerformedOn().isAfter(to))
                .toList();
        WeightRepTotals totals = totals(rows);
        BigDecimal avg = totals.sets == 0 ? BigDecimal.ZERO : totals.weightSum.divide(BigDecimal.valueOf(totals.sets), 2, RoundingMode.HALF_UP);
        return new PeriodStats(label, volume(rows), rows.size(), avg);
    }

    static BigDecimal volume(List<GymSession> sessions) {
        BigDecimal sum = BigDecimal.ZERO;
        for (GymSession session : sessions) {
            for (SessionLift lift : session.getLifts()) {
                for (SessionSet set : lift.getSets()) {
                    sum = sum.add(set.getWeightKg().multiply(BigDecimal.valueOf(set.getReps())));
                }
            }
        }
        return sum.setScale(2, RoundingMode.HALF_UP);
    }

    private static List<NamedVolume> volumeByMuscle(List<GymSession> sessions) {
        Map<String, BigDecimal> map = new LinkedHashMap<>();
        for (GymSession session : sessions) {
            for (SessionLift lift : session.getLifts()) {
                String group = lift.getExercise().getMuscleGroup() == null ? "OTHER" : lift.getExercise().getMuscleGroup();
                BigDecimal liftVolume = BigDecimal.ZERO;
                for (SessionSet set : lift.getSets()) {
                    liftVolume = liftVolume.add(set.getWeightKg().multiply(BigDecimal.valueOf(set.getReps())));
                }
                map.merge(group, liftVolume, BigDecimal::add);
            }
        }
        return map.entrySet().stream()
                .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                .map(entry -> new NamedVolume(entry.getKey(), entry.getValue().setScale(2, RoundingMode.HALF_UP)))
                .toList();
    }

    private static List<ExerciseFrequency> exerciseFrequency(List<GymSession> sessions) {
        Map<Long, ExerciseFrequency> map = new LinkedHashMap<>();
        for (GymSession session : sessions) {
            for (SessionLift lift : session.getLifts()) {
                Long id = lift.getExercise().getId();
                ExerciseFrequency current = map.get(id);
                if (current == null) {
                    map.put(id, new ExerciseFrequency(id, lift.getExercise().getName(), 1));
                } else {
                    map.put(id, new ExerciseFrequency(id, current.name(), current.sessions() + 1));
                }
            }
        }
        return map.values().stream()
                .sorted(Comparator.comparingInt(ExerciseFrequency::sessions).reversed())
                .toList();
    }

    static List<PersonalRecordHit> prTimeline(List<GymSession> completed, LocalDate from, LocalDate to) {
        List<GymSession> chronological = completed.stream()
                .sorted(Comparator.comparing(GymSession::getPerformedOn).thenComparing(GymSession::getId))
                .toList();
        Map<Long, List<LiftVisit>> history = new HashMap<>();
        List<PersonalRecordHit> timeline = new ArrayList<>();
        for (GymSession session : chronological) {
            for (SessionLift lift : session.getLifts()) {
                Long exerciseId = lift.getExercise().getId();
                List<LiftVisit> previous = history.getOrDefault(exerciseId, List.of());
                LiftVisit incoming = StatsCalculator.toVisit(session.getPerformedOn(), lift.getSets());
                List<PersonalRecordHit> hits = PersonalRecordDetector.detect(lift.getExercise(), previous, incoming);
                List<LiftVisit> next = new ArrayList<>(previous);
                next.add(incoming);
                history.put(exerciseId, next);
                if (from != null && session.getPerformedOn().isBefore(from)) {
                    continue;
                }
                if (session.getPerformedOn().isAfter(to)) {
                    continue;
                }
                timeline.addAll(hits);
            }
        }
        return timeline;
    }

    private static LocalDate earliest(List<GymSession> sessions, LocalDate fallback) {
        return sessions.stream().map(GymSession::getPerformedOn).min(LocalDate::compareTo).orElse(fallback);
    }

    static BigDecimal percentDelta(BigDecimal previous, BigDecimal current) {
        if (previous.compareTo(BigDecimal.ZERO) == 0) {
            return current.compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ZERO : new BigDecimal("100");
        }
        return current.subtract(previous)
                .multiply(BigDecimal.valueOf(100))
                .divide(previous, 1, RoundingMode.HALF_UP);
    }

    private static WeightRepTotals totals(List<GymSession> sessions) {
        BigDecimal weightSum = BigDecimal.ZERO;
        int repsSum = 0;
        int sets = 0;
        for (GymSession session : sessions) {
            for (SessionLift lift : session.getLifts()) {
                for (SessionSet set : lift.getSets()) {
                    weightSum = weightSum.add(set.getWeightKg());
                    repsSum += set.getReps();
                    sets += 1;
                }
            }
        }
        return new WeightRepTotals(weightSum, repsSum, sets);
    }

    private record WeightRepTotals(BigDecimal weightSum, int repsSum, int sets) {
    }
}
