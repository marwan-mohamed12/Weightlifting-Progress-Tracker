package com.weightlifting.tracker.data;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/data")
public class DataController {

    private final DataService dataService;

    public DataController(DataService dataService) {
        this.dataService = dataService;
    }

    @GetMapping("/export.json")
    public BackupPayload exportJson() {
        return dataService.exportJson();
    }

    @GetMapping("/backup")
    public BackupPayload backup() {
        return dataService.exportJson();
    }

    @GetMapping(value = "/export.csv", produces = "text/csv")
    public ResponseEntity<String> exportCsv() {
        String csv = dataService.exportCsv();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"plate-workouts.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv);
    }

    @PostMapping("/import.json")
    public ImportResult importJson(@RequestBody JsonNode body) {
        return dataService.importJson(dataService.parseBackup(body));
    }

    @PostMapping("/restore")
    public ImportResult restore(@RequestBody JsonNode body) {
        return dataService.restore(dataService.parseBackup(body));
    }

    @PostMapping(value = "/import.csv", consumes = {"text/csv", "text/plain", MediaType.APPLICATION_JSON_VALUE})
    public ImportResult importCsv(@RequestBody String csv) {
        return dataService.importCsv(csv);
    }
}
