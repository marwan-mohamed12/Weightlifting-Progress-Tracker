package com.weightlifting.tracker.template;

import com.weightlifting.tracker.exercise.ExerciseService;
import com.weightlifting.tracker.shared.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class TemplateService {

    private final WorkoutTemplateRepository templateRepository;
    private final ExerciseService exerciseService;

    public TemplateService(WorkoutTemplateRepository templateRepository, ExerciseService exerciseService) {
        this.templateRepository = templateRepository;
        this.exerciseService = exerciseService;
    }

    @Transactional(readOnly = true)
    public List<TemplateResponse> list() {
        return templateRepository.findAllByOrderByNameAsc().stream().map(TemplateResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public TemplateResponse get(Long id) {
        return TemplateResponse.from(require(id));
    }

    @Transactional
    public TemplateResponse create(TemplateRequest request) {
        WorkoutTemplate template = new WorkoutTemplate(request.name().trim(), blankToNull(request.notes()));
        template.replaceExercises(toItems(request.exercises()));
        return TemplateResponse.from(templateRepository.save(template));
    }

    @Transactional
    public TemplateResponse update(Long id, TemplateRequest request) {
        WorkoutTemplate template = require(id);
        template.setName(request.name().trim());
        template.setNotes(blankToNull(request.notes()));
        template.replaceExercises(toItems(request.exercises()));
        return TemplateResponse.from(template);
    }

    @Transactional
    public void delete(Long id) {
        templateRepository.delete(require(id));
    }

    @Transactional(readOnly = true)
    public WorkoutTemplate require(Long id) {
        return templateRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Template " + id + " was not found."));
    }

    private List<TemplateExercise> toItems(List<TemplateExerciseRequest> requests) {
        List<TemplateExercise> items = new ArrayList<>();
        for (TemplateExerciseRequest request : requests) {
            items.add(new TemplateExercise(
                    exerciseService.require(request.exerciseId()),
                    request.targetSets(),
                    request.targetReps(),
                    request.targetWeightKg()
            ));
        }
        return items;
    }

    private static String blankToNull(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }
}
