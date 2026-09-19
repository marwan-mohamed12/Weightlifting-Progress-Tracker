package com.weightlifting.tracker;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ApiIntegrationTest {

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) throws Exception {
        Path db = Path.of("target", "plate-test.db");
        Files.createDirectories(db.getParent());
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + db.toAbsolutePath());
    }

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @BeforeEach
    void clean() {
        jdbcTemplate.execute("DELETE FROM session_sets");
        jdbcTemplate.execute("DELETE FROM session_lifts");
        jdbcTemplate.execute("DELETE FROM gym_sessions");
        jdbcTemplate.execute("DELETE FROM template_exercises");
        jdbcTemplate.execute("DELETE FROM workout_templates");
        jdbcTemplate.execute("DELETE FROM workout_sets");
        jdbcTemplate.execute("DELETE FROM workouts");
        jdbcTemplate.execute("DELETE FROM exercises");
        jdbcTemplate.execute("DELETE FROM app_settings");
    }

    @Test
    void exerciseCrudAndDuplicateNameConflict() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/exercises")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"  Bench press  \",\"notes\":\"flat bench\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Bench press"))
                .andReturn();

        long id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(post("/api/exercises")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"bench press\"}"))
                .andExpect(status().isConflict());

        mockMvc.perform(put("/api/exercises/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Pause bench\",\"notes\":\"\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Pause bench"))
                .andExpect(jsonPath("$.notes").isEmpty());

        mockMvc.perform(get("/api/exercises"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        mockMvc.perform(delete("/api/exercises/" + id))
                .andExpect(status().isNoContent());
    }

    @Test
    void cannotDeleteExerciseThatHasWorkouts() throws Exception {
        long exerciseId = createExercise("Squat");
        createCompletedSession(exerciseId, "2026-09-01", "60", 5, 5, 5);

        mockMvc.perform(delete("/api/exercises/" + exerciseId))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("CONFLICT"));
    }

    @Test
    void sessionLifecycleAndStats() throws Exception {
        long benchId = createExercise("Bench press");
        long squatId = createExercise("Squat");

        MvcResult started = mockMvc.perform(post("/api/sessions/start")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"performedOn\":\"2026-09-19\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                .andReturn();
        long sessionId = objectMapper.readTree(started.getResponse().getContentAsString()).get("id").asLong();

        MvcResult finished = mockMvc.perform(post("/api/sessions/" + sessionId + "/finish")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(sessionBody(benchId, squatId, "2026-09-19")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.session.status").value("COMPLETED"))
                .andExpect(jsonPath("$.session.exerciseCount").value(2))
                .andExpect(jsonPath("$.personalRecords.length()").value(org.hamcrest.Matchers.greaterThan(0)))
                .andReturn();
        assertThat(finished.getResponse().getContentAsString()).contains("HEAVIEST_WEIGHT");

        mockMvc.perform(get("/api/sessions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        mockMvc.perform(get("/api/stats/exercises/" + benchId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.highestWeightKg").value(40))
                .andExpect(jsonPath("$.currentWeightKg").value(40))
                .andExpect(jsonPath("$.highestReps").value(8))
                .andExpect(jsonPath("$.totalSets").value(3))
                .andExpect(jsonPath("$.totalReps").value(21))
                .andExpect(jsonPath("$.sessionCount").value(1));

        mockMvc.perform(get("/api/settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notifyPersonalRecords").value(true));

        mockMvc.perform(put("/api/settings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"notifyPersonalRecords\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notifyPersonalRecords").value(false));

        mockMvc.perform(delete("/api/sessions/" + sessionId))
                .andExpect(status().isNoContent());
    }

    private long createExercise(String name) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/exercises")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("id").asLong();
    }

    private void createCompletedSession(long exerciseId, String date, String kg, int... reps) throws Exception {
        MvcResult started = mockMvc.perform(post("/api/sessions/start")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"performedOn\":\"" + date + "\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        long sessionId = objectMapper.readTree(started.getResponse().getContentAsString()).get("id").asLong();
        StringBuilder sets = new StringBuilder();
        for (int i = 0; i < reps.length; i++) {
            if (i > 0) {
                sets.append(',');
            }
            sets.append("{\"weightKg\":").append(kg).append(",\"reps\":").append(reps[i]).append('}');
        }
        mockMvc.perform(post("/api/sessions/" + sessionId + "/finish")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"performedOn":"%s","lifts":[{"exerciseId":%d,"sets":[%s]}]}
                                """.formatted(date, exerciseId, sets)))
                .andExpect(status().isOk());
    }

    private static String sessionBody(long benchId, long squatId, String date) {
        return """
                {
                  "performedOn": "%s",
                  "lifts": [
                    {"exerciseId": %d, "sets": [{"weightKg": 40, "reps": 8}, {"weightKg": 40, "reps": 7}, {"weightKg": 40, "reps": 6}]},
                    {"exerciseId": %d, "sets": [{"weightKg": 80, "reps": 5}, {"weightKg": 80, "reps": 5}, {"weightKg": 80, "reps": 5}]}
                  ]
                }
                """.formatted(date, benchId, squatId);
    }
}
