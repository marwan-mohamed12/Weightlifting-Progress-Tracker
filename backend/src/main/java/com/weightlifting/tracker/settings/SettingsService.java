package com.weightlifting.tracker.settings;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SettingsService {

    private final AppSettingsRepository settingsRepository;

    public SettingsService(AppSettingsRepository settingsRepository) {
        this.settingsRepository = settingsRepository;
    }

    @Transactional
    public SettingsResponse get() {
        return SettingsResponse.from(load());
    }

    @Transactional
    public SettingsResponse update(SettingsRequest request) {
        AppSettings settings = load();
        settings.setNotifyPersonalRecords(request.notifyPersonalRecords());
        return SettingsResponse.from(settings);
    }

    private AppSettings load() {
        return settingsRepository.findById(1L).orElseGet(() -> settingsRepository.save(new AppSettings()));
    }
}
