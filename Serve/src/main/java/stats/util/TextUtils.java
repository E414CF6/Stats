package stats.util;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public final class TextUtils {

    private TextUtils() {
    }

    /**
     * Strips hex color codes {#RRGGBB} and legacy color/formatting codes (&x, §x).
     * Returns null if input is null or resulting string is empty.
     */
    public static String stripMinecraftCodes(String text) {
        if (text == null) {
            return null;
        }
        String stripped = text.replaceAll("\\{#[0-9a-fA-F]{6}\\}", "").replaceAll("[&§][0-9a-fk-orA-FK-OR]", "").trim();
        return stripped.isEmpty() ? null : stripped;
    }

    /**
     * Strips "minecraft:" namespace prefix.
     */
    public static String stripNamespace(String id) {
        if (id == null) {
            return "";
        }
        return id.startsWith("minecraft:") ? id.substring("minecraft:".length()) : id;
    }

    /**
     * Formats CMI YYMMDD integer date into YYYY-MM-DD.
     */
    public static String formatCmiDate(int dateInt) {
        if (dateInt <= 0) {
            return "누적/기타";
        }
        String str = String.format("%06d", dateInt);
        String yy = str.substring(0, 2);
        String mm = str.substring(2, 4);
        String dd = str.substring(4, 6);
        return "20" + yy + "-" + mm + "-" + dd;
    }

    /**
     * Parses GriefPrevention corner format: "world;x;y;z;..."
     */
    public static Corner parseCorner(String corner) {
        if (corner == null || corner.isBlank()) {
            return null;
        }
        String[] parts = corner.split(";");
        if (parts.length < 4) {
            return null;
        }
        try {
            String world = parts[0];
            int x = (int) Math.round(Double.parseDouble(parts[1]));
            int y = (int) Math.round(Double.parseDouble(parts[2]));
            int z = (int) Math.round(Double.parseDouble(parts[3]));
            return new Corner(world, x, y, z);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    /**
     * Parses semicolon/comma-separated GriefPrevention access list.
     * Maps "public" and "all" to "전체 공개", and UUIDs to known player names.
     */
    public static List<String> parseListField(String raw, Map<String, String> uuidToUsername) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        List<String> result = new ArrayList<>();
        String[] tokens = raw.split("[;,]");
        for (String token : tokens) {
            String cleaned = token.trim().replaceAll("^\\[|\\]$", "");
            if (cleaned.isEmpty()) {
                continue;
            }
            String lower = cleaned.toLowerCase();
            if (lower.equals("public") || lower.equals("all")) {
                result.add("전체 공개");
            } else {
                String mapped = uuidToUsername != null ? uuidToUsername.get(lower) : null;
                result.add(mapped != null ? mapped : cleaned);
            }
        }
        return result;
    }

    public record Corner(String world, int x, int y, int z) {
    }
}
