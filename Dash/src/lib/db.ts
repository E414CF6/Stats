import fs from "node:fs";
import path from "node:path";
import mysql, {Pool, RowDataPacket} from "mysql2/promise";
import {
  ClaimItem,
  MCMMO_SKILLS,
  PlayerAdvancementStats,
  PlayerSkillStat,
  PlayerSpecialty,
  PlayerSummary,
  PlayerVanillaStats,
  PlaytimeDayRecord,
  RecentAdvancementItem,
  SERVER_RANKS,
  SkillKey,
  StatsApiResponse,
  VanillaStatItem,
  VisitedBiomeItem,
} from "@/types/stats";

declare global {
  // eslint-disable-next-line no-var
  var __everestMysqlPool: Pool | undefined;
}

const DB_CONFIG = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "46770d6",
  password: process.env.DB_PASSWORD || "7f04916",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 5000,
};

const DB_WC = process.env.DB_NAME_WC || "msdwc";
const DB_GL = process.env.DB_NAME_GL || "msdgl";

export function getPool(): Pool {
  if (!global.__everestMysqlPool) {
    global.__everestMysqlPool = mysql.createPool(DB_CONFIG);
  }
  return global.__everestMysqlPool;
}

function resolveWorldDir(): string {
  if (process.env.WORLD_DIR) {
    return path.resolve(process.env.WORLD_DIR);
  }
  const cwd = process.cwd();
  const candidateParent = path.resolve(cwd, "..", "world");
  if (fs.existsSync(candidateParent)) {
    return candidateParent;
  }
  return path.resolve(cwd, "world");
}

function readJsonSafe(filePaths: string[]): Record<string, unknown> | null {
  for (const fp of filePaths) {
    try {
      if (fs.existsSync(fp)) {
        const raw = fs.readFileSync(fp, "utf8");
        return JSON.parse(raw) as Record<string, unknown>;
      }
    } catch {
      // ignore malformed or unreadable file
    }
  }
  return null;
}

function stripNamespace(id: string): string {
  return id.replace(/^minecraft:/, "");
}

function extractStatCategory(
    statsObj: Record<string, unknown>,
    categoryKey: string,
    topLimit = 5
): { total: number; top: VanillaStatItem[] } {
  const cat = statsObj[categoryKey] as Record<string, number> | undefined;
  if (!cat || typeof cat !== "object") {
    return {total: 0, top: []};
  }
  let total = 0;
  const items: VanillaStatItem[] = [];
  for (const [k, v] of Object.entries(cat)) {
    const count = Number(v || 0);
    if (count > 0) {
      total += count;
      items.push({id: stripNamespace(k), count});
    }
  }
  items.sort((a, b) => b.count - a.count);
  return {total, top: items.slice(0, topLimit)};
}

function readPlayerVanillaStats(worldDir: string, uuid: string): PlayerVanillaStats {
  const json = readJsonSafe([
    path.join(worldDir, "players", "stats", `${uuid}.json`),
    path.join(worldDir, "stats", `${uuid}.json`),
  ]);

  const statsRoot = (json?.stats as Record<string, unknown>) || {};
  const custom = (statsRoot["minecraft:custom"] as Record<string, number>) || {};

  const getCustom = (key: string) => Number(custom[`minecraft:${key}`] || 0);

  const deaths = getCustom("deaths");
  const timeSinceDeathTicks = getCustom("time_since_death");
  const timeSinceDeathMs = timeSinceDeathTicks * 50;
  const mobKills = getCustom("mob_kills");
  const playerKills = getCustom("player_kills");
  const damageDealt = Math.round(getCustom("damage_dealt") / 10);
  const damageTaken = Math.round(getCustom("damage_taken") / 10);
  const jumps = getCustom("jump");
  const leaveGameCount = getCustom("leave_game");

  const walkCm = getCustom("walk_one_cm") + getCustom("crouch_one_cm");
  const sprintCm = getCustom("sprint_one_cm");
  const swimCm =
      getCustom("swim_one_cm") +
      getCustom("walk_on_water_one_cm") +
      getCustom("walk_under_water_one_cm");
  const flyCm = getCustom("fly_one_cm") + getCustom("aviate_one_cm");
  const vehicleCm =
      getCustom("boat_one_cm") +
      getCustom("horse_one_cm") +
      getCustom("minecart_one_cm") +
      getCustom("pig_one_cm") +
      getCustom("strider_one_cm") +
      getCustom("happy_ghast_one_cm");
  const totalDistanceCm = walkCm + sprintCm + swimCm + flyCm + vehicleCm;

  const mined = extractStatCategory(statsRoot, "minecraft:mined", 5);
  const used = extractStatCategory(statsRoot, "minecraft:used", 5);
  const crafted = extractStatCategory(statsRoot, "minecraft:crafted", 5);
  const broken = extractStatCategory(statsRoot, "minecraft:broken", 0);
  const pickedUp = extractStatCategory(statsRoot, "minecraft:picked_up", 0);

  return {
    deaths,
    timeSinceDeathMs,
    mobKills,
    playerKills,
    damageDealt,
    damageTaken,
    jumps,
    leaveGameCount,
    walkCm,
    sprintCm,
    swimCm,
    flyCm,
    vehicleCm,
    totalDistanceCm,
    totalMined: mined.total,
    topMined: mined.top,
    totalUsed: used.total,
    topUsed: used.top,
    totalCrafted: crafted.total,
    topCrafted: crafted.top,
    totalBroken: broken.total,
    totalPickedUp: pickedUp.total,
  };
}

