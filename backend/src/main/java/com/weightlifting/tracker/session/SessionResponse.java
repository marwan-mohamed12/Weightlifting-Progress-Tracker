package com.weightlifting.tracker.session;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record SessionResponse(
        Long id,
        LocalDate performedOn,
        SessionStatus status,
        String notes,
        String summary,
        int exerciseCount,
        int setCount,
        List<LiftResponse> lifts,
        Instant createdAt,
        Instant updatedAt,
        Instant finishedAt
) {
    public static SessionResponse from(GymSession session) {
        List<LiftResponse> lifts = session.getLifts().stream().map(LiftResponse::from).toList();
        int sets = session.getLifts().stream().mapToInt(lift -> lift.getSets().size()).sum();
        String summary = lifts.size() + " exercise" + (lifts.size() == 1 ? "" : "s")
                + " · " + sets + " set" + (sets == 1 ? "" : "s");
        return new SessionResponse(
                session.getId(),
                session.getPerformedOn(),
                session.getStatus(),
                session.getNotes(),
                summary,
                lifts.size(),
                sets,
                lifts,
                session.getCreatedAt(),
                session.getUpdatedAt(),
                session.getFinishedAt()
        );
    }
}
