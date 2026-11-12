package stats.model;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ModelSerializationTest {

    @Test
    void testSerializationStructure() {
        Gson gson = new GsonBuilder().serializeNulls().create();

        ServerOverview overview = new ServerOverview(1, 1, 5000.0, 3600000L, 100L, 2, 500L, 1000L, 50L, 12000L, 20L, Map.of("Coal", 1), "2026-11-12T00:00:00Z", "local-mariadb");

        PlayerSkillStat skill = new PlayerSkillStat(10, 500L, 1220L);
        PlayerSpecialty specialty = new PlayerSpecialty("채집 전문가 · 채광 특화", "gathering", "mining", 10, 0, 0);
        PlayerClaims claims = new PlayerClaims(100, 50, 150, 50, 100, 1, List.of(new ClaimItem(1, "world", 0, 0, 0, 10, 10, 10, 11, 11, 121, List.of("User1"), List.of(), List.of(), List.of())));

        PlayerSummary player = new PlayerSummary("00000000-0000-0000-0000-000000000001", "Tester", null, null, "default", "Coal", 5000.0, 3600000L, 1700000000000L, 1700000000000L, true, 5, 100L, Map.of("mining", skill), specialty, claims, List.of(new PlaytimeDayRecord(241026, "2024-10-26", List.of(0L, 100L), 100L)), List.of(100L), PlayerVanillaStats.empty(), PlayerAdvancementStats.empty());

        StatsApiResponse response = new StatsApiResponse(overview, List.of(player));

        String json = gson.toJson(response);
        assertNotNull(json);
        assertTrue(json.contains("\"overview\""));
        assertTrue(json.contains("\"players\""));
        assertTrue(json.contains("\"totalPlayers\":1"));
        assertTrue(json.contains("\"sourceMode\":\"local-mariadb\""));
        assertTrue(json.contains("\"username\":\"Tester\""));
    }
}
