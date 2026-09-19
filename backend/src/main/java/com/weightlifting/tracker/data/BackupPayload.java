package com.weightlifting.tracker.data;

import com.weightlifting.tracker.exercise.ExerciseResponse;
import com.weightlifting.tracker.session.SessionResponse;
import com.weightlifting.tracker.settings.SettingsResponse;
import com.weightlifting.tracker.template.TemplateResponse;

import java.time.Instant;
import java.util.List;

public record BackupPayload(
        int version,
        Instant exportedAt,
        List<ExerciseResponse> exercises,
        List<SessionResponse> sessions,
        List<TemplateResponse> templates,
        SettingsResponse settings
) {
}
