package com.weightlifting.tracker.settings;

import jakarta.validation.constraints.NotNull;

public record SettingsRequest(@NotNull Boolean notifyPersonalRecords) {
}
