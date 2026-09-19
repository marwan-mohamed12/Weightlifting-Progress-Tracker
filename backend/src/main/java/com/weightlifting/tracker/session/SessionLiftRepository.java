package com.weightlifting.tracker.session;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SessionLiftRepository extends JpaRepository<SessionLift, Long> {

    boolean existsByExerciseId(Long exerciseId);

    @EntityGraph(attributePaths = {"session", "exercise", "sets"})
    @Query("""
            SELECT l FROM SessionLift l
            WHERE l.exercise.id = :exerciseId AND l.session.status = :status
            ORDER BY l.session.performedOn DESC, l.session.id DESC, l.orderIndex ASC
            """)
    List<SessionLift> findCompletedByExercise(
            @Param("exerciseId") Long exerciseId,
            @Param("status") SessionStatus status
    );

    @EntityGraph(attributePaths = {"session", "exercise", "sets"})
    @Query("""
            SELECT l FROM SessionLift l
            WHERE l.session.status = :status
            ORDER BY l.session.performedOn DESC, l.session.id DESC
            """)
    List<SessionLift> findCompleted(@Param("status") SessionStatus status);
}
