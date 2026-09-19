package com.weightlifting.tracker.session;

import com.weightlifting.tracker.exercise.Exercise;
import com.weightlifting.tracker.exercise.ExerciseService;
import com.weightlifting.tracker.shared.ConflictException;
import com.weightlifting.tracker.shared.NotFoundException;
import com.weightlifting.tracker.template.TemplateExercise;
import com.weightlifting.tracker.template.TemplateService;
import com.weightlifting.tracker.template.WorkoutTemplate;
import com.weightlifting.tracker.stats.LiftVisit;
import com.weightlifting.tracker.stats.PersonalRecordDetector;
import com.weightlifting.tracker.stats.PersonalRecordHit;
import com.weightlifting.tracker.stats.StatsCalculator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class SessionService {

    private final GymSessionRepository sessionRepository;
    private final SessionLiftRepository liftRepository;
    private final ExerciseService exerciseService;
    private final TemplateService templateService;

    public SessionService(
            GymSessionRepository sessionRepository,
            SessionLiftRepository liftRepository,
            ExerciseService exerciseService,
            TemplateService templateService
    ) {
        this.sessionRepository = sessionRepository;
        this.liftRepository = liftRepository;
        this.exerciseService = exerciseService;
        this.templateService = templateService;
    }

    @Transactional(readOnly = true)
    public List<SessionResponse> list() {
        return sessionRepository.findAllDetailed().stream().map(SessionResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public SessionResponse get(Long id) {
        return SessionResponse.from(require(id));
    }

    @Transactional(readOnly = true)
    public SessionResponse active() {
        return sessionRepository.findFirstByStatusOrderByIdDesc(SessionStatus.IN_PROGRESS)
                .map(SessionResponse::from)
                .orElse(null);
    }

    @Transactional
    public SessionResponse start(LocalDate performedOn, String notes) {
        if (sessionRepository.existsByStatus(SessionStatus.IN_PROGRESS)) {
            throw new ConflictException("A workout is already in progress. Finish or delete it first.");
        }
        LocalDate date = performedOn == null ? LocalDate.now() : performedOn;
        GymSession session = new GymSession(date, SessionStatus.IN_PROGRESS, normalizeNotes(notes));
        return SessionResponse.from(sessionRepository.save(session));
    }

    @Transactional
    public SessionResponse startFromTemplate(Long templateId, LocalDate performedOn) {
        if (sessionRepository.existsByStatus(SessionStatus.IN_PROGRESS)) {
            throw new ConflictException("A workout is already in progress. Finish or delete it first.");
        }
        WorkoutTemplate template = templateService.require(templateId);
        LocalDate date = performedOn == null ? LocalDate.now() : performedOn;
        GymSession session = new GymSession(date, SessionStatus.IN_PROGRESS, template.getNotes());
        List<SessionLift> lifts = new ArrayList<>();
        for (TemplateExercise item : template.getExercises()) {
            SessionLift lift = new SessionLift(item.getExercise(), null);
            List<SessionSet> sets = new ArrayList<>();
            for (int i = 0; i < item.getTargetSets(); i++) {
                sets.add(new SessionSet(item.getTargetWeightKg(), item.getTargetReps()));
            }
            lift.replaceSets(sets);
            lifts.add(lift);
        }
        session.replaceLifts(lifts);
        return SessionResponse.from(sessionRepository.save(session));
    }

    @Transactional
    public SessionResponse save(Long id, SessionRequest request) {
        GymSession session = require(id);
        apply(session, request);
        return SessionResponse.from(session);
    }

    @Transactional
    public FinishResponse finish(Long id, SessionRequest request) {
        GymSession session = require(id);
        apply(session, request);
        if (session.getLifts().isEmpty()) {
            throw new IllegalArgumentException("Add at least one exercise before finishing.");
        }
        List<PersonalRecordHit> hits = new ArrayList<>();
        for (SessionLift lift : session.getLifts()) {
            List<LiftVisit> previous = previousVisits(lift.getExercise().getId(), session.getId());
            LiftVisit incoming = StatsCalculator.toVisit(session.getPerformedOn(), lift.getSets());
            hits.addAll(PersonalRecordDetector.detect(lift.getExercise(), previous, incoming));
        }
        session.setStatus(SessionStatus.COMPLETED);
        session.setFinishedAt(Instant.now());
        return new FinishResponse(SessionResponse.from(session), hits);
    }

    @Transactional
    public void delete(Long id) {
        GymSession session = require(id);
        sessionRepository.delete(session);
    }

    @Transactional(readOnly = true)
    public GymSession require(Long id) {
        return sessionRepository.findDetailedById(id)
                .orElseThrow(() -> new NotFoundException("Session " + id + " was not found."));
    }

    private void apply(GymSession session, SessionRequest request) {
        session.setPerformedOn(request.performedOn());
        session.setNotes(normalizeNotes(request.notes()));
        List<LiftRequest> liftRequests = request.lifts() == null ? List.of() : request.lifts();
        List<SessionLift> lifts = new ArrayList<>();
        for (LiftRequest liftRequest : liftRequests) {
            Exercise exercise = exerciseService.require(liftRequest.exerciseId());
            SessionLift lift = new SessionLift(exercise, normalizeNotes(liftRequest.notes()));
            lift.replaceSets(liftRequest.sets().stream()
                    .map(set -> new SessionSet(set.weightKg(), set.reps()))
                    .toList());
            lifts.add(lift);
        }
        session.replaceLifts(lifts);
    }

    private List<LiftVisit> previousVisits(Long exerciseId, Long excludeSessionId) {
        return liftRepository.findCompletedByExercise(exerciseId, SessionStatus.COMPLETED).stream()
                .filter(lift -> !lift.getSession().getId().equals(excludeSessionId))
                .map(lift -> StatsCalculator.toVisit(lift.getSession().getPerformedOn(), lift.getSets()))
                .toList();
    }

    private static String normalizeNotes(String notes) {
        if (notes == null) {
            return null;
        }
        String trimmed = notes.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
