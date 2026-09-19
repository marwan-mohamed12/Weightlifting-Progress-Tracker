package com.weightlifting.tracker.session;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;

@Entity
@Table(name = "session_sets")
public class SessionSet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "lift_id", nullable = false)
    private SessionLift lift;

    @Column(nullable = false)
    private int setIndex;

    @Column(nullable = false, precision = 8, scale = 2)
    private BigDecimal weightKg;

    @Column(nullable = false)
    private int reps;

    protected SessionSet() {
    }

    public SessionSet(BigDecimal weightKg, int reps) {
        this.weightKg = weightKg;
        this.reps = reps;
    }

    public Long getId() {
        return id;
    }

    public SessionLift getLift() {
        return lift;
    }

    public void setLift(SessionLift lift) {
        this.lift = lift;
    }

    public int getSetIndex() {
        return setIndex;
    }

    public void setSetIndex(int setIndex) {
        this.setIndex = setIndex;
    }

    public BigDecimal getWeightKg() {
        return weightKg;
    }

    public int getReps() {
        return reps;
    }
}
