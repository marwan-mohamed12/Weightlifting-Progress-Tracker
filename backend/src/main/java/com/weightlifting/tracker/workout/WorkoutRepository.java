package com.weightlifting.tracker.workout;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface WorkoutRepository extends JpaRepository<Workout, Long> {

    boolean existsByExerciseId(Long exerciseId);

    @EntityGraph(attributePaths = {"exercise", "sets"})
    @Query("SELECT w FROM Workout w WHERE (:exerciseId IS NULL OR w.exercise.id = :exerciseId) AND (:fromDate IS NULL OR w.performedOn >= :fromDate) AND (:toDate IS NULL OR w.performedOn <= :toDate) ORDER BY w.performedOn DESC, w.id DESC")
    List<Workout> search(
            @Param("exerciseId") Long exerciseId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate
    );

    @EntityGraph(attributePaths = {"exercise", "sets"})
    @Query("SELECT w FROM Workout w WHERE w.id = :id")
    Optional<Workout> findDetailedById(@Param("id") Long id);

    @EntityGraph(attributePaths = {"exercise", "sets"})
    List<Workout> findAllByOrderByPerformedOnDescIdDesc();

    @EntityGraph(attributePaths = {"exercise", "sets"})
    List<Workout> findByExerciseIdOrderByPerformedOnAscIdAsc(Long exerciseId);

    @EntityGraph(attributePaths = {"exercise", "sets"})
    List<Workout> findByExerciseIdOrderByPerformedOnDescIdDesc(Long exerciseId);
}
