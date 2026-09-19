package com.weightlifting.tracker.session;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/sessions")
public class SessionController {

    private final SessionService sessionService;

    public SessionController(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    @GetMapping
    public List<SessionResponse> list() {
        return sessionService.list();
    }

    @GetMapping("/active")
    public SessionResponse active() {
        return sessionService.active();
    }

    @GetMapping("/{id}")
    public SessionResponse get(@PathVariable Long id) {
        return sessionService.get(id);
    }

    @PostMapping("/start")
    @ResponseStatus(HttpStatus.CREATED)
    public SessionResponse start(@RequestBody(required = false) SessionRequest request) {
        LocalDate date = request == null ? null : request.performedOn();
        String notes = request == null ? null : request.notes();
        return sessionService.start(date, notes);
    }

    @PostMapping("/start-from-template/{templateId}")
    @ResponseStatus(HttpStatus.CREATED)
    public SessionResponse startFromTemplate(
            @PathVariable Long templateId,
            @RequestBody(required = false) SessionRequest request
    ) {
        LocalDate date = request == null ? null : request.performedOn();
        return sessionService.startFromTemplate(templateId, date);
    }

    @PutMapping("/{id}")
    public SessionResponse save(@PathVariable Long id, @Valid @RequestBody SessionRequest request) {
        return sessionService.save(id, request);
    }

    @PostMapping("/{id}/finish")
    public FinishResponse finish(@PathVariable Long id, @Valid @RequestBody SessionRequest request) {
        return sessionService.finish(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        sessionService.delete(id);
    }
}
