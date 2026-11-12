package stats.model;

import java.util.List;

public record ClaimItem(long id, String world, int minX, int minY, int minZ, int maxX, int maxY, int maxZ, int width,
                        int length, int area, List<String> builders, List<String> containers, List<String> accessors,
                        List<String> managers) {
}
