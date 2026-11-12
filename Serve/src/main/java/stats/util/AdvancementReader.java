package stats.util;

import stats.model.PlayerAdvancementStats;
import stats.model.RecentAdvancementItem;
import stats.model.VisitedBiomeItem;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.File;
import java.io.FileReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class AdvancementReader {

    private AdvancementReader() {
    }

    public static PlayerAdvancementStats readAdvancements(File worldDir, String uuid) {
        if (worldDir == null || uuid == null) {
            return PlayerAdvancementStats.empty();
        }

        File file = new File(worldDir, "players/advancements/" + uuid + ".json");
        if (!file.exists()) {
            file = new File(worldDir, "advancements/" + uuid + ".json");
        }
        if (!file.exists() || !file.canRead()) {
            return PlayerAdvancementStats.empty();
        }

        Map<String, Integer> categories = new LinkedHashMap<>();
        categories.put("story", 0);
        categories.put("adventure", 0);
        categories.put("nether", 0);
        categories.put("end", 0);
        categories.put("husbandry", 0);

        List<RecentAdvancementItem> recent = new ArrayList<>();
        List<VisitedBiomeItem> visitedBiomes = new ArrayList<>();
        int totalCompleted = 0;

        try (FileReader reader = new FileReader(file, StandardCharsets.UTF_8)) {
            JsonElement rootElem = JsonParser.parseReader(reader);
            if (!rootElem.isJsonObject()) {
                return PlayerAdvancementStats.empty();
            }

            JsonObject json = rootElem.getAsJsonObject();

            if (json.has("minecraft:adventure/adventuring_time")) {
                JsonElement advElem = json.get("minecraft:adventure/adventuring_time");
                if (advElem.isJsonObject()) {
                    JsonObject advObj = advElem.getAsJsonObject();
                    if (advObj.has("criteria") && advObj.get("criteria").isJsonObject()) {
                        JsonObject criteria = advObj.getAsJsonObject("criteria");
                        for (Map.Entry<String, JsonElement> entry : criteria.entrySet()) {
                            String ts = entry.getValue().isJsonPrimitive() ? entry.getValue().getAsString() : "";
                            visitedBiomes.add(new VisitedBiomeItem(TextUtils.stripNamespace(entry.getKey()), ts));
                        }
                        visitedBiomes.sort(Comparator.comparing(VisitedBiomeItem::visitedAt).reversed());
                    }
                }
            }

            for (Map.Entry<String, JsonElement> entry : json.entrySet()) {
                String advKey = entry.getKey();
                if ("DataVersion".equals(advKey) || advKey.startsWith("minecraft:recipes/")) {
                    continue;
                }
                if (!entry.getValue().isJsonObject()) {
                    continue;
                }

                JsonObject val = entry.getValue().getAsJsonObject();
                if (!val.has("done") || !val.get("done").getAsBoolean()) {
                    continue;
                }

                totalCompleted++;
                String shortKey = TextUtils.stripNamespace(advKey);
                String[] parts = shortKey.split("/");
                String catPrefix = parts.length > 0 ? parts[0] : "other";

                String category = "other";
                if ("story".equals(catPrefix)) {
                    categories.put("story", categories.get("story") + 1);
                    category = "story";
                } else if ("adventure".equals(catPrefix)) {
                    categories.put("adventure", categories.get("adventure") + 1);
                    category = "adventure";
                } else if ("nether".equals(catPrefix)) {
                    categories.put("nether", categories.get("nether") + 1);
                    category = "nether";
                } else if ("end".equals(catPrefix)) {
                    categories.put("end", categories.get("end") + 1);
                    category = "end";
                } else if ("husbandry".equals(catPrefix)) {
                    categories.put("husbandry", categories.get("husbandry") + 1);
                    category = "husbandry";
                }

                String latestTs = "";
                if (val.has("criteria") && val.get("criteria").isJsonObject()) {
                    JsonObject criteria = val.getAsJsonObject("criteria");
                    for (Map.Entry<String, JsonElement> critEntry : criteria.entrySet()) {
                        String ts = critEntry.getValue().isJsonPrimitive() ? critEntry.getValue().getAsString() : "";
                        if (ts.compareTo(latestTs) > 0) {
                            latestTs = ts;
                        }
                    }
                }

                recent.add(new RecentAdvancementItem(shortKey, category, latestTs));
            }

            recent.sort(Comparator.comparing(RecentAdvancementItem::completedAt).reversed());
            List<RecentAdvancementItem> topRecent = recent.stream().limit(6).toList();

            return new PlayerAdvancementStats(totalCompleted, categories, topRecent, visitedBiomes, 54);
        } catch (Exception ignored) {
            return PlayerAdvancementStats.empty();
        }
    }
}
