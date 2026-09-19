package com.weightlifting.tracker.stats;

import com.weightlifting.tracker.exercise.Exercise;
import com.weightlifting.tracker.exercise.ExerciseService;
import com.weightlifting.tracker.session.GymSession;
import com.weightlifting.tracker.session.GymSessionRepository;
import com.weightlifting.tracker.session.SessionLift;
import com.weightlifting.tracker.session.SessionLiftRepository;
import com.weightlifting.tracker.session.SessionStatus;
import com.weightlifting.tracker.workout.Workout;
import com.weightlifting.tracker.workout.WorkoutRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
public class StatsService {

    private final ExerciseService exerciseService;
    private final SessionLiftRepository liftRepository;
    private final WorkoutRepository workoutRepository;
    private final GymSessionRepository sessionRepository;

    public StatsService(
            ExerciseService exerciseService,
            SessionLiftRepository liftRepository,
            WorkoutRepository workoutRepository,
            GymSessionRepository sessionRepository
    ) {
        this.exerciseService = exerciseService;
        this.liftRepository = liftRepository;
        this.workoutRepository = workoutRepository;
        this.sessionRepository = sessionRepository;
    }

    @Transactional(readOnly = true)
    public ExerciseStatsResponse forExercise(Long exerciseId) {
        Exercise exercise = exerciseService.require(exerciseId);
        return StatsCalculator.forExercise(exercise, visitsFor(exerciseId));
    }

    @Transactional(readOnly = true)
    public ProgressOverview overview(String range) {
        List<GymSession> completed = sessionRepository.findByStatusOrderByPerformedOnAscIdAsc(SessionStatus.COMPLETED);
        return ProgressCalculator.overview(completed, range, LocalDate.now());
    }

    @Transactional(readOnly = true)
    public WeightStatsResponse forWeight(BigDecimal weightKg, Long exerciseId) {
        if (exerciseId != null) {
            Exercise exercise = exerciseService.require(exerciseId);
            return StatsCalculator.forWeight(weightKg, exercise.getId(), exercise.getName(), visitsFor(exerciseId));
        }
        List<LiftVisit> visits = liftRepository.findCompleted(SessionStatus.COMPLETED).stream()
                .map(lift -> StatsCalculator.toVisit(lift.getSession().getPerformedOn(), lift.getSets()))
                .toList();
        if (visits.isEmpty()) {
            visits = workoutRepository.findAllByOrderByPerformedOnDescIdDesc().stream()
                    .map(StatsCalculator::fromWorkout)
                    .toList();
        }
        return StatsCalculator.forWeight(weightKg, null, null, visits);
    }

    private List<LiftVisit> visitsFor(Long exerciseId) {
        List<SessionLift> lifts = liftRepository.findCompletedByExercise(exerciseId, SessionStatus.COMPLETED);
        if (!lifts.isEmpty()) {
            return lifts.stream()
                    .map(lift -> StatsCalculator.toVisit(lift.getSession().getPerformedOn(), lift.getSets()))
                    .toList();
        }
        List<Workout> workouts = workoutRepository.findByExerciseIdOrderByPerformedOnDescIdDesc(exerciseId);
        return workouts.stream().map(StatsCalculator::fromWorkout).toList();
    }
}
