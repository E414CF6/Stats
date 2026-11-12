package stats.service;

import stats.config.PluginConfig;
import stats.database.DatabaseManager;
import stats.model.*;
import stats.util.AdvancementReader;
import stats.util.TextUtils;
import stats.util.VanillaStatsReader;
import org.bukkit.Bukkit;

import java.io.File;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.*;
import java.util.logging.Level;
import java.util.logging.Logger;

public class StatsQueryService {

    private static final List<String> SERVER_RANK_NAMES = List.of("Coal", "Iron", "Gold", "Diamond", "Emerald", "Netherite");

    private final Logger logger;
    private final DatabaseManager databaseManager;
    private volatile PluginConfig config;
    private volatile CachedStats cache;

    public StatsQueryService(Logger logger, DatabaseManager databaseManager, PluginConfig config) {
        this.logger = logger;
        this.databaseManager = databaseManager;
        this.config = config;
    }

    public void updateConfig(PluginConfig newConfig) {
        this.config = newConfig;
        invalidateCache();
    }

    public void invalidateCache() {
        this.cache = null;
    }

    public StatsApiResponse getStats(String searchQuery) throws SQLException {
        StatsApiResponse base = getOrFetchStats(false);
        if (searchQuery == null || searchQuery.isBlank()) {
            return base;
        }

        String q = searchQuery.trim().toLowerCase();
        List<PlayerSummary> filtered = base.players().stream().filter(p -> p.username().toLowerCase().contains(q) || (p.nickname() != null && p.nickname().toLowerCase().contains(q)) || p.uuid().toLowerCase().contains(q)).toList();

        return new StatsApiResponse(base.overview(), filtered);
    }

    public PlayerSummary getPlayer(String idOrName) throws SQLException {
        if (idOrName == null || idOrName.isBlank()) {
            return null;
        }
        String target = idOrName.trim().toLowerCase();
        StatsApiResponse base = getOrFetchStats(false);

        for (PlayerSummary p : base.players()) {
            if (p.uuid().equalsIgnoreCase(target) || p.username().equalsIgnoreCase(target)) {
                return p;
            }
        }
        return null;
    }

    public StatsApiResponse getOrFetchStats(boolean forceRefresh) throws SQLException {
        CachedStats current = cache;
        long now = System.currentTimeMillis();
        int ttl = config.cacheTtlSeconds();

        if (!forceRefresh && current != null && ttl > 0 && (now - current.timestampMs() < ttl * 1000L)) {
            return current.data();
        }

        synchronized (this) {
            current = cache;
            if (!forceRefresh && current != null && ttl > 0 && (now - current.timestampMs() < ttl * 1000L)) {
                return current.data();
            }

            StatsApiResponse fresh = queryStatsFromDatabase();
            cache = new CachedStats(fresh, System.currentTimeMillis());
            return fresh;
        }
    }

    private File resolveWorldDir() {
        if (!config.customWorldDir().isEmpty()) {
            File custom = new File(config.customWorldDir());
            if (custom.exists()) return custom;
        }
        try {
            if (!Bukkit.getWorlds().isEmpty()) {
                File worldFolder = Bukkit.getWorlds().get(0).getWorldFolder();
                if (worldFolder.exists()) return worldFolder;
            }
            File container = Bukkit.getWorldContainer();
            File worldCandidate = new File(container, "world");
            if (worldCandidate.exists()) return worldCandidate;
        } catch (Exception ignored) {
        }

        File fallback = new File("world");
        return fallback.exists() ? fallback : new File(".");
    }

    private StatsApiResponse queryStatsFromDatabase() throws SQLException {
        File worldDir = resolveWorldDir();
        String dbWc = config.dbNameWc();
        String dbGl = config.dbNameGl();

        Map<String, String> uuidToUsername = new HashMap<>();
        Map<String, String> lpGroupMap = new HashMap<>();

        // 1. LuckPerms players
        try (Connection conn = databaseManager.getConnection(); PreparedStatement ps = conn.prepareStatement("SELECT uuid, username, primary_group FROM `" + dbGl + "`.luckperms_players"); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                String u = rs.getString("uuid");
                if (u != null) {
                    String uuidLower = u.toLowerCase();
                    String username = rs.getString("username");
                    String group = rs.getString("primary_group");
                    lpGroupMap.put(uuidLower, group != null ? group : "default");
                    if (username != null && !username.isBlank()) {
                        uuidToUsername.put(uuidLower, username);
                    }
                }
            }
        } catch (SQLException e) {
            logger.log(Level.WARNING, "[StatsQuery] Failed querying luckperms_players: " + e.getMessage());
        }

