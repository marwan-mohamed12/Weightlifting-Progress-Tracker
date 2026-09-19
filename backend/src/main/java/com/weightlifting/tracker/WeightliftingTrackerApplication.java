package com.weightlifting.tracker;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.nio.file.Files;
import java.nio.file.Path;

@SpringBootApplication
public class WeightliftingTrackerApplication {

    public static void main(String[] args) throws Exception {
        Path dataDir = Path.of("data");
        Files.createDirectories(dataDir);
        SpringApplication.run(WeightliftingTrackerApplication.class, args);
    }
}
