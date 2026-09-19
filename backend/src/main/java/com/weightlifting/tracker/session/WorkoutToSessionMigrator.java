package com.weightlifting.tracker.session;

import com.weightlifting.tracker.workout.Workout;
import com.weightlifting.tracker.workout.WorkoutRepository;
import com.weightlifting.tracker.workout.WorkoutSet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class WorkoutToSessionMigrator implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(WorkoutToSessionMigrator.class);

    private final GymSessionRepository sessionRepository;
    private final WorkoutRepository workoutRepository;

    public WorkoutToSessionMigrator(GymSessionRepository sessionRepository, WorkoutRepository workoutRepository) {
        this.sessionRepository = sessionRepository;
        this.workoutRepository = workoutRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (sessionRepository.count() > 0 || workoutRepository.count() == 0) {
            return;
        }
        List<Workout> workouts = workoutRepository.findAllByOrderByPerformedOnDescIdDesc();
        Map<LocalDate, List<Workout>> byDate = new LinkedHashMap<>();
        for (Workout workout : workouts) {
            byDate.computeIfAbsent(workout.getPerformedOn(), key -> new ArrayList<>()).add(workout);
        }
        int migrated = 0;
        for (Map.Entry<LocalDate, List<Workout>> entry : byDate.entrySet()) {
            GymSession session = new GymSession(entry.getKey(), SessionStatus.COMPLETED, null);
            session.setFinishedAt(Instant.now());
            List<SessionLift> lifts = new ArrayList<>();
            for (Workout workout : entry.getValue()) {
                SessionLift lift = new SessionLift(workout.getExercise(), workout.getNotes());
                lift.replaceSets(workout.getSets().stream()
                        .map(set -> new SessionSet(set.getWeightKg(), set.getReps()))
                        .toList());
                lifts.add(lift);
            }
            session.replaceLifts(lifts);
            sessionRepository.save(session);
            migrated += 1;
        }
        log.info("Migrated {} gym sessions from individual workout entries.", migrated);
    }
}
