package com.weightlifting.tracker.session;

import com.weightlifting.tracker.exercise.Exercise;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "session_lifts")
public class SessionLift {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private GymSession session;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "exercise_id", nullable = false)
    private Exercise exercise;

    @Column(nullable = false)
    private int orderIndex;

    @Column(length = 2000)
    private String notes;

    @OneToMany(mappedBy = "lift", cascade = CascadeType.ALL, orphanRemoval = true)
    @Fetch(FetchMode.SUBSELECT)
    @OrderBy("setIndex ASC")
    private List<SessionSet> sets = new ArrayList<>();

    protected SessionLift() {
    }

    public SessionLift(Exercise exercise, String notes) {
        this.exercise = exercise;
        this.notes = notes;
    }

    public void replaceSets(List<SessionSet> next) {
        sets.clear();
        int index = 1;
        for (SessionSet set : next) {
            set.setLift(this);
            set.setSetIndex(index++);
            sets.add(set);
        }
    }

    public Long getId() {
        return id;
    }

    public GymSession getSession() {
        return session;
    }

    public void setSession(GymSession session) {
        this.session = session;
    }

    public Exercise getExercise() {
        return exercise;
    }

    public void setExercise(Exercise exercise) {
        this.exercise = exercise;
    }

    public int getOrderIndex() {
        return orderIndex;
    }

    public void setOrderIndex(int orderIndex) {
        this.orderIndex = orderIndex;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public List<SessionSet> getSets() {
        return sets;
    }
}