        // 2. mcMMO users
        record McmmoUser(int id, String user, long lastLogin) {
        }
        Map<String, McmmoUser> mcmmoByUuid = new HashMap<>();
        Map<String, McmmoUser> mcmmoByUsername = new HashMap<>();
        try (Connection conn = databaseManager.getConnection(); PreparedStatement ps = conn.prepareStatement("SELECT id, user, uuid, lastlogin FROM `" + dbWc + "`.mcmmo_users"); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                int id = rs.getInt("id");
                String user = rs.getString("user");
                String uuid = rs.getString("uuid");
                long lastLogin = rs.getLong("lastlogin");
                McmmoUser entry = new McmmoUser(id, user, lastLogin);
                if (uuid != null) mcmmoByUuid.put(uuid.toLowerCase(), entry);
                if (user != null) mcmmoByUsername.put(user.toLowerCase(), entry);
            }
        } catch (SQLException e) {
            logger.log(Level.WARNING, "[StatsQuery] Failed querying mcmmo_users: " + e.getMessage());
        }

        // 3. mcMMO skills & experience
        Map<Integer, Map<String, Integer>> mcmmoSkillsById = new HashMap<>();
        try (Connection conn = databaseManager.getConnection(); PreparedStatement ps = conn.prepareStatement("SELECT * FROM `" + dbWc + "`.mcmmo_skills"); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                int userId = rs.getInt("user_id");
                Map<String, Integer> skillMap = new HashMap<>();
                for (SkillMeta meta : SkillMeta.ALL) {
                    try {
                        skillMap.put(meta.key(), rs.getInt(meta.key()));
                    } catch (SQLException ignored) {
                    }
                }
                try {
                    skillMap.put("total", rs.getInt("total"));
                } catch (SQLException ignored) {
                }
                mcmmoSkillsById.put(userId, skillMap);
            }
        } catch (SQLException e) {
            logger.log(Level.WARNING, "[StatsQuery] Failed querying mcmmo_skills: " + e.getMessage());
        }

        Map<Integer, Map<String, Long>> mcmmoExpById = new HashMap<>();
        try (Connection conn = databaseManager.getConnection(); PreparedStatement ps = conn.prepareStatement("SELECT * FROM `" + dbWc + "`.mcmmo_experience"); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                int userId = rs.getInt("user_id");
                Map<String, Long> expMap = new HashMap<>();
                for (SkillMeta meta : SkillMeta.ALL) {
                    try {
                        expMap.put(meta.key(), rs.getLong(meta.key()));
                    } catch (SQLException ignored) {
                    }
                }
                mcmmoExpById.put(userId, expMap);
            }
        } catch (SQLException e) {
            logger.log(Level.WARNING, "[StatsQuery] Failed querying mcmmo_experience: " + e.getMessage());
        }

        // 4. GriefPrevention player data
        record GpPlayerData(long accrued, long bonus) {
        }
        Map<String, GpPlayerData> gpPlayerByUuid = new HashMap<>();
        try (Connection conn = databaseManager.getConnection(); PreparedStatement ps = conn.prepareStatement("SELECT name, lastlogin, accruedblocks, bonusblocks FROM `" + dbWc + "`.griefprevention_playerdata"); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                String name = rs.getString("name");
                if (name != null) {
                    gpPlayerByUuid.put(name.toLowerCase(), new GpPlayerData(rs.getLong("accruedblocks"), rs.getLong("bonusblocks")));
                }
            }
        } catch (SQLException e) {
            logger.log(Level.WARNING, "[StatsQuery] Failed querying griefprevention_playerdata: " + e.getMessage());
        }

        // 5. GriefPrevention claims
        Map<String, List<ClaimItem>> gpClaimsByOwner = new HashMap<>();
        int totalClaimsCount = 0;
        long totalClaimedArea = 0;
        try (Connection conn = databaseManager.getConnection(); PreparedStatement ps = conn.prepareStatement("SELECT id, owner, lessercorner, greatercorner, builders, containers, accessors, managers, parentid " + "FROM `" + dbWc + "`.griefprevention_claimdata"); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                TextUtils.Corner lesser = TextUtils.parseCorner(rs.getString("lessercorner"));
                TextUtils.Corner greater = TextUtils.parseCorner(rs.getString("greatercorner"));
                if (lesser == null || greater == null) continue;

                int minX = Math.min(lesser.x(), greater.x());
                int maxX = Math.max(lesser.x(), greater.x());
                int minY = Math.min(lesser.y(), greater.y());
                int maxY = Math.max(lesser.y(), greater.y());
                int minZ = Math.min(lesser.z(), greater.z());
                int maxZ = Math.max(lesser.z(), greater.z());
                int width = Math.abs(maxX - minX) + 1;
                int length = Math.abs(maxZ - minZ) + 1;
                int area = width * length;

                ClaimItem item = new ClaimItem(rs.getLong("id"), lesser.world(), minX, minY, minZ, maxX, maxY, maxZ, width, length, area, TextUtils.parseListField(rs.getString("builders"), uuidToUsername), TextUtils.parseListField(rs.getString("containers"), uuidToUsername), TextUtils.parseListField(rs.getString("accessors"), uuidToUsername), TextUtils.parseListField(rs.getString("managers"), uuidToUsername));

                totalClaimsCount++;
                totalClaimedArea += area;

                String owner = rs.getString("owner");
                if (owner != null && !owner.isBlank()) {
                    gpClaimsByOwner.computeIfAbsent(owner.toLowerCase(), k -> new ArrayList<>()).add(item);
                }
            }
        } catch (SQLException e) {
            logger.log(Level.WARNING, "[StatsQuery] Failed querying griefprevention_claimdata: " + e.getMessage());
        }

        // 6. CMI Playtime history
        Map<Integer, List<PlaytimeDayRecord>> playtimeByCmiId = new HashMap<>();
        try (Connection conn = databaseManager.getConnection(); PreparedStatement ps = conn.prepareStatement("SELECT player_id, date, h0, h1, h2, h3, h4, h5, h6, h7, h8, h9, h10, h11, h12, h13, h14, h15, h16, h17, h18, h19, h20, h21, h22, h23 " + "FROM `" + dbWc + "`.cmi_playtime ORDER BY date DESC"); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                int pid = rs.getInt("player_id");
                if (pid == 0) continue;

                List<Long> hours = new ArrayList<>(24);
                long totalMs = 0;
                for (int h = 0; h < 24; h++) {
                    long val = rs.getLong("h" + h);
                    hours.add(val);
                    totalMs += val;
                }
                int dateInt = rs.getInt("date");
                PlaytimeDayRecord record = new PlaytimeDayRecord(dateInt, TextUtils.formatCmiDate(dateInt), hours, totalMs);
                playtimeByCmiId.computeIfAbsent(pid, k -> new ArrayList<>()).add(record);
            }
        } catch (SQLException e) {
            logger.log(Level.WARNING, "[StatsQuery] Failed querying cmi_playtime: " + e.getMessage());
        }

        // 7. CMI Users
        record CmiUserRow(int id, String playerUuid, String username, String nickname, String displayName,
                          double balance, long totalPlayTime, String rank, long lastLoginTime, long lastLogoffTime,
                          long votifier) {
        }
        List<CmiUserRow> cmiUsers = new ArrayList<>();
        try (Connection conn = databaseManager.getConnection(); PreparedStatement ps = conn.prepareStatement("SELECT id, player_uuid, username, nickname, DisplayName, Balance, TotalPlayTime, Rank, " + "LastLoginTime, LastLogoffTime, Votifier, FakeAccount " + "FROM `" + dbWc + "`.cmi_users WHERE (FakeAccount IS NULL OR FakeAccount = 0)"); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                String uuid = rs.getString("player_uuid");
                String username = rs.getString("username");
                if (uuid != null && username != null && !username.isBlank()) {
                    uuidToUsername.put(uuid.toLowerCase(), username);
                }
                cmiUsers.add(new CmiUserRow(rs.getInt("id"), uuid, username, rs.getString("nickname"), rs.getString("DisplayName"), rs.getDouble("Balance"), rs.getLong("TotalPlayTime"), rs.getString("Rank"), rs.getLong("LastLoginTime"), rs.getLong("LastLogoffTime"), rs.getLong("Votifier")));
            }
        }

        Map<String, Integer> rankDistribution = new LinkedHashMap<>();
        for (String rName : SERVER_RANK_NAMES) {
            rankDistribution.put(rName, 0);
        }

        List<PlayerSummary> players = new ArrayList<>();

        for (CmiUserRow cmi : cmiUsers) {
            if (cmi.playerUuid == null || cmi.playerUuid.isBlank()) continue;
            String uuidLower = cmi.playerUuid.toLowerCase();

            String username = cmi.username != null && !cmi.username.isBlank() ? cmi.username : uuidToUsername.getOrDefault(uuidLower, "Unknown");

            String primaryGroup = lpGroupMap.getOrDefault(uuidLower, "default");

            // mcMMO user lookup
            McmmoUser mcmmoUser = mcmmoByUuid.get(uuidLower);
            if (mcmmoUser == null) {
                mcmmoUser = mcmmoByUsername.get(username.toLowerCase());
            }

            Map<String, Integer> skillRow = mcmmoUser != null ? mcmmoSkillsById.get(mcmmoUser.id) : null;
            Map<String, Long> expRow = mcmmoUser != null ? mcmmoExpById.get(mcmmoUser.id) : null;

            Map<String, PlayerSkillStat> skills = new LinkedHashMap<>();
            int computedTotal = 0;
            for (SkillMeta meta : SkillMeta.ALL) {
                int level = skillRow != null ? skillRow.getOrDefault(meta.key(), 0) : 0;
                long xp = expRow != null ? expRow.getOrDefault(meta.key(), 0L) : 0L;
                long xpToNext = 1020L + level * 20L;
                skills.put(meta.key(), new PlayerSkillStat(level, xp, xpToNext));
                computedTotal += level;
            }
            long powerLevel = skillRow != null && skillRow.containsKey("total") ? skillRow.get("total") : computedTotal;

            PlayerSpecialty specialty = computeSpecialty(skills);

            // GriefPrevention claims
            GpPlayerData gpData = gpPlayerByUuid.getOrDefault(uuidLower, new GpPlayerData(0, 0));
            List<ClaimItem> claimItems = gpClaimsByOwner.getOrDefault(uuidLower, List.of());
            long usedBlocks = 0;
            for (ClaimItem item : claimItems) {
                usedBlocks += item.area();
            }
            long totalAvailableBlocks = gpData.accrued + gpData.bonus;
            long remainingBlocks = Math.max(0, totalAvailableBlocks - usedBlocks);
            PlayerClaims claims = new PlayerClaims(gpData.accrued, gpData.bonus, totalAvailableBlocks, usedBlocks, remainingBlocks, claimItems.size(), claimItems);

            // Playtime
            List<PlaytimeDayRecord> ptHistory = playtimeByCmiId.getOrDefault(cmi.id, List.of());
            long[] hourlyDistributionArray = new long[24];
            for (PlaytimeDayRecord rec : ptHistory) {
                for (int h = 0; h < 24 && h < rec.hours().size(); h++) {
                    hourlyDistributionArray[h] += rec.hours().get(h);
                }
            }
            List<Long> hourlyDistribution = new ArrayList<>(24);
            for (long val : hourlyDistributionArray) {
                hourlyDistribution.add(val);
            }
            List<PlaytimeDayRecord> validPtHistory = ptHistory.stream().filter(r -> r.dateInt() > 0).limit(14).toList();

            // Online status
            boolean isOnline = false;
            try {
                isOnline = Bukkit.getPlayer(UUID.fromString(cmi.playerUuid)) != null;
            } catch (Exception ignored) {
            }
            if (!isOnline) {
                isOnline = cmi.lastLoginTime > 0 && cmi.lastLoginTime > cmi.lastLogoffTime;
            }

            // Rank
            String strippedRank = TextUtils.stripMinecraftCodes(cmi.rank);
            String rank = strippedRank != null && !strippedRank.isBlank() ? strippedRank : "Coal";
            String matchedRank = "Coal";
            for (String rName : SERVER_RANK_NAMES) {
                if (rName.equalsIgnoreCase(rank)) {
                    matchedRank = rName;
                    break;
                }
            }
            rankDistribution.put(matchedRank, rankDistribution.getOrDefault(matchedRank, 0) + 1);

            PlayerVanillaStats vanillaStats = VanillaStatsReader.readStats(worldDir, cmi.playerUuid);
            PlayerAdvancementStats advancements = AdvancementReader.readAdvancements(worldDir, cmi.playerUuid);

            players.add(new PlayerSummary(uuidLower, username, TextUtils.stripMinecraftCodes(cmi.nickname), TextUtils.stripMinecraftCodes(cmi.displayName), primaryGroup, rank, cmi.balance, cmi.totalPlayTime, cmi.lastLoginTime, cmi.lastLogoffTime, isOnline, cmi.votifier, powerLevel, skills, specialty, claims, validPtHistory, hourlyDistribution, vanillaStats, advancements));
        }

        players.sort(Comparator.comparingLong(PlayerSummary::totalPlayTimeMs).reversed());

        int totalPlayers = players.size();
        int onlinePlayers = (int) players.stream().filter(PlayerSummary::isOnline).count();
        double totalBalance = players.stream().mapToDouble(PlayerSummary::balance).sum();
        long totalPlayTimeMs = players.stream().mapToLong(PlayerSummary::totalPlayTimeMs).sum();
        long totalPowerLevel = players.stream().mapToLong(PlayerSummary::powerLevel).sum();
        long totalMinedBlocks = players.stream().mapToLong(p -> p.vanillaStats().totalMined()).sum();
        long totalMobKills = players.stream().mapToLong(p -> p.vanillaStats().mobKills()).sum();
        long totalDistanceMeters = Math.round(players.stream().mapToLong(p -> p.vanillaStats().totalDistanceCm()).sum() / 100.0);
        long totalAdvancements = players.stream().mapToLong(p -> p.advancements().totalCompleted()).sum();

        ServerOverview overview = new ServerOverview(totalPlayers, onlinePlayers, totalBalance, totalPlayTimeMs, totalPowerLevel, totalClaimsCount, totalClaimedArea, totalMinedBlocks, totalMobKills, totalDistanceMeters, totalAdvancements, rankDistribution, Instant.now().toString(), "local-mariadb");

        return new StatsApiResponse(overview, players);
    }

    private PlayerSpecialty computeSpecialty(Map<String, PlayerSkillStat> skills) {
        int gatheringLevel = 0;
        int combatLevel = 0;
        int miscLevel = 0;
        String topSkillKey = null;
        long topSkillScore = -1;

        for (SkillMeta meta : SkillMeta.ALL) {
            PlayerSkillStat stat = skills.getOrDefault(meta.key(), new PlayerSkillStat(0, 0L, 1020L));
            if ("gathering".equals(meta.category())) {
                gatheringLevel += stat.level();
            } else if ("combat".equals(meta.category())) {
                combatLevel += stat.level();
            } else {
                miscLevel += stat.level();
            }

            long score = stat.level() * 100000L + stat.xp();
            if (score > topSkillScore && (stat.level() > 0 || stat.xp() > 0)) {
                topSkillScore = score;
                topSkillKey = meta.key();
            }
        }

        int total = gatheringLevel + combatLevel + miscLevel;
        if (total == 0 && topSkillKey == null) {
            return new PlayerSpecialty("초보 모험가", "balanced", null, 0, 0, 0);
        }

        String topLabel = "올라운더";
        if (topSkillKey != null) {
            for (SkillMeta meta : SkillMeta.ALL) {
                if (meta.key().equals(topSkillKey)) {
                    topLabel = meta.labelKo();
                    break;
                }
            }
        }

        String category = "balanced";
        String rolePrefix = "균형잡힌";

        if (gatheringLevel >= combatLevel && gatheringLevel >= miscLevel && gatheringLevel > 0) {
            category = "gathering";
            rolePrefix = gatheringLevel >= 50 ? "마스터 개척자" : "채집 전문가";
        } else if (combatLevel >= gatheringLevel && combatLevel >= miscLevel && combatLevel > 0) {
            category = "combat";
            rolePrefix = combatLevel >= 50 ? "베테랑 전사" : "전투 전문가";
        } else if (miscLevel > 0) {
            category = "misc";
            rolePrefix = "특수 기술자";
        }

        return new PlayerSpecialty(rolePrefix + " · " + topLabel + " 특화", category, topSkillKey, gatheringLevel, combatLevel, miscLevel);
    }

    private record CachedStats(StatsApiResponse data, long timestampMs) {
    }
}