function readPlayerAdvancements(worldDir: string, uuid: string): PlayerAdvancementStats {
  const json = readJsonSafe([
    path.join(worldDir, "players", "advancements", `${uuid}.json`),
    path.join(worldDir, "advancements", `${uuid}.json`),
  ]);

  const categories = {
    story: 0,
    adventure: 0,
    nether: 0,
    end: 0,
    husbandry: 0,
  };
  const recent: RecentAdvancementItem[] = [];
  const visitedBiomes: VisitedBiomeItem[] = [];
  let totalCompleted = 0;

  if (json) {
    const adventuring = json["minecraft:adventure/adventuring_time"] as
        | { criteria?: Record<string, string>; done?: boolean }
        | undefined;
    if (adventuring?.criteria && typeof adventuring.criteria === "object") {
      for (const [biomeKey, ts] of Object.entries(adventuring.criteria)) {
        visitedBiomes.push({
          id: stripNamespace(biomeKey),
          visitedAt: String(ts || ""),
        });
      }
      visitedBiomes.sort((a, b) => b.visitedAt.localeCompare(a.visitedAt));
    }

    for (const [advKey, val] of Object.entries(json)) {
      if (advKey === "DataVersion" || advKey.startsWith("minecraft:recipes/")) {
        continue;
      }
      if (!val || typeof val !== "object") continue;
      const entry = val as { criteria?: Record<string, string>; done?: boolean };
      if (!entry.done) continue;

      totalCompleted += 1;
      const shortKey = stripNamespace(advKey);
      const [catPrefix] = shortKey.split("/");
      let category: RecentAdvancementItem["category"] = "other";

      if (catPrefix === "story") {
        categories.story += 1;
        category = "story";
      } else if (catPrefix === "adventure") {
        categories.adventure += 1;
        category = "adventure";
      } else if (catPrefix === "nether") {
        categories.nether += 1;
        category = "nether";
      } else if (catPrefix === "end") {
        categories.end += 1;
        category = "end";
      } else if (catPrefix === "husbandry") {
        categories.husbandry += 1;
        category = "husbandry";
      }

      let latestTs = "";
      if (entry.criteria && typeof entry.criteria === "object") {
        for (const ts of Object.values(entry.criteria)) {
          const tsStr = String(ts || "");
          if (tsStr > latestTs) {
            latestTs = tsStr;
          }
        }
      }

      recent.push({
        key: shortKey,
        category,
        completedAt: latestTs,
      });
    }

    recent.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  }

  return {
    totalCompleted,
    categories,
    recent: recent.slice(0, 6),
    visitedBiomes,
    totalBiomesTarget: 54,
  };
}

function computeSpecialty(skills: Record<SkillKey, PlayerSkillStat>): PlayerSpecialty {
  let gatheringLevel = 0;
  let combatLevel = 0;
  let miscLevel = 0;
  let topSkillKey: SkillKey | null = null;
  let topSkillScore = -1;

  for (const meta of MCMMO_SKILLS) {
    const stat = skills[meta.key] || {level: 0, xp: 0, xpToNext: 1020};
    if (meta.category === "gathering") gatheringLevel += stat.level;
    else if (meta.category === "combat") combatLevel += stat.level;
    else miscLevel += stat.level;

    const score = stat.level * 100000 + stat.xp;
    if (score > topSkillScore && (stat.level > 0 || stat.xp > 0)) {
      topSkillScore = score;
      topSkillKey = meta.key;
    }
  }

  const total = gatheringLevel + combatLevel + miscLevel;
  if (total === 0 && !topSkillKey) {
    return {
      title: "초보 모험가",
      category: "balanced",
      topSkillKey: null,
      gatheringLevel,
      combatLevel,
      miscLevel,
    };
  }

  const topMeta = MCMMO_SKILLS.find((m) => m.key === topSkillKey);
  const topLabel = topMeta ? topMeta.labelKo : "올라운더";

  let category: PlayerSpecialty["category"] = "balanced";
  let rolePrefix = "균형잡힌";

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

  return {
    title: `${rolePrefix} · ${topLabel} 특화`,
    category,
    topSkillKey,
    gatheringLevel,
    combatLevel,
    miscLevel,
  };
}

