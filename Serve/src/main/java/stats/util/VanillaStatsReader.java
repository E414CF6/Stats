package stats.util;

import stats.model.PlayerVanillaStats;
import stats.model.VanillaStatItem;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.File;
import java.io.FileReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

public final class VanillaStatsReader {

    private VanillaStatsReader() {
    }

    public static PlayerVanillaStats readStats(File worldDir, String uuid) {
        if (worldDir == null || uuid == null) {
            return PlayerVanillaStats.empty();
        }

        File file = new File(worldDir, "players/stats/" + uuid + ".json");
        if (!file.exists()) {
            file = new File(worldDir, "stats/" + uuid + ".json");
        }
        if (!file.exists() || !file.canRead()) {
            return PlayerVanillaStats.empty();
        }

        try (FileReader reader = new FileReader(file, StandardCharsets.UTF_8)) {
            JsonElement rootElem = JsonParser.parseReader(reader);
            if (!rootElem.isJsonObject()) {
                return PlayerVanillaStats.empty();
            }

            JsonObject root = rootElem.getAsJsonObject();
            JsonObject statsObj = root.has("stats") && root.get("stats").isJsonObject() ? root.getAsJsonObject("stats") : root;

            JsonObject custom = statsObj.has("minecraft:custom") && statsObj.get("minecraft:custom").isJsonObject() ? statsObj.getAsJsonObject("minecraft:custom") : new JsonObject();

            long deaths = getLong(custom, "minecraft:deaths");
            long timeSinceDeathMs = getLong(custom, "minecraft:time_since_death") * 50L;
            long mobKills = getLong(custom, "minecraft:mob_kills");
            long playerKills = getLong(custom, "minecraft:player_kills");
            long damageDealt = Math.round(getLong(custom, "minecraft:damage_dealt") / 10.0);
            long damageTaken = Math.round(getLong(custom, "minecraft:damage_taken") / 10.0);
            long jumps = getLong(custom, "minecraft:jump");
            long leaveGameCount = getLong(custom, "minecraft:leave_game");

            long walkCm = getLong(custom, "minecraft:walk_one_cm") + getLong(custom, "minecraft:crouch_one_cm");
            long sprintCm = getLong(custom, "minecraft:sprint_one_cm");
            long swimCm = getLong(custom, "minecraft:swim_one_cm") + getLong(custom, "minecraft:walk_on_water_one_cm") + getLong(custom, "minecraft:walk_under_water_one_cm");
            long flyCm = getLong(custom, "minecraft:fly_one_cm") + getLong(custom, "minecraft:aviate_one_cm");
            long vehicleCm = getLong(custom, "minecraft:boat_one_cm") + getLong(custom, "minecraft:horse_one_cm") + getLong(custom, "minecraft:minecart_one_cm") + getLong(custom, "minecraft:pig_one_cm") + getLong(custom, "minecraft:strider_one_cm") + getLong(custom, "minecraft:happy_ghast_one_cm");
            long totalDistanceCm = walkCm + sprintCm + swimCm + flyCm + vehicleCm;

            CategoryResult mined = extractCategory(statsObj, "minecraft:mined", 5);
            CategoryResult used = extractCategory(statsObj, "minecraft:used", 5);
            CategoryResult crafted = extractCategory(statsObj, "minecraft:crafted", 5);
            CategoryResult broken = extractCategory(statsObj, "minecraft:broken", 0);
            CategoryResult pickedUp = extractCategory(statsObj, "minecraft:picked_up", 0);

            return new PlayerVanillaStats(deaths, timeSinceDeathMs, mobKills, playerKills, damageDealt, damageTaken, jumps, leaveGameCount, walkCm, sprintCm, swimCm, flyCm, vehicleCm, totalDistanceCm, mined.total(), mined.top(), used.total(), used.top(), crafted.total(), crafted.top(), broken.total(), pickedUp.total());
        } catch (Exception ignored) {
            return PlayerVanillaStats.empty();
        }
    }

    private static long getLong(JsonObject obj, String key) {
        if (obj == null || !obj.has(key)) return 0;
        try {
            return obj.get(key).getAsLong();
        } catch (Exception ignored) {
            return 0;
        }
    }

    private static CategoryResult extractCategory(JsonObject statsObj, String categoryKey, int topLimit) {
        if (statsObj == null || !statsObj.has(categoryKey) || !statsObj.get(categoryKey).isJsonObject()) {
            return new CategoryResult(0, List.of());
        }

        JsonObject cat = statsObj.getAsJsonObject(categoryKey);
        long total = 0;
        List<VanillaStatItem> items = new ArrayList<>();

        for (Map.Entry<String, JsonElement> entry : cat.entrySet()) {
            long count = 0;
            try {
                count = entry.getValue().getAsLong();
            } catch (Exception ignored) {
            }

            if (count > 0) {
                total += count;
                items.add(new VanillaStatItem(TextUtils.stripNamespace(entry.getKey()), count));
            }
        }

        items.sort(Comparator.comparingLong(VanillaStatItem::count).reversed());
        List<VanillaStatItem> top = topLimit > 0 ? items.stream().limit(topLimit).toList() : List.of();

        return new CategoryResult(total, top);
    }

    private record CategoryResult(long total, List<VanillaStatItem> top) {
    }
}
