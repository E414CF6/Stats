package stats.model;

import java.util.List;

public record StatsApiResponse(ServerOverview overview, List<PlayerSummary> players) {
}
