package com.weightlifting.tracker.data;

import java.util.List;

public record ImportResult(int exercises, int sessions, int templates, List<String> warnings) {
}