function parseCorner(corner: string | null): { world: string; x: number; y: number; z: number } | null {
  if (!corner) return null;
  const parts = corner.split(";");
  if (parts.length < 4) return null;
  const world = parts[0];
  const x = Number(parts[1]);
  const y = Number(parts[2]);
  const z = Number(parts[3]);
  if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z)) return null;
  return {world, x, y, z};
}

function parseListField(raw: string | null, uuidToName: Map<string, string>): string[] {
  if (!raw || !raw.trim()) return [];
  return raw
      .split(/[;,]/)
      .map((s) => s.trim().replace(/^\[|\]$/g, ""))
      .filter(Boolean)
      .map((token) => {
        const lower = token.toLowerCase();
        if (lower === "public" || lower === "all") return "전체 공개";
        return uuidToName.get(lower) || token;
      });
}

function formatCmiDate(dateInt: number): string {
  if (!dateInt || dateInt <= 0) return "누적/기타";
  const str = String(dateInt).padStart(6, "0");
  const yy = str.slice(0, 2);
  const mm = str.slice(2, 4);
  const dd = str.slice(4, 6);
  return `20${yy}-${mm}-${dd}`;
}

function stripMinecraftCodes(text: string | null): string | null {
  if (!text) return null;
  return text
      .replace(/\{#[0-9a-fA-F]{6}\}/g, "")
      .replace(/[&§][0-9a-fk-orA-FK-OR]/g, "")
      .trim();
}

export async function queryStatsFromLocalMariaDB(): Promise<StatsApiResponse> {
  const pool = getPool();
  const worldDir = resolveWorldDir();

  const [
    [cmiUsers],
    [cmiPlaytimes],
    [mcmmoUsers],
    [mcmmoSkills],
    [mcmmoExp],
    [gpPlayers],
    [gpClaims],
    [lpPlayers],
  ] = await Promise.all([
    pool.query<RowDataPacket[]>(
        `SELECT id,
                player_uuid,
                username,
                nickname,
                DisplayName,
                Balance,
                TotalPlayTime,
                Rank,
                LastLoginTime,
                LastLogoffTime,
                Votifier,
                FakeAccount
         FROM \`${DB_WC}\`.cmi_users
         WHERE (FakeAccount IS NULL OR FakeAccount = 0)`
    ),
    pool.query<RowDataPacket[]>(
        `SELECT player_id, date, h0, h1, h2, h3, h4, h5, h6, h7, h8, h9, h10, h11, h12, h13, h14, h15, h16, h17, h18, h19, h20, h21, h22, h23
         FROM \`${DB_WC}\`.cmi_playtime
         ORDER BY date DESC`
    ),
    pool.query<RowDataPacket[]>(
        `SELECT id, user, uuid, lastlogin
         FROM \`${DB_WC}\`.mcmmo_users`
    ),
    pool.query<RowDataPacket[]>(
        `SELECT *
         FROM \`${DB_WC}\`.mcmmo_skills`
    ),
    pool.query<RowDataPacket[]>(
        `SELECT *
         FROM \`${DB_WC}\`.mcmmo_experience`
    ),
    pool.query<RowDataPacket[]>(
        `SELECT name, lastlogin, accruedblocks, bonusblocks
         FROM \`${DB_WC}\`.griefprevention_playerdata`
    ),
    pool.query<RowDataPacket[]>(
        `SELECT id,
                owner,
                lessercorner,
                greatercorner,
                builders,
                containers,
                accessors,
                managers,
                parentid
         FROM \`${DB_WC}\`.griefprevention_claimdata`
    ),
    pool.query<RowDataPacket[]>(
        `SELECT uuid, username, primary_group
         FROM \`${DB_GL}\`.luckperms_players`
    ),
  ]);

  // Index by UUID or ID
  const uuidToUsername = new Map<string, string>();
  const lpByUuid = new Map<string, { username: string; primaryGroup: string }>();
  for (const row of lpPlayers) {
    if (row.uuid) {
      const u = String(row.uuid).toLowerCase();
      const name = String(row.username || "");
      lpByUuid.set(u, {
        username: name,
        primaryGroup: String(row.primary_group || "default"),
      });
      if (name) uuidToUsername.set(u, name);
    }
  }
  for (const cmi of cmiUsers) {
    if (cmi.player_uuid && cmi.username) {
      uuidToUsername.set(String(cmi.player_uuid).toLowerCase(), String(cmi.username));
    }
  }

  const mcmmoSkillsById = new Map<number, RowDataPacket>();
  for (const row of mcmmoSkills) {
    mcmmoSkillsById.set(Number(row.user_id), row);
  }

  const mcmmoExpById = new Map<number, RowDataPacket>();
  for (const row of mcmmoExp) {
    mcmmoExpById.set(Number(row.user_id), row);
  }

  const mcmmoByUuid = new Map<string, { id: number; user: string; lastlogin: number }>();
  const mcmmoByUsername = new Map<string, { id: number; user: string; lastlogin: number }>();
  for (const row of mcmmoUsers) {
    const entry = {
      id: Number(row.id),
      user: String(row.user || ""),
      lastlogin: Number(row.lastlogin || 0),
    };
    if (row.uuid) {
      mcmmoByUuid.set(String(row.uuid).toLowerCase(), entry);
    }
    if (row.user) {
      mcmmoByUsername.set(String(row.user).toLowerCase(), entry);
    }
  }

  const gpPlayerByUuid = new Map<string, { accrued: number; bonus: number }>();
  for (const row of gpPlayers) {
    if (row.name) {
      gpPlayerByUuid.set(String(row.name).toLowerCase(), {
        accrued: Number(row.accruedblocks || 0),
        bonus: Number(row.bonusblocks || 0),
      });
    }
  }

  const gpClaimsByUuid = new Map<string, ClaimItem[]>();
  let totalClaimsCount = 0;
  let totalClaimedArea = 0;

  for (const row of gpClaims) {
    const lesser = parseCorner(row.lessercorner);
    const greater = parseCorner(row.greatercorner);
    if (!lesser || !greater) continue;

    const minX = Math.min(lesser.x, greater.x);
    const maxX = Math.max(lesser.x, greater.x);
    const minY = Math.min(lesser.y, greater.y);
    const maxY = Math.max(lesser.y, greater.y);
    const minZ = Math.min(lesser.z, greater.z);
    const maxZ = Math.max(lesser.z, greater.z);
    const width = Math.abs(maxX - minX) + 1;
    const length = Math.abs(maxZ - minZ) + 1;
    const area = width * length;

    const item: ClaimItem = {
      id: Number(row.id ?? 0),
      world: lesser.world,
      minX,
      minY,
      minZ,
      maxX,
      maxY,
      maxZ,
      width,
      length,
      area,
      builders: parseListField(row.builders, uuidToUsername),
      containers: parseListField(row.containers, uuidToUsername),
      accessors: parseListField(row.accessors, uuidToUsername),
      managers: parseListField(row.managers, uuidToUsername),
    };

    totalClaimsCount += 1;
    totalClaimedArea += area;

    const ownerKey = String(row.owner || "").toLowerCase();
    if (ownerKey) {
      const list = gpClaimsByUuid.get(ownerKey) || [];
      list.push(item);
      gpClaimsByUuid.set(ownerKey, list);
    }
  }

  const playtimeByCmiId = new Map<number, PlaytimeDayRecord[]>();
  for (const row of cmiPlaytimes) {
    const pid = Number(row.player_id);
    if (!pid) continue;
    const hours: number[] = [];
    let totalMs = 0;
    for (let h = 0; h < 24; h++) {
      const val = Number(row[`h${h}`] || 0);
      hours.push(val);
      totalMs += val;
    }
    const dateInt = Number(row.date || 0);
    const record: PlaytimeDayRecord = {
      dateInt,
      dateFormatted: formatCmiDate(dateInt),
      hours,
      totalMs,
    };
    const list = playtimeByCmiId.get(pid) || [];
    list.push(record);
    playtimeByCmiId.set(pid, list);
  }

  const rankDistribution: Record<string, number> = {};
  for (const r of SERVER_RANKS) {
    rankDistribution[r.name] = 0;
  }

  const players: PlayerSummary[] = [];

  for (const cmi of cmiUsers) {
    const uuid = String(cmi.player_uuid || "").toLowerCase();
    if (!uuid) continue;

    const username = String(cmi.username || lpByUuid.get(uuid)?.username || "Unknown");
    const cmiId = Number(cmi.id);
    const lp = lpByUuid.get(uuid);
    const mcmmoUser = mcmmoByUuid.get(uuid) || mcmmoByUsername.get(username.toLowerCase());
    const skillRow = mcmmoUser ? mcmmoSkillsById.get(mcmmoUser.id) : undefined;
    const expRow = mcmmoUser ? mcmmoExpById.get(mcmmoUser.id) : undefined;

    const skills = {} as Record<SkillKey, PlayerSkillStat>;
    let computedTotal = 0;
    for (const meta of MCMMO_SKILLS) {
      const level = Number(skillRow?.[meta.key] || 0);
      const xp = Number(expRow?.[meta.key] || 0);
      const xpToNext = 1020 + level * 20;
      skills[meta.key] = {level, xp, xpToNext};
      computedTotal += level;
    }
    const powerLevel = Number(skillRow?.total ?? computedTotal);
    const specialty = computeSpecialty(skills);

    const gpData = gpPlayerByUuid.get(uuid) || {accrued: 0, bonus: 0};
    const claimItems = gpClaimsByUuid.get(uuid) || [];
    const usedBlocks = claimItems.reduce((acc, c) => acc + c.area, 0);
    const totalAvailableBlocks = gpData.accrued + gpData.bonus;
    const remainingBlocks = Math.max(0, totalAvailableBlocks - usedBlocks);

    const ptHistory = playtimeByCmiId.get(cmiId) || [];
    const hourlyDistribution = new Array<number>(24).fill(0);
    for (const rec of ptHistory) {
      for (let h = 0; h < 24; h++) {
        hourlyDistribution[h] += rec.hours[h] || 0;
      }
    }

    const lastLoginTime = Number(cmi.LastLoginTime || 0);
    const lastLogoffTime = Number(cmi.LastLogoffTime || 0);
    const isOnline = lastLoginTime > 0 && lastLoginTime > lastLogoffTime;
    const rank = stripMinecraftCodes(cmi.Rank) || "Coal";

    const matchedRank = SERVER_RANKS.find(
        (r) => r.name.toLowerCase() === rank.toLowerCase()
    )?.name || "Coal";
    rankDistribution[matchedRank] = (rankDistribution[matchedRank] || 0) + 1;

    const vanillaStats = readPlayerVanillaStats(worldDir, uuid);
    const advancements = readPlayerAdvancements(worldDir, uuid);

    players.push({
      uuid,
      username,
      nickname: stripMinecraftCodes(cmi.nickname),
      displayName: stripMinecraftCodes(cmi.DisplayName),
      primaryGroup: lp?.primaryGroup || "default",
      rank,
      balance: Number(cmi.Balance || 0),
      totalPlayTimeMs: Number(cmi.TotalPlayTime || 0),
      lastLoginTime,
      lastLogoffTime,
      isOnline,
      votes: Number(cmi.Votifier || 0),
      powerLevel,
      skills,
      specialty,
      claims: {
        accruedBlocks: gpData.accrued,
        bonusBlocks: gpData.bonus,
        totalAvailableBlocks,
        usedBlocks,
        remainingBlocks,
        claimCount: claimItems.length,
        items: claimItems,
      },
      playtimeHistory: ptHistory.filter((r) => r.dateInt > 0).slice(0, 14),
      hourlyDistribution,
      vanillaStats,
      advancements,
    });
  }

  // Sort default by totalPlayTimeMs desc
  players.sort((a, b) => b.totalPlayTimeMs - a.totalPlayTimeMs);

  const overview = {
    totalPlayers: players.length,
    onlinePlayers: players.filter((p) => p.isOnline).length,
    totalBalance: players.reduce((acc, p) => acc + p.balance, 0),
    totalPlayTimeMs: players.reduce((acc, p) => acc + p.totalPlayTimeMs, 0),
    totalPowerLevel: players.reduce((acc, p) => acc + p.powerLevel, 0),
    totalClaims: totalClaimsCount,
    totalClaimedArea,
    totalMinedBlocks: players.reduce((acc, p) => acc + p.vanillaStats.totalMined, 0),
    totalMobKills: players.reduce((acc, p) => acc + p.vanillaStats.mobKills, 0),
    totalDistanceMeters: Math.round(
        players.reduce((acc, p) => acc + p.vanillaStats.totalDistanceCm, 0) / 100
    ),
    totalAdvancements: players.reduce((acc, p) => acc + p.advancements.totalCompleted, 0),
    rankDistribution,
    queriedAt: new Date().toISOString(),
    sourceMode: "local-mariadb" as const,
  };

  return {overview, players};
}
