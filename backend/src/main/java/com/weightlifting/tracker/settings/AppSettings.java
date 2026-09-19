package com.weightlifting.tracker.settings;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "app_settings")
public class AppSettings {

    @Id
    private Long id = 1L;

    @Column(nullable = false)
    private boolean notifyPersonalRecords = true;

    public Long getId() {
        return id;
    }

    public boolean isNotifyPersonalRecords() {
        return notifyPersonalRecords;
    }

    public void setNotifyPersonalRecords(boolean notifyPersonalRecords) {
        this.notifyPersonalRecords = notifyPersonalRecords;
    }
}
