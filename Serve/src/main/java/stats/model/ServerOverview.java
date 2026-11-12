package stats.model;

import java.util.Map;

public record ServerOverview(int totalPlayers, int onlinePlayers, double totalBalance, long totalPlayTimeMs,
                             long totalPowerLevel, int totalClaims, long totalClaimedArea, long totalMinedBlocks,
                             long totalMobKills, long totalDistanceMeters, long totalAdvancements,
                             Map<String, Integer> rankDistribution, String queriedAt, String sourceMode) {
}
