package com.weightlifting.tracker.session;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface GymSessionRepository extends JpaRepository<GymSession, Long> {

    @Query("SELECT s FROM GymSession s ORDER BY s.performedOn DESC, s.id DESC")
    List<GymSession> findAllDetailed();

    @Query("SELECT s FROM GymSession s WHERE s.id = :id")
    Optional<GymSession> findDetailedById(@Param("id") Long id);

    Optional<GymSession> findFirstByStatusOrderByIdDesc(SessionStatus status);

    boolean existsByStatus(SessionStatus status);

    List<GymSession> findByStatusOrderByPerformedOnAscIdAsc(SessionStatus status);
}
