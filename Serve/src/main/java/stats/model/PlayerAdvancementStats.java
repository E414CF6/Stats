package stats.model;

import java.util.List;
import java.util.Map;

public record PlayerAdvancementStats(int totalCompleted, Map<String, Integer> categories,
                                     List<RecentAdvancementItem> recent, List<VisitedBiomeItem> visitedBiomes,
                                     int totalBiomesTarget) {
    public static PlayerAdvancementStats empty() {
        return new PlayerAdvancementStats(0, Map.of("story", 0, "adventure", 0, "nether", 0, "end", 0, "husbandry", 0), List.of(), List.of(), 54);
    }
}
