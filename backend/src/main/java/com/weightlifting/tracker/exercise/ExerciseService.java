package com.weightlifting.tracker.exercise;

import com.weightlifting.tracker.shared.ConflictException;
import com.weightlifting.tracker.shared.NotFoundException;
import com.weightlifting.tracker.session.SessionLiftRepository;
import com.weightlifting.tracker.workout.WorkoutRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ExerciseService {

    private final ExerciseRepository exerciseRepository;
    private final WorkoutRepository workoutRepository;
    private final SessionLiftRepository sessionLiftRepository;

    public ExerciseService(
            ExerciseRepository exerciseRepository,
            WorkoutRepository workoutRepository,
            SessionLiftRepository sessionLiftRepository
    ) {
        this.exerciseRepository = exerciseRepository;
        this.workoutRepository = workoutRepository;
        this.sessionLiftRepository = sessionLiftRepository;
    }

    @Transactional(readOnly = true)
    public List<ExerciseResponse> list() {
        return exerciseRepository.findAllByOrderByNameAsc().stream()
                .map(ExerciseResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public ExerciseResponse get(Long id) {
        return ExerciseResponse.from(require(id));
    }

    @Transactional
    public ExerciseResponse create(ExerciseRequest request) {
        String name = normalizeName(request.name());
        if (exerciseRepository.existsByNameIgnoreCase(name)) {
            throw new ConflictException("An exercise named \"" + name + "\" already exists.");
        }
        Exercise exercise = new Exercise(name, normalizeNotes(request.notes()), normalizeMuscle(request.muscleGroup()));
        return ExerciseResponse.from(exerciseRepository.save(exercise));
    }

    @Transactional
    public ExerciseResponse update(Long id, ExerciseRequest request) {
        Exercise exercise = require(id);
        String name = normalizeName(request.name());
        if (exerciseRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new ConflictException("An exercise named \"" + name + "\" already exists.");
        }
        exercise.setName(name);
        exercise.setNotes(normalizeNotes(request.notes()));
        exercise.setMuscleGroup(normalizeMuscle(request.muscleGroup()));
        return ExerciseResponse.from(exercise);
    }

    @Transactional
    public void delete(Long id) {
        Exercise exercise = require(id);
        if (sessionLiftRepository.existsByExerciseId(id) || workoutRepository.existsByExerciseId(id)) {
            throw new ConflictException(
                    "\"" + exercise.getName() + "\" has workouts. Delete those first, or keep the exercise."
            );
        }
        exerciseRepository.delete(exercise);
    }

    @Transactional(readOnly = true)
    public Exercise require(Long id) {
        return exerciseRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Exercise " + id + " was not found."));
    }

    private static String normalizeName(String name) {
        return name == null ? "" : name.trim().replaceAll("\\s+", " ");
    }

    public static String normalizeMuscle(String muscleGroup) {
        if (muscleGroup == null || muscleGroup.isBlank()) {
            return "OTHER";
        }
        String value = muscleGroup.trim().toUpperCase().replace(' ', '_');
        return switch (value) {
            case "CHEST", "BACK", "SHOULDERS", "LEGS", "ARMS", "CORE", "OTHER" -> value;
            default -> "OTHER";
        };
    }

    private static String normalizeNotes(String notes) {
        if (notes == null) {
            return null;
        }
        String trimmed = notes.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
