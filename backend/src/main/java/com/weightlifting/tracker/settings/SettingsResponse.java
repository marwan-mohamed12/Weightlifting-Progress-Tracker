package com.weightlifting.tracker.settings;

public record SettingsResponse(boolean notifyPersonalRecords) {
    public static SettingsResponse from(AppSettings settings) {
        return new SettingsResponse(settings.isNotifyPersonalRecords());
    }
}
