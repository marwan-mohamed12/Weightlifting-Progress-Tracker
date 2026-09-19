package com.weightlifting.tracker.stats;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

@Validated
@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final StatsService statsService;

    public StatsController(StatsService statsService) {
        this.statsService = statsService;
    }

    @GetMapping("/overview")
    public ProgressOverview overview(@RequestParam(defaultValue = "30d") String range) {
        return statsService.overview(range);
    }

    @GetMapping("/exercises/{id}")
    public ExerciseStatsResponse exercise(@PathVariable Long id) {
        return statsService.forExercise(id);
    }

    @GetMapping("/weights")
    public WeightStatsResponse weight(
            @RequestParam @NotNull @DecimalMin("0.01") BigDecimal weightKg,
            @RequestParam(required = false) Long exerciseId
    ) {
        return statsService.forWeight(weightKg, exerciseId);
    }
}
