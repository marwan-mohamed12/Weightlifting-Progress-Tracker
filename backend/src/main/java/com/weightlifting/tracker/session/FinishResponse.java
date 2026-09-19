package com.weightlifting.tracker.session;

import com.weightlifting.tracker.stats.PersonalRecordHit;

import java.util.List;

public record FinishResponse(
        SessionResponse session,
        List<PersonalRecordHit> personalRecords
) {
}
