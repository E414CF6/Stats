package stats.model;

import java.util.List;

public record PlayerVanillaStats(long deaths, long timeSinceDeathMs, long mobKills, long playerKills, long damageDealt,
                                 long damageTaken, long jumps, long leaveGameCount, long walkCm, long sprintCm,
                                 long swimCm, long flyCm, long vehicleCm, long totalDistanceCm, long totalMined,
                                 List<VanillaStatItem> topMined, long totalUsed, List<VanillaStatItem> topUsed,
                                 long totalCrafted, List<VanillaStatItem> topCrafted, long totalBroken,
                                 long totalPickedUp) {
    public static PlayerVanillaStats empty() {
        return new PlayerVanillaStats(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, List.of(), 0, List.of(), 0, List.of(), 0, 0);
    }
}
