package stats.model;

public record PlayerDetailResponse(PlayerSummary player, String queriedAt, String sourceMode) {
}
