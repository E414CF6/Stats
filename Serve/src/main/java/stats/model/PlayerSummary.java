package stats.model;

import java.util.List;
import java.util.Map;

public record PlayerSummary(String uuid, String username, String nickname, String displayName, String primaryGroup,
                            String rank, double balance, long totalPlayTimeMs, long lastLoginTime, long lastLogoffTime,
                            boolean isOnline, long votes, long powerLevel, Map<String, PlayerSkillStat> skills,
                            PlayerSpecialty specialty, PlayerClaims claims, List<PlaytimeDayRecord> playtimeHistory,
                            List<Long> hourlyDistribution, PlayerVanillaStats vanillaStats,
                            PlayerAdvancementStats advancements) {
}
