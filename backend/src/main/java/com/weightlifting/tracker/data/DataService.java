package com.weightlifting.tracker.data;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.weightlifting.tracker.exercise.Exercise;
import com.weightlifting.tracker.exercise.ExerciseRepository;
import com.weightlifting.tracker.exercise.ExerciseResponse;
import com.weightlifting.tracker.exercise.ExerciseService;
import com.weightlifting.tracker.session.GymSession;
import com.weightlifting.tracker.session.GymSessionRepository;
import com.weightlifting.tracker.session.SessionLift;
import com.weightlifting.tracker.session.SessionResponse;
import com.weightlifting.tracker.session.SessionSet;
import com.weightlifting.tracker.session.SessionStatus;
import com.weightlifting.tracker.settings.SettingsResponse;
import com.weightlifting.tracker.settings.SettingsService;
import com.weightlifting.tracker.shared.NotFoundException;
import com.weightlifting.tracker.template.TemplateExercise;
import com.weightlifting.tracker.template.TemplateResponse;
import com.weightlifting.tracker.template.TemplateService;
import com.weightlifting.tracker.template.WorkoutTemplate;
import com.weightlifting.tracker.template.WorkoutTemplateRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class DataService {

    private final ExerciseRepository exerciseRepository;
    private final ExerciseService exerciseService;
    private final GymSessionRepository sessionRepository;
    private final WorkoutTemplateRepository templateRepository;
    private final TemplateService templateService;
    private final SettingsService settingsService;
    private final ObjectMapper objectMapper;

    public DataService(
            ExerciseRepository exerciseRepository,
            ExerciseService exerciseService,
            GymSessionRepository sessionRepository,
            WorkoutTemplateRepository templateRepository,
            TemplateService templateService,
            SettingsService settingsService,
            ObjectMapper objectMapper
    ) {
        this.exerciseRepository = exerciseRepository;
        this.exerciseService = exerciseService;
        this.sessionRepository = sessionRepository;
        this.templateRepository = templateRepository;
        this.templateService = templateService;
        this.settingsService = settingsService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public BackupPayload exportJson() {
        return new BackupPayload(
                1,
                Instant.now(),
                exerciseService.list(),
                sessionRepository.findAllDetailed().stream().map(SessionResponse::from).toList(),
                templateService.list(),
                settingsService.get()
        );
    }

    @Transactional(readOnly = true)
    public String exportCsv() {
        StringBuilder csv = new StringBuilder("date,sessionId,status,exercise,muscleGroup,setIndex,weightKg,reps,volume\n");
        for (GymSession session : sessionRepository.findAllDetailed()) {
            for (SessionLift lift : session.getLifts()) {
                for (SessionSet set : lift.getSets()) {
                    BigDecimal volume = set.getWeightKg().multiply(BigDecimal.valueOf(set.getReps()));
                    csv.append(session.getPerformedOn()).append(',')
                            .append(session.getId()).append(',')
                            .append(session.getStatus()).append(',')
                            .append(csvEscape(lift.getExercise().getName())).append(',')
                            .append(lift.getExercise().getMuscleGroup()).append(',')
                            .append(set.getSetIndex()).append(',')
                            .append(set.getWeightKg().toPlainString()).append(',')
                            .append(set.getReps()).append(',')
                            .append(volume.toPlainString()).append('\n');
                }
            }
        }
        return csv.toString();
    }

    @Transactional
    public ImportResult restore(BackupPayload payload) {
        List<String> warnings = validate(payload);
        if (warnings.stream().anyMatch(w -> w.startsWith("ERROR"))) {
            throw new IllegalArgumentException(String.join("; ", warnings));
        }
        sessionRepository.deleteAll();
        templateRepository.deleteAll();
        return importPayload(payload, true);
    }

    @Transactional
    public ImportResult importJson(BackupPayload payload) {
        List<String> warnings = validate(payload);
        if (warnings.stream().anyMatch(w -> w.startsWith("ERROR"))) {
            throw new IllegalArgumentException(String.join("; ", warnings));
        }
        return importPayload(payload, false);
    }

    @Transactional
    public ImportResult importCsv(String csv) {
        if (csv == null || csv.isBlank()) {
            throw new IllegalArgumentException("CSV is empty.");
        }
        String[] lines = csv.replace("\r\n", "\n").split("\n");
        if (lines.length < 2) {
            throw new IllegalArgumentException("CSV needs a header and at least one row.");
        }
        Map<String, List<CsvRow>> bySession = new LinkedHashMap<>();
        List<String> warnings = new ArrayList<>();
        for (int i = 1; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isEmpty()) {
                continue;
            }
            String[] cols = line.split(",", -1);
            if (cols.length < 8) {
                warnings.add("ERROR row " + (i + 1) + ": expected at least 8 columns.");
                continue;
            }
            try {
                CsvRow row = new CsvRow(
                        LocalDate.parse(cols[0].trim()),
                        cols[3].replace("\"", "").trim(),
                        cols.length > 4 ? cols[4].trim() : "OTHER",
                        Integer.parseInt(cols[5].trim()),
                        new BigDecimal(cols[6].trim()),
                        Integer.parseInt(cols[7].trim())
                );
                if (row.weightKg.compareTo(BigDecimal.ZERO) <= 0 || row.reps < 1) {
                    warnings.add("ERROR row " + (i + 1) + ": weight and reps must be positive.");
                    continue;
                }
                String key = row.date + "|" + cols[1].trim();
                bySession.computeIfAbsent(key, k -> new ArrayList<>()).add(row);
            } catch (Exception ex) {
                warnings.add("ERROR row " + (i + 1) + ": " + ex.getMessage());
            }
        }
        if (warnings.stream().anyMatch(w -> w.startsWith("ERROR"))) {
            throw new IllegalArgumentException(String.join("; ", warnings));
        }
        int sessionCount = 0;
        for (List<CsvRow> rows : bySession.values()) {
            GymSession session = new GymSession(rows.get(0).date, SessionStatus.COMPLETED, null);
            Map<String, List<CsvRow>> byExercise = new LinkedHashMap<>();
            for (CsvRow row : rows) {
                byExercise.computeIfAbsent(row.exerciseName, k -> new ArrayList<>()).add(row);
            }
            List<SessionLift> lifts = new ArrayList<>();
            for (Map.Entry<String, List<CsvRow>> entry : byExercise.entrySet()) {
                CsvRow first = entry.getValue().get(0);
                Exercise exercise = upsertExercise(first.exerciseName, first.muscleGroup);
                SessionLift lift = new SessionLift(exercise, null);
                lift.replaceSets(entry.getValue().stream()
                        .sorted((a, b) -> Integer.compare(a.setIndex, b.setIndex))
                        .map(row -> new SessionSet(row.weightKg, row.reps))
                        .toList());
                lifts.add(lift);
            }
            session.replaceLifts(lifts);
            sessionRepository.save(session);
            sessionCount += 1;
        }
        return new ImportResult(exerciseRepository.findAll().size(), sessionCount, 0, warnings);
    }

    public BackupPayload parseBackup(JsonNode node) {
        try {
            return objectMapper.treeToValue(node, BackupPayload.class);
        } catch (Exception ex) {
            throw new IllegalArgumentException("JSON is not a valid Plate backup: " + ex.getMessage());
        }
    }

    private ImportResult importPayload(BackupPayload payload, boolean replace) {
        List<String> warnings = new ArrayList<>();
        Map<Long, Exercise> byOldId = new LinkedHashMap<>();
        int exerciseCount = 0;
        if (payload.exercises() != null) {
            for (ExerciseResponse row : payload.exercises()) {
                if (row.name() == null || row.name().isBlank()) {
                    warnings.add("Skipped an exercise with no name.");
                    continue;
                }
                Exercise exercise = upsertExercise(row.name(), row.muscleGroup());
                if (row.id() != null) {
                    byOldId.put(row.id(), exercise);
                }
                exerciseCount += 1;
            }
        }
        int sessionCount = 0;
        if (payload.sessions() != null) {
            for (SessionResponse row : payload.sessions()) {
                if (row.performedOn() == null || row.lifts() == null || row.lifts().isEmpty()) {
                    warnings.add("Skipped a session with no date or lifts.");
                    continue;
                }
                GymSession session = new GymSession(
                        row.performedOn(),
                        row.status() == null ? SessionStatus.COMPLETED : row.status(),
                        row.notes()
                );
                List<SessionLift> lifts = new ArrayList<>();
                for (var liftRow : row.lifts()) {
                    Exercise exercise = byOldId.get(liftRow.exerciseId());
                    if (exercise == null) {
                        exercise = upsertExercise(liftRow.exerciseName(), "OTHER");
                    }
                    if (liftRow.sets() == null || liftRow.sets().isEmpty()) {
                        warnings.add("Skipped a lift with no sets on " + row.performedOn() + ".");
                        continue;
                    }
                    SessionLift lift = new SessionLift(exercise, liftRow.notes());
                    lift.replaceSets(liftRow.sets().stream()
                            .map(set -> new SessionSet(set.weightKg(), set.reps()))
                            .toList());
                    lifts.add(lift);
                }
                if (lifts.isEmpty()) {
                    continue;
                }
                session.replaceLifts(lifts);
                sessionRepository.save(session);
                sessionCount += 1;
            }
        }
        int templateCount = 0;
        if (payload.templates() != null) {
            for (TemplateResponse row : payload.templates()) {
                if (row.name() == null || row.exercises() == null || row.exercises().isEmpty()) {
                    warnings.add("Skipped a template with no exercises.");
                    continue;
                }
                WorkoutTemplate template = new WorkoutTemplate(row.name(), row.notes());
                List<TemplateExercise> items = new ArrayList<>();
                for (var item : row.exercises()) {
                    Exercise exercise = byOldId.get(item.exerciseId());
                    if (exercise == null) {
                        exercise = upsertExercise(item.exerciseName(), "OTHER");
                    }
                    items.add(new TemplateExercise(exercise, item.targetSets(), item.targetReps(), item.targetWeightKg()));
                }
                template.replaceExercises(items);
                templateRepository.save(template);
                templateCount += 1;
            }
        }
        if (payload.settings() != null) {
            settingsService.update(new com.weightlifting.tracker.settings.SettingsRequest(payload.settings().notifyPersonalRecords()));
        }
        return new ImportResult(exerciseCount, sessionCount, templateCount, warnings);
    }

    private List<String> validate(BackupPayload payload) {
        List<String> warnings = new ArrayList<>();
        if (payload == null) {
            warnings.add("ERROR backup is empty.");
            return warnings;
        }
        if (payload.version() > 1) {
            warnings.add("ERROR unsupported backup version " + payload.version() + ".");
        }
        return warnings;
    }

    private Exercise upsertExercise(String name, String muscleGroup) {
        String trimmed = name.trim();
        return exerciseRepository.findByNameIgnoreCase(trimmed)
                .orElseGet(() -> exerciseRepository.save(new Exercise(trimmed, null, ExerciseService.normalizeMuscle(muscleGroup))));
    }

    private static String csvEscape(String value) {
        if (value.contains(",") || value.contains("\"")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    private record CsvRow(LocalDate date, String exerciseName, String muscleGroup, int setIndex, BigDecimal weightKg, int reps) {
    }
}
