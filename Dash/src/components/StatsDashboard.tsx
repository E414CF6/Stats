"use client";

import React, {useCallback, useEffect, useMemo, useState} from "react";
import {
  Activity,
  Award,
  Check,
  Clock,
  Coins,
  Compass,
  Copy,
  Database,
  Flame,
  Footprints,
  HeartCrack,
  MapPin,
  Medal,
  Monitor,
  Moon,
  Pickaxe,
  RefreshCw,
  Search,
  Shield,
  Skull,
  Sparkles,
  Sun,
  Sword,
  Trophy,
  Users,
  Wrench,
  X,
} from "lucide-react";
import {MCMMO_SKILLS, PlayerSummary, SERVER_RANKS, SkillCategory, SkillKey, StatsApiResponse,} from "@/types/stats";

type LeaderboardMetric =
    | "playtime"
    | "power"
    | "balance"
    | "claims"
    | "mined"
    | "advancements"
    | "distance"
    | "survival"
    | SkillKey;

type ThemeMode = "light" | "dark" | "system";

const ITEM_BLOCK_KO: Record<string, string> = {
  stone: "돌",
  cobblestone: "조약돌",
  deepslate: "심층암",
  cobbled_deepslate: "심층암 조약돌",
  dirt: "흙",
  grass_block: "잔디 블록",
  sand: "모래",
  red_sand: "붉은 모래",
  gravel: "자갈",
  flint: "부싯돌",
  clay: "점토",
  oak_log: "참나무 원목",
  spruce_log: "가문비나무 원목",
  birch_log: "자작나무 원목",
  jungle_log: "정글나무 원목",
  acacia_log: "아카시아나무 원목",
  dark_oak_log: "짙은 참나무 원목",
  cherry_log: "벚나무 원목",
  mangrove_log: "맹그로브나무 원목",
  pale_oak_log: "창백한 참나무 원목",
  coal_ore: "석탄 광석",
  deepslate_coal_ore: "심층암 석탄 광석",
  iron_ore: "철 광석",
  deepslate_iron_ore: "심층암 철 광석",
  copper_ore: "구리 광석",
  deepslate_copper_ore: "심층암 구리 광석",
  gold_ore: "금 광석",
  deepslate_gold_ore: "심층암 금 광석",
  redstone_ore: "레드스톤 광석",
  deepslate_redstone_ore: "심층암 레드스톤 광석",
  lapis_ore: "청금석 광석",
  deepslate_lapis_ore: "심층암 청금석 광석",
  diamond_ore: "다이아몬드 광석",
  deepslate_diamond_ore: "심층암 다이아몬드 광석",
  emerald_ore: "에메랄드 광석",
  deepslate_emerald_ore: "심층암 에메랄드 광석",
  ancient_debris: "고대 잔해",
  netherrack: "네더랙",
  end_stone: "엔드 돌",
  obsidian: "흑요석",
  torch: "횃불",
  crafting_table: "제작대",
  furnace: "화로",
  chest: "상자",
  wooden_pickaxe: "나무 곡괭이",
  stone_pickaxe: "돌 곡괭이",
  iron_pickaxe: "철 곡괭이",
  golden_pickaxe: "금 곡괭이",
  diamond_pickaxe: "다이아몬드 곡괭이",
  netherite_pickaxe: "네더라이트 곡괭이",
  wooden_axe: "나무 도끼",
  stone_axe: "돌 도끼",
  iron_axe: "철 도끼",
  golden_axe: "금 도끼",
  diamond_axe: "다이아몬드 도끼",
  netherite_axe: "네더라이트 도끼",
  wooden_shovel: "나무 삽",
  stone_shovel: "돌 삽",
  iron_shovel: "철 삽",
  golden_shovel: "금 삽",
  diamond_shovel: "다이아몬드 삽",
  netherite_shovel: "네더라이트 삽",
  wooden_sword: "나무 검",
  stone_sword: "돌 검",
  iron_sword: "철 검",
  golden_sword: "금 검",
  diamond_sword: "다이아몬드 검",
  netherite_sword: "네더라이트 검",
  bow: "활",
  crossbow: "쇠뇌",
  trident: "삼지창",
  mace: "철퇴",
  shield: "방패",
  fishing_rod: "낚싯대",
  bread: "빵",
  cooked_beef: "구운 소고기",
  cooked_porkchop: "구운 돼지고기",
  golden_apple: "황금 사과",
  firework_rocket: "폭죽 로켓",
};

const BIOME_KO: Record<string, string> = {
  plains: "평원",
  sunflower_plains: "해바라기 평원",
  snowy_plains: "눈 덮인 평원",
  ice_spikes: "역고드름",
  desert: "사막",
  swamp: "늪",
  mangrove_swamp: "맹그로브 늪",
  forest: "숲",
  flower_forest: "꽃숲",
  birch_forest: "자작나무 숲",
  dark_forest: "어두운 숲",
  pale_garden: "창백한 정원",
  old_growth_birch_forest: "원시 자작나무 숲",
  old_growth_pine_taiga: "원시 소나무 타이가",
  old_growth_spruce_taiga: "원시 가문비나무 타이가",
  taiga: "타이가",
  snowy_taiga: "눈 덮인 타이가",
  savanna: "사바나",
  savanna_plateau: "사바나 고원",
  windswept_hills: "바람이 세찬 언덕",
  windswept_gravelly_hills: "바람이 세찬 자갈투성이 언덕",
  windswept_forest: "바람이 세찬 숲",
  windswept_savanna: "바람이 세찬 사바나",
  jungle: "정글",
  sparse_jungle: "드문드문한 정글",
  bamboo_jungle: "대나무 정글",
  badlands: "악지",
  eroded_badlands: "침식된 악지",
  wooded_badlands: "나무가 우거진 악지",
  meadow: "목초지",
  cherry_grove: "벚나무 숲",
  grove: "산림",
  snowy_slopes: "눈 덮인 비탈",
  frozen_peaks: "얼어붙은 봉우리",
  jagged_peaks: "뾰족한 봉우리",
  stony_peaks: "돌 봉우리",
  river: "강",
  frozen_river: "얼어붙은 강",
  beach: "해변",
  snowy_beach: "눈 덮인 해변",
  stony_shore: "돌투성이 해안",
  warm_ocean: "따뜻한 바다",
  lukewarm_ocean: "미지근한 바다",
  deep_lukewarm_ocean: "깊고 미지근한 바다",
  ocean: "바다",
  deep_ocean: "깊은 바다",
  cold_ocean: "차가운 바다",
  deep_cold_ocean: "깊고 차가운 바다",
  frozen_ocean: "얼어붙은 바다",
  deep_frozen_ocean: "깊고 얼어붙은 바다",
  mushroom_fields: "버섯 들판",
  dripstone_caves: "점적석 동굴",
  lush_caves: "무성한 동굴",
  deep_dark: "깊은 어둠",
};

const ADVANCEMENT_KO: Record<string, string> = {
  "story/root": "마인크래프트",
  "story/mine_stone": "석기 시대",
  "story/upgrade_tools": "구식다리건",
  "story/smelt_iron": "철 좀 들자",
  "story/obtain_armor": "무장 완료",
  "story/lava_bucket": "핫 스터프",
  "story/iron_tools": "철 곡괭이잖아",
  "story/deflect_arrow": "반사",
  "story/form_obsidian": "얼음 양동이 챌린지",
  "story/mine_diamond": "다이아몬드!",
  "story/enter_the_nether": "더 깊은 곳으로",
  "story/shiny_gear": "다이아몬드로 나를 감싸줘",
  "story/enchant_item": "마법 부여사",
  "story/cure_zombie_villager": "좀비 의사",
  "story/follow_ender_eye": "눈을 따라서",
  "story/enter_the_end": "끝?",
  "adventure/root": "모험",
  "adventure/kill_a_mob": "몬스터 사냥꾼",
  "adventure/sleep_in_bed": "좋은 꿈 꿔",
  "adventure/adventuring_time": "모험의 시간",
  "adventure/trade": "훌륭한 거래",
  "adventure/kill_all_mobs": "사냥당한 몬스터",
  "adventure/totem_of_undying": "죽음 초월",
  "husbandry/root": "농사",
  "husbandry/plant_seed": "씨앗 심기",
  "husbandry/breed_an_animal": "사랑의 결실",
  "husbandry/tame_an_animal": "영원한 단짝",
  "husbandry/fishy_business": "수상한 거래",
  "nether/root": "네더",
  "nether/obtain_ancient_debris": "심연 속 숨겨진 보물",
  "nether/netherite_armor": "잔해로 나를 감싸줘",
  "end/root": "엔드",
  "end/kill_dragon": "엔드 해방",
  "end/elytra": "하늘 끝까지",
};

function formatMcIdentifier(id: string): string {
  if (ITEM_BLOCK_KO[id]) {
    return `${ITEM_BLOCK_KO[id]} (${id})`;
  }
  const readable = id
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  return readable;
}

function formatBiomeName(id: string): string {
  return BIOME_KO[id] || id.replace(/_/g, " ");
}

function formatAdvancementName(key: string): string {
  if (ADVANCEMENT_KO[key]) return ADVANCEMENT_KO[key];
  const [, slug] = key.split("/");
  if (!slug) return key;
  return slug
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
}

function formatPlaytime(ms: number): string {
  if (!ms || ms <= 0) return "0분";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours.toLocaleString()}시간 ${minutes}분`;
  }
  if (minutes > 0) {
    return `${minutes}분 ${seconds}초`;
  }
  return `${seconds}초`;
}

function formatDistanceCm(cm: number): string {
  if (!cm || cm <= 0) return "0 m";
  const meters = cm / 100;
  if (meters >= 1000) {
    return `${(meters / 1000).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} km`;
  }
  return `${Math.round(meters).toLocaleString()} m`;
}

function formatMoney(amount: number): string {
  return `$${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatTimestamp(ms: number): string {
  if (!ms || ms <= 0) return "기록 없음";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "기록 없음";
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRankMeta(rankName: string) {
  const found = SERVER_RANKS.find(
      (r) => r.name.toLowerCase() === (rankName || "coal").toLowerCase()
  );
  return found || SERVER_RANKS[0];
}

export default function StatsDashboard() {
  const [data, setData] = useState<StatsApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null);
  const [skillCategory, setSkillCategory] = useState<"all" | SkillCategory>("all");
  const [leaderboardMetric, setLeaderboardMetric] =
      useState<LeaderboardMetric>("playtime");
  const [copiedClaimId, setCopiedClaimId] = useState<number | null>(null);

  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [isDark, setIsDark] = useState<boolean>(true);

  useEffect(() => {
    const saved = localStorage.getItem("everest-theme") as ThemeMode | null;
    if (saved === "light" || saved === "dark" || saved === "system") {
      setThemeMode(saved);
    }
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = (mode: ThemeMode) => {
      const resolvedDark =
          mode === "dark" || (mode === "system" && mediaQuery.matches);
      setIsDark(resolvedDark);
      document.documentElement.classList.toggle("dark", resolvedDark);
    };

    applyTheme(themeMode);
    localStorage.setItem("everest-theme", themeMode);

    const handleSystemChange = () => {
      if (themeMode === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleSystemChange);
    return () => mediaQuery.removeEventListener("change", handleSystemChange);
  }, [themeMode]);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "";

  const fetchStats = useCallback(
      async (isManualRefresh = false) => {
        try {
          if (isManualRefresh) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }
          setError(null);

          const res = await fetch(`${apiBase}/api/stats`, {
            cache: "no-store",
          });

          if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(
                errJson.details || errJson.error || `HTTP ${res.status}`
            );
          }

          const json = (await res.json()) as StatsApiResponse;
          setData(json);

          setSelectedUuid((prev) => {
            if (prev && json.players.some((p) => p.uuid === prev)) {
              return prev;
            }
            return null;
          });
        } catch (err) {
          setError(
              err instanceof Error ? err.message : "데이터를 불러오지 못했습니다."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [apiBase]
  );

  useEffect(() => {
    fetchStats(false);
    const timer = setInterval(() => {
      fetchStats(true);
    }, 30000);
    return () => clearInterval(timer);
  }, [fetchStats]);

  const filteredPlayers = useMemo(() => {
    if (!data) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return data.players;
    return data.players.filter(
        (p) =>
            p.username.toLowerCase().includes(q) ||
            (p.nickname && p.nickname.toLowerCase().includes(q)) ||
            p.uuid.toLowerCase().includes(q) ||
            p.rank.toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  const sortedLeaderboard = useMemo(() => {
    const list = [...filteredPlayers];
    list.sort((a, b) => {
      if (leaderboardMetric === "playtime") {
        return b.totalPlayTimeMs - a.totalPlayTimeMs;
      }
      if (leaderboardMetric === "power") {
        return b.powerLevel - a.powerLevel;
      }
      if (leaderboardMetric === "balance") {
        return b.balance - a.balance;
      }
      if (leaderboardMetric === "claims") {
        return b.claims.usedBlocks - a.claims.usedBlocks;
      }
      if (leaderboardMetric === "mined") {
        return (b.vanillaStats?.totalMined || 0) - (a.vanillaStats?.totalMined || 0);
      }
      if (leaderboardMetric === "advancements") {
        return (
            (b.advancements?.totalCompleted || 0) -
            (a.advancements?.totalCompleted || 0)
        );
      }
      if (leaderboardMetric === "distance") {
        return (
            (b.vanillaStats?.totalDistanceCm || 0) -
            (a.vanillaStats?.totalDistanceCm || 0)
        );
      }
      if (leaderboardMetric === "survival") {
        return (
            (b.vanillaStats?.timeSinceDeathMs || 0) -
            (a.vanillaStats?.timeSinceDeathMs || 0)
        );
      }
      const levelDiff =
          (b.skills[leaderboardMetric]?.level || 0) -
          (a.skills[leaderboardMetric]?.level || 0);
      if (levelDiff !== 0) return levelDiff;
      return (
          (b.skills[leaderboardMetric]?.xp || 0) -
          (a.skills[leaderboardMetric]?.xp || 0)
      );
    });
    return list;
  }, [filteredPlayers, leaderboardMetric]);

  const selectedPlayer: PlayerSummary | null = useMemo(() => {
    if (!data || !selectedUuid) return null;
    return data.players.find((p) => p.uuid === selectedUuid) || null;
  }, [data, selectedUuid]);

  useEffect(() => {
    if (!selectedPlayer) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedUuid(null);
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedPlayer]);

  const visibleSkills = useMemo(() => {
    if (skillCategory === "all") return MCMMO_SKILLS;
    return MCMMO_SKILLS.filter((s) => s.category === skillCategory);
  }, [skillCategory]);

  const handleCopyClaimCoords = (claimId: number, x: number, y: number, z: number) => {
    navigator.clipboard?.writeText(`${x} ${y} ${z}`);
    setCopiedClaimId(claimId);
    setTimeout(() => setCopiedClaimId(null), 1800);
  };

  if (loading && !data) {
    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#090d16] text-slate-800 dark:text-slate-200 p-6 transition-colors">
          <div
              className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 mb-4">
            <RefreshCw className="w-8 h-8 text-cyan-600 dark:text-cyan-400 animate-spin"/>
          </div>
          <h2 className="text-lg font-semibold tracking-tight">
            Everest MC
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            데이터를 불러오는 중
          </p>
        </div>
    );
  }

  if (error && !data) {
    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#090d16] text-slate-800 dark:text-slate-200 p-6 transition-colors">
          <div
              className="max-w-md w-full rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/40 p-6 text-center shadow-sm">
            <Database className="w-10 h-10 text-rose-500 dark:text-rose-400 mx-auto mb-3"/>
            <h2 className="text-lg font-bold text-rose-800 dark:text-rose-200">
              API Connection Error
            </h2>
            <p className="text-sm text-rose-600 dark:text-rose-300/90 mt-2 wrap-break-word">{error}</p>
            <button
                onClick={() => fetchStats(false)}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 dark:bg-rose-500 dark:hover:bg-rose-400 text-white text-sm font-medium transition"
            >
              <RefreshCw className="w-4 h-4"/>
              Retry
            </button>
          </div>
        </div>
    );
  }

  const overview = data?.overview;
  const rankMeta = selectedPlayer ? getRankMeta(selectedPlayer.rank) : SERVER_RANKS[0];
  const nextRankMeta = rankMeta.nextRank ? getRankMeta(rankMeta.nextRank) : null;
  const activeRankColor = isDark ? rankMeta.color : rankMeta.lightColor;
  const activeNextRankColor = nextRankMeta
      ? isDark
          ? nextRankMeta.color
          : nextRankMeta.lightColor
      : "";

  const isMcmmoMetric =
      leaderboardMetric === "power" ||
      MCMMO_SKILLS.some((s) => s.key === leaderboardMetric);

  return (
      <div
          className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 pb-28 sm:pb-32 transition-colors duration-200">
        {/* Floating Bottom Pill Navigation Bar */}
        <nav
            aria-label="하단 플로팅 컨트롤 바"
            className="fixed bottom-4 sm:bottom-6 inset-x-0 z-40 px-3 sm:px-6 pointer-events-none flex justify-center"
        >
          <div
              className="pointer-events-auto w-full max-w-xl rounded-full backdrop-blur-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-700/80 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.18)] dark:shadow-[0_12px_40px_-6px_rgba(0,0,0,0.75)] px-2.5 sm:px-3.5 py-1.5 sm:py-2 flex items-center gap-1.5 sm:gap-2.5 transition-colors">
            {/* Brand Icon Badge */}
            <div
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/25 shrink-0"
                title="EVEREST MC"
            >
              <Sparkles className="w-4 h-4 text-white"/>
            </div>

            {/* Search Input inside Floating Pill */}
            <div className="relative flex-1 min-w-0">
              <Search
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"/>
              <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="플레이어 / UUID 검색..."
                  className="w-full pl-9 pr-7 py-1.5 rounded-full bg-slate-100/90 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 text-base sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition"
              />
              {searchQuery && (
                  <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label="검색어 지우기"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5"/>
                  </button>
              )}
            </div>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 shrink-0"/>

            {/* Theme Switcher Pill */}
            <div
                className="inline-flex items-center p-0.5 rounded-full bg-slate-100 dark:bg-slate-950/90 border border-slate-200/80 dark:border-slate-800 shrink-0"
                role="group"
                aria-label="테마 모드 선택"
            >
              <button
                  type="button"
                  onClick={() => setThemeMode("light")}
                  title="라이트 모드"
                  className={`p-1.5 rounded-full transition ${
                      themeMode === "light"
                          ? "bg-white dark:bg-slate-800 text-amber-500 shadow-xs"
                          : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
              >
                <Sun className="w-3.5 h-3.5"/>
              </button>
              <button
                  type="button"
                  onClick={() => setThemeMode("dark")}
                  title="다크 모드"
                  className={`p-1.5 rounded-full transition ${
                      themeMode === "dark"
                          ? "bg-white dark:bg-slate-800 text-cyan-500 dark:text-cyan-400 shadow-xs"
                          : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
              >
                <Moon className="w-3.5 h-3.5"/>
              </button>
              <button
                  type="button"
                  onClick={() => setThemeMode("system")}
                  title="시스템 설정 따르기"
                  className={`p-1.5 rounded-full transition ${
                      themeMode === "system"
                          ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                          : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
              >
                <Monitor className="w-3.5 h-3.5"/>
              </button>
            </div>

            {/* Refresh Pill Button */}
            <button
                onClick={() => fetchStats(true)}
                disabled={refreshing}
                title="새로고침"
                className="inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-full bg-cyan-500/15 hover:bg-cyan-500/25 active:scale-95 border border-cyan-500/30 text-xs font-semibold text-cyan-700 dark:text-cyan-300 transition disabled:opacity-50 shrink-0"
            >
              <RefreshCw
                  className={`w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 ${
                      refreshing ? "animate-spin" : ""
                  }`}
              />
              <span className="hidden sm:inline">새로고침</span>
            </button>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-4 sm:pt-7 space-y-4 sm:space-y-6">
          {/* Top Brand & Status Banner */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white"/>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
                    EVEREST MC
                  </h1>
                  <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"/>
                    LIVE
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                  Live Stats Dashboard
                </p>
              </div>
            </div>

            {overview && (
                <div
                    className="text-[11px] sm:text-xs text-slate-500 flex items-center gap-1.5 shrink-0 bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 px-2.5 py-1.5 rounded-full">
                  <Activity className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0"/>
                  <span className="hidden sm:inline">최근 업데이트:</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {new Date(overview.queriedAt).toLocaleTimeString("ko-KR")}
                  </span>
                </div>
            )}
          </div>

          {/* Server Overview Summary Cards */}
          {overview && (
              <section className="space-y-2.5 sm:space-y-3.5">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
                  <div
                      className="rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800/90 p-3 sm:p-4 flex flex-col justify-between shadow-xs dark:shadow-none">
                    <div
                        className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] sm:text-xs font-medium">
                      <span>등록 플레이어</span>
                      <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-600 dark:text-cyan-400 shrink-0"/>
                    </div>
                    <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1.5 sm:gap-2 flex-wrap">
                  <span className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">
                    {overview.totalPlayers.toLocaleString()}명
                  </span>
                      <span className="text-[11px] sm:text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    온라인 {overview.onlinePlayers}명
                  </span>
                    </div>
                  </div>

                  <div
                      className="rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800/90 p-3 sm:p-4 flex flex-col justify-between shadow-xs dark:shadow-none">
                    <div
                        className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] sm:text-xs font-medium">
                      <span>누적 플레이타임</span>
                      <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400 shrink-0"/>
                    </div>
                    <div className="mt-1.5 sm:mt-2">
                  <span className="text-base sm:text-xl font-bold text-slate-900 dark:text-white">
                    {formatPlaytime(overview.totalPlayTimeMs)}
                  </span>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
                        전체 기록
                      </p>
                    </div>
                  </div>

                  <div
                      className="rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800/90 p-3 sm:p-4 flex flex-col justify-between shadow-xs dark:shadow-none">
                    <div
                        className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] sm:text-xs font-medium">
                      <span>총 유통 화폐</span>
                      <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 dark:text-amber-400 shrink-0"/>
                    </div>
                    <div className="mt-1.5 sm:mt-2">
                  <span className="text-base sm:text-xl font-bold text-amber-600 dark:text-amber-300 break-all">
                    {formatMoney(overview.totalBalance)}
                  </span>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
                        전체 유저 보유 잔액 합계
                      </p>
                    </div>
                  </div>

                  <div
                      className="rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800/90 p-3 sm:p-4 flex flex-col justify-between shadow-xs dark:shadow-none">
                    <div
                        className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] sm:text-xs font-medium">
                      <span>총 파워 레벨</span>
                      <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400 shrink-0"/>
                    </div>
                    <div className="mt-1.5 sm:mt-2">
                  <span className="text-lg sm:text-2xl font-bold text-purple-600 dark:text-purple-300">
                    Lv. {overview.totalPowerLevel.toLocaleString()}
                  </span>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
                        17종 스킬 레벨 총합
                      </p>
                    </div>
                  </div>

                  <div
                      className="col-span-2 md:col-span-1 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800/90 p-3 sm:p-4 flex flex-col justify-between shadow-xs dark:shadow-none">
                    <div
                        className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] sm:text-xs font-medium">
                      <span>보호된 영지</span>
                      <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 shrink-0"/>
                    </div>
                    <div className="mt-1.5 sm:mt-2 flex items-baseline gap-2">
                  <span className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-300">
                    {overview.totalClaims}개
                  </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                    ({overview.totalClaimedArea.toLocaleString()} 블록²)
                  </span>
                    </div>
                  </div>
                </div>

                {/* Secondary Server Activity & Rank Distribution Bar */}
                <div
                    className="rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800/90 p-3 sm:px-4 sm:py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-4 shadow-xs dark:shadow-none">
                  {/* Rank Distribution */}
                  <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar sm:flex-wrap">
                    <span
                        className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mr-0.5 shrink-0">
                      서버 등급 분포:
                    </span>
                    {SERVER_RANKS.map((r) => {
                      const count = overview.rankDistribution?.[r.name] || 0;
                      const rColor = isDark ? r.color : r.lightColor;
                      return (
                          <span
                              key={r.name}
                              className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-lg text-[11px] sm:text-xs font-medium border shrink-0"
                              style={{
                                color: rColor,
                                borderColor: `${rColor}40`,
                                backgroundColor: `${rColor}12`,
                              }}
                          >
                            <span>{r.label}</span>
                            <strong className="font-bold">{count}</strong>
                          </span>
                      );
                    })}
                  </div>

                  {/* World Aggregate Stats */}
                  <div
                      className="flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-1 text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200/70 dark:border-slate-800/70 lg:pt-0 lg:border-t-0">
                    <span className="inline-flex items-center gap-1.5">
                      <Pickaxe className="w-3.5 h-3.5 text-sky-500 shrink-0"/>
                      총 채굴 블록:{" "}
                      <strong className="text-slate-900 dark:text-white">
                        {(overview.totalMinedBlocks || 0).toLocaleString()}개
                      </strong>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Footprints className="w-3.5 h-3.5 text-emerald-500 shrink-0"/>
                      누적 이동 거리:{" "}
                      <strong className="text-slate-900 dark:text-white">
                        {formatDistanceCm((overview.totalDistanceMeters || 0) * 100)}
                      </strong>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Medal className="w-3.5 h-3.5 text-amber-500 shrink-0"/>
                      달성 발전 과제:{" "}
                      <strong className="text-slate-900 dark:text-white">
                        {(overview.totalAdvancements || 0).toLocaleString()}건
                      </strong>
                    </span>
                  </div>
                </div>
              </section>
          )}

          {/* Section Header */}
          <div
              className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2.5 sm:pb-3">
            <div className="flex items-center gap-2.5">
              <div
                  className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4 text-cyan-600 dark:text-cyan-400"/>
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  리더보드 & 플레이어 스탯
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                  플레이어를 클릭하면 상세 스탯을 확인할 수 있습니다.
                </p>
              </div>
            </div>
          </div>

          {/* UNIFIED LEADERBOARD VIEW */}
          <section className="space-y-3 sm:space-y-4">
            {/* Metric Filter Pills */}
            <div
                className="rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800/90 p-3 sm:p-4 space-y-2.5 sm:space-y-3 shadow-xs dark:shadow-none">
              <div className="flex items-center justify-between">
                <div
                    className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  주요 랭킹 부문
                </div>
                <span className="text-[10px] text-slate-400 sm:hidden">
                  좌우로 스크롤
                </span>
              </div>
              <div
                  className="flex overflow-x-auto no-scrollbar pb-0.5 -mx-1 px-1 sm:mx-0 sm:px-0 sm:pb-0 sm:flex-wrap gap-1.5 sm:gap-2">
                {[
                  {id: "playtime", label: "⏳ 총 플레이타임"},
                  {id: "power", label: "⚔ mcMMO 파워 레벨"},
                  {id: "balance", label: "💰 보유 잔액 (Balance)"},
                  {id: "claims", label: "🛡 영지 사용 면적"},
                  {id: "mined", label: "⛏ 누적 블록 채굴"},
                  {id: "advancements", label: "🏅 발전 과제 달성"},
                  {id: "distance", label: "👟 누적 이동 거리"},
                  {id: "survival", label: "💀 무사 생존 시간"},
                ].map((item) => {
                  const isActive =
                      item.id === "power"
                          ? isMcmmoMetric
                          : leaderboardMetric === item.id;
                  return (
                      <button
                          key={item.id}
                          onClick={() =>
                              setLeaderboardMetric(item.id as LeaderboardMetric)
                          }
                          className={`shrink-0 whitespace-nowrap px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                              isActive
                                  ? "bg-cyan-500/15 dark:bg-cyan-500/20 border-cyan-500 dark:border-cyan-400 text-cyan-800 dark:text-cyan-200"
                                  : "bg-slate-100/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                          }`}
                      >
                        {item.label}
                      </button>
                  );
                })}
              </div>

              {isMcmmoMetric && (
                  <div className="pt-2.5 border-t border-slate-200/80 dark:border-slate-800/70">
                    <div
                        className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1.5 sm:mb-2 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5"/>
                      <span>스킬별 랭킹</span>
                    </div>
                    <div
                        className="flex overflow-x-auto no-scrollbar pb-0.5 -mx-1 px-1 sm:mx-0 sm:px-0 sm:pb-0 sm:flex-wrap gap-1.5">
                      <button
                          onClick={() => setLeaderboardMetric("power")}
                          className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                              leaderboardMetric === "power"
                                  ? "bg-purple-500/15 dark:bg-purple-500/25 border-purple-500 dark:border-purple-400 text-purple-800 dark:text-purple-200"
                                  : "bg-slate-100/70 dark:bg-slate-950/50 border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                          }`}
                      >
                        전체 파워 레벨
                      </button>
                      {MCMMO_SKILLS.map((skill) => (
                          <button
                              key={skill.key}
                              onClick={() => setLeaderboardMetric(skill.key)}
                              className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                                  leaderboardMetric === skill.key
                                      ? "bg-purple-500/15 dark:bg-purple-500/25 border-purple-500 dark:border-purple-400 text-purple-800 dark:text-purple-200"
                                      : "bg-slate-100/70 dark:bg-slate-950/50 border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                              }`}
                          >
                            {skill.labelKo} ({skill.labelEn})
                          </button>
                      ))}
                    </div>
                  </div>
              )}
            </div>

            {/* Leaderboard Container: Mobile Cards + Desktop Table */}
            <div
                className="rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800/90 overflow-hidden shadow-xs dark:shadow-none">
              {/* Mobile Card List (< md) */}
              <div className="md:hidden divide-y divide-slate-200/70 dark:divide-slate-800/60">
                {sortedLeaderboard.map((player, idx) => {
                  const rMeta = getRankMeta(player.rank);
                  const rColor = isDark ? rMeta.color : rMeta.lightColor;
                  const isSelected = selectedPlayer?.uuid === player.uuid;
                  let primaryStatDisplay = "";
                  if (leaderboardMetric === "playtime") {
                    primaryStatDisplay = formatPlaytime(player.totalPlayTimeMs);
                  } else if (leaderboardMetric === "power") {
                    primaryStatDisplay = `Lv. ${player.powerLevel.toLocaleString()}`;
                  } else if (leaderboardMetric === "balance") {
                    primaryStatDisplay = formatMoney(player.balance);
                  } else if (leaderboardMetric === "claims") {
                    primaryStatDisplay = `${player.claims.usedBlocks.toLocaleString()} 블록² (${player.claims.claimCount}개)`;
                  } else if (leaderboardMetric === "mined") {
                    primaryStatDisplay = `${(player.vanillaStats?.totalMined || 0).toLocaleString()} 블록`;
                  } else if (leaderboardMetric === "advancements") {
                    primaryStatDisplay = `${player.advancements?.totalCompleted || 0}개 (바이옴 ${player.advancements?.visitedBiomes.length || 0}곳)`;
                  } else if (leaderboardMetric === "distance") {
                    primaryStatDisplay = formatDistanceCm(
                        player.vanillaStats?.totalDistanceCm || 0
                    );
                  } else if (leaderboardMetric === "survival") {
                    primaryStatDisplay = `${formatPlaytime(
                        player.vanillaStats?.timeSinceDeathMs || 0
                    )}`;
                  } else {
                    const s = player.skills[leaderboardMetric];
                    primaryStatDisplay = `Lv. ${s?.level || 0} (${(
                        s?.xp || 0
                    ).toLocaleString()} XP)`;
                  }

                  return (
                      <button
                          key={player.uuid}
                          type="button"
                          onClick={() => setSelectedUuid(player.uuid)}
                          className={`w-full text-left p-3.5 transition active:bg-slate-100 dark:active:bg-slate-800/70 ${
                              isSelected
                                  ? "bg-cyan-500/10 dark:bg-cyan-500/15"
                                  : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                          }`}
                      >
                        <div className="flex items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                                className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold shrink-0 ${
                                    idx === 0
                                        ? "bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/50"
                                        : idx === 1
                                            ? "bg-slate-300/40 dark:bg-slate-300/20 text-slate-700 dark:text-slate-200 border border-slate-400/40 dark:border-slate-300/40"
                                            : idx === 2
                                                ? "bg-amber-700/15 dark:bg-amber-700/25 text-amber-800 dark:text-amber-400 border border-amber-600/40"
                                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                }`}
                            >
                              #{idx + 1}
                            </span>

                            <div className="relative shrink-0">
                              <img
                                  src={`https://mc-heads.net/avatar/${encodeURIComponent(
                                      player.uuid
                                  )}/40`}
                                  alt={player.username}
                                  className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                              />
                              <span
                                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                                      player.isOnline
                                          ? "bg-emerald-500 dark:bg-emerald-400"
                                          : "bg-slate-400 dark:bg-slate-600"
                                  }`}
                              />
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                  {player.username}
                                </span>
                                <span
                                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold border"
                                    style={{
                                      color: rColor,
                                      borderColor: `${rColor}40`,
                                      backgroundColor: `${rColor}15`,
                                    }}
                                >
                                  {rMeta.label}
                                </span>
                                {player.primaryGroup === "admin" && (
                                    <span
                                        className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                      ADMIN
                                    </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {player.specialty?.title || `${player.uuid.slice(0, 8)}...`}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-xs font-bold text-cyan-700 dark:text-cyan-300">
                              {primaryStatDisplay}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              상세 보기 →
                            </div>
                          </div>
                        </div>

                        <div
                            className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span>
                            파워{" "}
                            <strong className="text-purple-600 dark:text-purple-300">
                              Lv.{player.powerLevel.toLocaleString()}
                            </strong>
                          </span>
                          <span>
                            잔액{" "}
                            <strong className="text-amber-600 dark:text-amber-300">
                              {formatMoney(player.balance)}
                            </strong>
                          </span>
                          <span>
                            플레이{" "}
                            <strong className="text-slate-700 dark:text-slate-300">
                              {formatPlaytime(player.totalPlayTimeMs)}
                            </strong>
                          </span>
                        </div>
                      </button>
                  );
                })}

                {sortedLeaderboard.length === 0 && (
                    <div className="py-10 text-center text-xs text-slate-500">
                      일치하는 플레이어가 없습니다.
                    </div>
                )}
              </div>

              {/* Desktop Table (md and up) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/60 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3.5 px-4 w-16">순위</th>
                    <th className="py-3.5 px-4">플레이어</th>
                    <th className="py-3.5 px-4">랭크 / 성향</th>
                    <th className="py-3.5 px-4 text-right">선택 부문</th>
                    <th className="py-3.5 px-4 text-right hidden md:table-cell">
                      파워 레벨
                    </th>
                    <th className="py-3.5 px-4 text-right hidden sm:table-cell">
                      잔액
                    </th>
                    <th className="py-3.5 px-4 text-right hidden lg:table-cell">
                      플레이타임
                    </th>
                  </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/60 text-sm">
                  {sortedLeaderboard.map((player, idx) => {
                    const rMeta = getRankMeta(player.rank);
                    const rColor = isDark ? rMeta.color : rMeta.lightColor;
                    const isSelected = selectedPlayer?.uuid === player.uuid;
                    let primaryStatDisplay = "";
                    if (leaderboardMetric === "playtime") {
                      primaryStatDisplay = formatPlaytime(
                          player.totalPlayTimeMs
                      );
                    } else if (leaderboardMetric === "power") {
                      primaryStatDisplay = `Lv. ${player.powerLevel.toLocaleString()}`;
                    } else if (leaderboardMetric === "balance") {
                      primaryStatDisplay = formatMoney(player.balance);
                    } else if (leaderboardMetric === "claims") {
                      primaryStatDisplay = `${player.claims.usedBlocks.toLocaleString()} 블록² (${player.claims.claimCount}개)`;
                    } else if (leaderboardMetric === "mined") {
                      primaryStatDisplay = `${(player.vanillaStats?.totalMined || 0).toLocaleString()} 블록`;
                    } else if (leaderboardMetric === "advancements") {
                      primaryStatDisplay = `${player.advancements?.totalCompleted || 0}개 달성 (바이옴 ${player.advancements?.visitedBiomes.length || 0}곳)`;
                    } else if (leaderboardMetric === "distance") {
                      primaryStatDisplay = formatDistanceCm(
                          player.vanillaStats?.totalDistanceCm || 0
                      );
                    } else if (leaderboardMetric === "survival") {
                      primaryStatDisplay = `${formatPlaytime(
                          player.vanillaStats?.timeSinceDeathMs || 0
                      )} (사망 ${player.vanillaStats?.deaths || 0}회)`;
                    } else {
                      const s = player.skills[leaderboardMetric];
                      primaryStatDisplay = `Lv. ${s?.level || 0} (${(
                          s?.xp || 0
                      ).toLocaleString()} XP)`;
                    }

                    return (
                        <tr
                            key={player.uuid}
                            onClick={() => setSelectedUuid(player.uuid)}
                            className={`cursor-pointer transition ${
                                isSelected
                                    ? "bg-cyan-500/10 dark:bg-cyan-500/15"
                                    : "hover:bg-slate-100/80 dark:hover:bg-slate-800/50"
                            }`}
                        >
                          <td className="py-3.5 px-4 font-bold">
                        <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs ${
                                idx === 0
                                    ? "bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/50"
                                    : idx === 1
                                        ? "bg-slate-300/40 dark:bg-slate-300/20 text-slate-700 dark:text-slate-200 border border-slate-400/40 dark:border-slate-300/40"
                                        : idx === 2
                                            ? "bg-amber-700/15 dark:bg-amber-700/25 text-amber-800 dark:text-amber-400 border border-amber-600/40"
                                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            }`}
                        >
                          #{idx + 1}
                        </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                  src={`https://mc-heads.net/avatar/${encodeURIComponent(
                                      player.uuid
                                  )}/40`}
                                  alt={player.username}
                                  className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                              />
                              <div>
                                <div
                                    className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                                  {player.username}
                                  {player.isOnline && (
                                      <span
                                          title="온라인"
                                          className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400"
                                      />
                                  )}
                                </div>
                                <div className="text-xs text-slate-500 font-mono">
                                  {player.uuid.slice(0, 8)}...
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                              className="px-2 py-0.5 rounded-md text-xs font-semibold border"
                              style={{
                                color: rColor,
                                borderColor: `${rColor}40`,
                                backgroundColor: `${rColor}15`,
                              }}
                          >
                            {rMeta.label}
                          </span>
                              {player.primaryGroup === "admin" && (
                                  <span
                                      className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                              ADMIN
                            </span>
                              )}
                              {player.specialty?.title && (
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {player.specialty.title}
                                  </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-cyan-700 dark:text-cyan-300">
                            {primaryStatDisplay}
                          </td>
                          <td className="py-3.5 px-4 text-right hidden md:table-cell text-purple-600 dark:text-purple-300 font-medium">
                            Lv. {player.powerLevel.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-right hidden sm:table-cell text-amber-600 dark:text-amber-300 font-medium">
                            {formatMoney(player.balance)}
                          </td>
                          <td className="py-3.5 px-4 text-right hidden lg:table-cell text-slate-600 dark:text-slate-300">
                            {formatPlaytime(player.totalPlayTimeMs)}
                          </td>
                        </tr>
                    );
                  })}

                  {sortedLeaderboard.length === 0 && (
                      <tr>
                        <td
                            colSpan={7}
                            className="py-10 text-center text-xs text-slate-500"
                        >
                          일치하는 플레이어가 없습니다.
                        </td>
                      </tr>
                  )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* PLAYER DETAILED STATS MODAL */}
          {selectedPlayer && (
              <div
                  className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-950/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
                  onClick={() => setSelectedUuid(null)}
                  role="dialog"
                  aria-modal="true"
                  aria-label={`${selectedPlayer.username} 플레이어 상세 스탯`}
              >
                <div
                    className="relative w-full max-w-5xl max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto overscroll-contain rounded-t-3xl sm:rounded-3xl bg-slate-50 dark:bg-[#0b101b] border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl p-3.5 sm:p-6 pb-8 sm:pb-6 space-y-4 sm:space-y-6"
                    onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Top Header Bar */}
                  <div
                      className="sticky top-0 z-20 -mx-3.5 sm:-mx-6 -mt-3.5 sm:-mt-6 px-4 sm:px-6 pt-2.5 sm:pt-3.5 pb-3 bg-slate-50/95 dark:bg-[#0b101b]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80">
                    <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-2.5 sm:hidden"/>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                            src={`https://mc-heads.net/avatar/${encodeURIComponent(
                                selectedPlayer.uuid
                            )}/32`}
                            alt={selectedPlayer.username}
                            className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shrink-0"
                        />
                        <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {selectedPlayer.username}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                          상세 스탯
                        </span>
                      </div>
                      <button
                          type="button"
                          onClick={() => setSelectedUuid(null)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200/80 hover:bg-slate-300/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition shrink-0"
                          aria-label="닫기"
                      >
                        <X className="w-4 h-4"/>
                        <span>닫기</span>
                      </button>
                    </div>
                  </div>
                        {/* 1. Player Hero Card & CMI Core Stats */}
                        <div
                            className="rounded-2xl bg-gradient-to-br from-white via-slate-50/90 to-slate-100/80 dark:from-slate-900/95 dark:via-slate-900/80 dark:to-slate-950 border border-slate-200/90 dark:border-slate-800/90 p-4 sm:p-6 relative overflow-hidden shadow-xs dark:shadow-none">
                          <div
                              className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
                            <div className="flex items-center gap-3.5 sm:gap-5 min-w-0 w-full md:w-auto">
                              {/* 3D Body Render */}
                              <div
                                  className="w-16 h-28 sm:w-24 sm:h-36 rounded-2xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-1.5 sm:p-2 shrink-0">
                                <img
                                    src={`https://mc-heads.net/body/${encodeURIComponent(
                                        selectedPlayer.uuid
                                    )}/140`}
                                    alt={selectedPlayer.username}
                                    className="max-h-full w-auto object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.25)] dark:drop-shadow-[0_6px_12px_rgba(0,0,0,0.6)]"
                                />
                              </div>

                              <div className="space-y-1.5 sm:space-y-2 min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span
                                className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold border ${
                                    selectedPlayer.isOnline
                                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                        : "bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700"
                                }`}
                            >
                              <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                      selectedPlayer.isOnline
                                          ? "bg-emerald-500 dark:bg-emerald-400 animate-pulse"
                                          : "bg-slate-400 dark:bg-slate-500"
                                  }`}
                              />
                              {selectedPlayer.isOnline ? "현재 온라인" : "오프라인"}
                            </span>

                                  <span
                                      className="px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold border"
                                      style={{
                                        color: activeRankColor,
                                        borderColor: `${activeRankColor}50`,
                                        backgroundColor: `${activeRankColor}15`,
                                      }}
                                  >
                              🏆 {rankMeta.label} 등급
                            </span>

                                  {selectedPlayer.primaryGroup === "admin" ? (
                                      <span
                                          className="px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30">
                                👑 ADMIN
                              </span>
                                  ) : (
                                      <span
                                          className="px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-medium bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                                USER
                              </span>
                                  )}

                                  {selectedPlayer.specialty && (
                                      <span
                                          className="px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                                        ✨ {selectedPlayer.specialty.title}
                                      </span>
                                  )}
                                </div>

                                <div>
                                  <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                                    {selectedPlayer.username}
                                  </h2>
                                  <p className="text-[11px] sm:text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5 break-all">
                                    UUID: {selectedPlayer.uuid}
                                  </p>
                                </div>

                                <div
                                    className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 pt-0.5 sm:pt-1">
                            <span>
                              최근 접속:{" "}
                              <strong className="text-slate-800 dark:text-slate-200">
                                {formatTimestamp(selectedPlayer.lastLoginTime)}
                              </strong>
                            </span>
                                  <span>
                              최근 로그오프:{" "}
                                    <strong className="text-slate-800 dark:text-slate-200">
                                {formatTimestamp(selectedPlayer.lastLogoffTime)}
                              </strong>
                            </span>
                                  <span>
                              추천(Votes):{" "}
                                    <strong className="text-cyan-700 dark:text-cyan-300">
                                {selectedPlayer.votes}회
                              </strong>
                            </span>
                                </div>
                              </div>
                            </div>

                            {/* Quick Highlight Stat Boxes */}
                            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full md:w-auto shrink-0">
                              <div
                                  className="rounded-xl bg-white/90 dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800/80 p-3 sm:p-3.5 min-w-0 sm:min-w-[140px]">
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <Coins className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0"/>
                                  <span className="truncate">보유 화폐 (Balance)</span>
                                </div>
                                <div
                                    className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-300 mt-1 truncate">
                                  {formatMoney(selectedPlayer.balance)}
                                </div>
                              </div>

                              <div
                                  className="rounded-xl bg-white/90 dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800/80 p-3 sm:p-3.5 min-w-0 sm:min-w-[140px]">
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0"/>
                                  <span className="truncate">총 플레이타임</span>
                                </div>
                                <div
                                    className="text-base sm:text-lg font-bold text-cyan-700 dark:text-cyan-300 mt-1 truncate">
                                  {formatPlaytime(selectedPlayer.totalPlayTimeMs)}
                                </div>
                              </div>

                              <div
                                  className="rounded-xl bg-white/90 dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800/80 p-3 sm:p-3.5 min-w-0 sm:min-w-[140px]">
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <Flame className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0"/>
                                  <span className="truncate">mcMMO 파워 레벨</span>
                                </div>
                                <div
                                    className="text-base sm:text-lg font-bold text-purple-600 dark:text-purple-300 mt-1 truncate">
                                  Lv. {selectedPlayer.powerLevel.toLocaleString()}
                                </div>
                              </div>

                              <div
                                  className="rounded-xl bg-white/90 dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800/80 p-3 sm:p-3.5 min-w-0 sm:min-w-[140px]">
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0"/>
                                  <span className="truncate">보유 클레임 블록</span>
                                </div>
                                <div
                                    className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-300 mt-1 truncate">
                                  {selectedPlayer.claims.totalAvailableBlocks.toLocaleString()}{" "}
                                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                              블록
                            </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Next Rank Progress Bar (from CMI Ranks.yml) */}
                          {nextRankMeta && (
                              <div className="mt-5 pt-4 border-t border-slate-200/90 dark:border-slate-800/80">
                                <div className="flex items-center justify-between text-xs mb-2 flex-wrap gap-1">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-amber-500 dark:text-amber-400"/>
                            다음 승급 목표:{" "}
                            <span style={{color: activeNextRankColor}}>
                              {nextRankMeta.label} 랭크
                            </span>
                          </span>
                                  <span className="text-slate-500 dark:text-slate-400">
                            비용 {formatMoney(nextRankMeta.moneyCost)} · 플레이타임{" "}
                                    {Math.round(nextRankMeta.playtimeSec / 3600)}시간 · 파워{" "}
                                    Lv.{nextRankMeta.powerRequired}
                          </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                  {/* Money Progress */}
                                  {(() => {
                                    const pct =
                                        nextRankMeta.moneyCost > 0
                                            ? Math.min(
                                                100,
                                                Math.round(
                                                    (selectedPlayer.balance /
                                                        nextRankMeta.moneyCost) *
                                                    100
                                                )
                                            )
                                            : 100;
                                    return (
                                        <div
                                            className="bg-white/80 dark:bg-slate-950/60 rounded-lg p-2.5 border border-slate-200/80 dark:border-slate-800/70">
                                          <div
                                              className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                                            <span>Balance</span>
                                            <span className="text-amber-600 dark:text-amber-300 font-semibold">
                                    {pct}%
                                  </span>
                                          </div>
                                          <div
                                              className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-amber-500 dark:bg-amber-400 rounded-full transition-all"
                                                style={{width: `${pct}%`}}
                                            />
                                          </div>
                                        </div>
                                    );
                                  })()}

                                  {/* Playtime Progress */}
                                  {(() => {
                                    const reqMs = nextRankMeta.playtimeSec * 1000;
                                    const pct =
                                        reqMs > 0
                                            ? Math.min(
                                                100,
                                                Math.round(
                                                    (selectedPlayer.totalPlayTimeMs / reqMs) *
                                                    100
                                                )
                                            )
                                            : 100;
                                    return (
                                        <div
                                            className="bg-white/80 dark:bg-slate-950/60 rounded-lg p-2.5 border border-slate-200/80 dark:border-slate-800/70">
                                          <div
                                              className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                                            <span>Playtime</span>
                                            <span className="text-cyan-600 dark:text-cyan-300 font-semibold">
                                    {pct}%
                                  </span>
                                          </div>
                                          <div
                                              className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-cyan-500 dark:bg-cyan-400 rounded-full transition-all"
                                                style={{width: `${pct}%`}}
                                            />
                                          </div>
                                        </div>
                                    );
                                  })()}

                                  {/* Power Level Progress */}
                                  {(() => {
                                    const pct =
                                        nextRankMeta.powerRequired > 0
                                            ? Math.min(
                                                100,
                                                Math.round(
                                                    (selectedPlayer.powerLevel /
                                                        nextRankMeta.powerRequired) *
                                                    100
                                                )
                                            )
                                            : 100;
                                    return (
                                        <div
                                            className="bg-white/80 dark:bg-slate-950/60 rounded-lg p-2.5 border border-slate-200/80 dark:border-slate-800/70">
                                          <div
                                              className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                                            <span>mcMMO</span>
                                            <span className="text-purple-600 dark:text-purple-300 font-semibold">
                                    {pct}%
                                  </span>
                                          </div>
                                          <div
                                              className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-purple-500 dark:bg-purple-400 rounded-full transition-all"
                                                style={{width: `${pct}%`}}
                                            />
                                          </div>
                                        </div>
                                    );
                                  })()}
                                </div>
                              </div>
                          )}
                        </div>

                        {/* 2. Vanilla Minecraft Survival, Combat, Movement & Top Blocks/Items */}
                        {selectedPlayer.vanillaStats && (
                            <div
                                className="rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800/90 p-5 sm:p-6 space-y-5 shadow-xs dark:shadow-none">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div>
                                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Footprints className="w-4 h-4 text-emerald-600 dark:text-emerald-400"/>
                                    인게임 생존 · 전투 · 이동 & 장인 기록
                                  </h3>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    마인크래프트 바닐라 통계
                                  </p>
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  총 채굴:{" "}
                                  <strong className="text-slate-900 dark:text-white">
                                    {selectedPlayer.vanillaStats.totalMined.toLocaleString()}블록
                                  </strong>{" "}
                                  · 도구/블록 사용:{" "}
                                  <strong className="text-slate-900 dark:text-white">
                                    {selectedPlayer.vanillaStats.totalUsed.toLocaleString()}회
                                  </strong>{" "}
                                  · 아이템 획득:{" "}
                                  <strong className="text-slate-900 dark:text-white">
                                    {selectedPlayer.vanillaStats.totalPickedUp.toLocaleString()}개
                                  </strong>
                                </div>
                              </div>

                              {/* Survival & Combat Highlight Row */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                                <div
                                    className="rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 p-3">
                                  <div
                                      className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                    <Skull className="w-3.5 h-3.5 text-rose-500"/>
                                    사망 횟수
                                  </div>
                                  <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                                    {selectedPlayer.vanillaStats.deaths.toLocaleString()}회
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    파괴한 도구 {selectedPlayer.vanillaStats.totalBroken}개
                                  </div>
                                </div>

                                <div
                                    className="rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 p-3">
                                  <div
                                      className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-emerald-500"/>
                                    무사 생존 시간
                                  </div>
                                  <div className="text-base font-bold text-emerald-600 dark:text-emerald-300 mt-1">
                                    {formatPlaytime(selectedPlayer.vanillaStats.timeSinceDeathMs)}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    마지막 사망 이후
                                  </div>
                                </div>

                                <div
                                    className="rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 p-3">
                                  <div
                                      className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                    <Sword className="w-3.5 h-3.5 text-amber-500"/>
                                    몬스터 / 유저 처치
                                  </div>
                                  <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                                    {selectedPlayer.vanillaStats.mobKills.toLocaleString()}{" "}
                                    <span className="text-xs font-normal text-slate-400">
                                      / {selectedPlayer.vanillaStats.playerKills}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    몹 처치 / PvP 처치
                                  </div>
                                </div>

                                <div
                                    className="rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 p-3">
                                  <div
                                      className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                    <HeartCrack className="w-3.5 h-3.5 text-purple-500"/>
                                    가한 / 받은 피해
                                  </div>
                                  <div className="text-base font-bold text-purple-600 dark:text-purple-300 mt-1">
                                    {selectedPlayer.vanillaStats.damageDealt.toLocaleString()}{" "}
                                    <span className="text-xs font-normal text-slate-400">
                                      / {selectedPlayer.vanillaStats.damageTaken.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    HP 데미지 환산
                                  </div>
                                </div>

                                <div
                                    className="rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 p-3">
                                  <div
                                      className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                    <Footprints className="w-3.5 h-3.5 text-cyan-500"/>
                                    총 이동 거리
                                  </div>
                                  <div className="text-base font-bold text-cyan-700 dark:text-cyan-300 mt-1">
                                    {formatDistanceCm(selectedPlayer.vanillaStats.totalDistanceCm)}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    점프 {selectedPlayer.vanillaStats.jumps.toLocaleString()}회
                                  </div>
                                </div>

                                <div
                                    className="rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 p-3">
                                  <div
                                      className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                    <Wrench className="w-3.5 h-3.5 text-blue-500"/>
                                    아이템 제작 횟수
                                  </div>
                                  <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                                    {selectedPlayer.vanillaStats.totalCrafted.toLocaleString()}개
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    재접속 {selectedPlayer.vanillaStats.leaveGameCount}회
                                  </div>
                                </div>
                              </div>

                              {/* Movement Breakdown Bar */}
                              {selectedPlayer.vanillaStats.totalDistanceCm > 0 && (
                                  <div
                                      className="rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800/80 p-3.5 space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                                        이동 수단별 거리 비중
                                      </span>
                                      <div
                                          className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                                        <span>
                                          🚶 도보:{" "}
                                          <strong className="text-emerald-600 dark:text-emerald-300">
                                            {formatDistanceCm(selectedPlayer.vanillaStats.walkCm)}
                                          </strong>
                                        </span>
                                        <span>
                                          🏃 질주:{" "}
                                          <strong className="text-cyan-600 dark:text-cyan-300">
                                            {formatDistanceCm(selectedPlayer.vanillaStats.sprintCm)}
                                          </strong>
                                        </span>
                                        <span>
                                          🏊 수영/수중:{" "}
                                          <strong className="text-blue-600 dark:text-blue-300">
                                            {formatDistanceCm(selectedPlayer.vanillaStats.swimCm)}
                                          </strong>
                                        </span>
                                        <span>
                                          🪽 비행/겉날개:{" "}
                                          <strong className="text-purple-600 dark:text-purple-300">
                                            {formatDistanceCm(selectedPlayer.vanillaStats.flyCm)}
                                          </strong>
                                        </span>
                                        {selectedPlayer.vanillaStats.vehicleCm > 0 && (
                                            <span>
                                              🚣 탈것:{" "}
                                              <strong className="text-amber-600 dark:text-amber-300">
                                                {formatDistanceCm(selectedPlayer.vanillaStats.vehicleCm)}
                                              </strong>
                                            </span>
                                        )}
                                      </div>
                                    </div>
                                    {(() => {
                                      const tot = Math.max(1, selectedPlayer.vanillaStats.totalDistanceCm);
                                      const wPct = (selectedPlayer.vanillaStats.walkCm / tot) * 100;
                                      const spPct = (selectedPlayer.vanillaStats.sprintCm / tot) * 100;
                                      const swPct = (selectedPlayer.vanillaStats.swimCm / tot) * 100;
                                      const flPct = (selectedPlayer.vanillaStats.flyCm / tot) * 100;
                                      const vPct = (selectedPlayer.vanillaStats.vehicleCm / tot) * 100;
                                      return (
                                          <div
                                              className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
                                            <div
                                                className="h-full bg-emerald-500"
                                                style={{width: `${wPct}%`}}
                                                title={`도보: ${formatDistanceCm(selectedPlayer.vanillaStats.walkCm)}`}
                                            />
                                            <div
                                                className="h-full bg-cyan-500"
                                                style={{width: `${spPct}%`}}
                                                title={`질주: ${formatDistanceCm(selectedPlayer.vanillaStats.sprintCm)}`}
                                            />
                                            <div
                                                className="h-full bg-blue-500"
                                                style={{width: `${swPct}%`}}
                                                title={`수영/수중: ${formatDistanceCm(selectedPlayer.vanillaStats.swimCm)}`}
                                            />
                                            <div
                                                className="h-full bg-purple-500"
                                                style={{width: `${flPct}%`}}
                                                title={`비행: ${formatDistanceCm(selectedPlayer.vanillaStats.flyCm)}`}
                                            />
                                            <div
                                                className="h-full bg-amber-500"
                                                style={{width: `${vPct}%`}}
                                                title={`탈것: ${formatDistanceCm(selectedPlayer.vanillaStats.vehicleCm)}`}
                                            />
                                          </div>
                                      );
                                    })()}
                                  </div>
                              )}

                              {/* Top Mined & Top Used */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div
                                    className="rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800/80 p-3.5 space-y-2.5">
                                  <div
                                      className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                    <span>⛏ 최다 채굴 블록 TOP 5</span>
                                    <span className="text-[11px] font-normal text-slate-500">
                                      총 {selectedPlayer.vanillaStats.totalMined.toLocaleString()}개
                                    </span>
                                  </div>
                                  {selectedPlayer.vanillaStats.topMined.length > 0 ? (
                                      <div className="space-y-1.5">
                                        {selectedPlayer.vanillaStats.topMined.map((item, idx) => (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800/70"
                                            >
                                              <span className="text-slate-700 dark:text-slate-200 font-medium truncate">
                                                <strong className="text-sky-600 dark:text-sky-400 mr-1.5">
                                                  #{idx + 1}
                                                </strong>
                                                {formatMcIdentifier(item.id)}
                                              </span>
                                              <span
                                                  className="font-mono font-semibold text-sky-700 dark:text-sky-300 shrink-0">
                                                {item.count.toLocaleString()}개
                                              </span>
                                            </div>
                                        ))}
                                      </div>
                                  ) : (
                                      <div className="text-xs text-slate-500 py-3 text-center">
                                        채굴한 블록 기록이 없습니다.
                                      </div>
                                  )}
                                </div>

                                <div
                                    className="rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800/80 p-3.5 space-y-2.5">
                                  <div
                                      className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                    <span>🔨 최다 사용 도구·블록 TOP 5</span>
                                    <span className="text-[11px] font-normal text-slate-500">
                                      총 {selectedPlayer.vanillaStats.totalUsed.toLocaleString()}회
                                    </span>
                                  </div>
                                  {selectedPlayer.vanillaStats.topUsed.length > 0 ? (
                                      <div className="space-y-1.5">
                                        {selectedPlayer.vanillaStats.topUsed.map((item, idx) => (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800/70"
                                            >
                                              <span className="text-slate-700 dark:text-slate-200 font-medium truncate">
                                                <strong className="text-amber-600 dark:text-amber-400 mr-1.5">
                                                  #{idx + 1}
                                                </strong>
                                                {formatMcIdentifier(item.id)}
                                              </span>
                                              <span
                                                  className="font-mono font-semibold text-amber-700 dark:text-amber-300 shrink-0">
                                                {item.count.toLocaleString()}회
                                              </span>
                                            </div>
                                        ))}
                                      </div>
                                  ) : (
                                      <div className="text-xs text-slate-500 py-3 text-center">
                                        사용한 도구·블록 기록이 없습니다.
                                      </div>
                                  )}
                                </div>
                              </div>
                            </div>
                        )}

                        {/* 3. mcMMO 17 Skills Panel with Specialty Balance & XP Progress */}
                        <div
                            className="rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800/90 p-4 sm:p-6 space-y-4 shadow-xs dark:shadow-none">
                          <div
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Sword className="w-4 h-4 text-purple-600 dark:text-purple-400"/>
                                mcMMO 통계
                              </h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                스킬별 레벨 및 다음 레벨업 필요 경험치(XP) 진행률
                              </p>
                            </div>

                            <div
                                className="grid grid-cols-4 sm:inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 w-full sm:w-auto">
                              {[
                                {id: "all", label: "전체 (17)"},
                                {id: "gathering", label: "🌿 채집 (5)"},
                                {id: "combat", label: "⚔ 전투 (9)"},
                                {id: "misc", label: "🔧 기타 (3)"},
                              ].map((tab) => (
                                  <button
                                      key={tab.id}
                                      onClick={() =>
                                          setSkillCategory(
                                              tab.id as "all" | SkillCategory
                                          )
                                      }
                                      className={`px-1.5 sm:px-2.5 py-1.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-medium text-center transition ${
                                          skillCategory === tab.id
                                              ? "bg-purple-500/15 dark:bg-purple-500/25 text-purple-800 dark:text-purple-200 border border-purple-500/40"
                                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                                      }`}
                                  >
                                    {tab.label}
                                  </button>
                              ))}
                            </div>
                          </div>

                          {/* Category Balance Bar */}
                          {selectedPlayer.specialty && (
                              <div
                                  className="rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3 text-xs flex-wrap">
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                                    스킬 성향 비중:
                                  </span>
                                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                    🌿 채집 Lv.{selectedPlayer.specialty.gatheringLevel}
                                  </span>
                                  <span className="text-rose-600 dark:text-rose-400 font-medium">
                                    ⚔ 전투 Lv.{selectedPlayer.specialty.combatLevel}
                                  </span>
                                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                                    🔧 기타 Lv.{selectedPlayer.specialty.miscLevel}
                                  </span>
                                </div>
                                <div
                                    className="w-full sm:w-64 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
                                  {(() => {
                                    const tot = Math.max(
                                        1,
                                        selectedPlayer.specialty.gatheringLevel +
                                        selectedPlayer.specialty.combatLevel +
                                        selectedPlayer.specialty.miscLevel
                                    );
                                    const gPct = (selectedPlayer.specialty.gatheringLevel / tot) * 100;
                                    const cPct = (selectedPlayer.specialty.combatLevel / tot) * 100;
                                    const mPct = (selectedPlayer.specialty.miscLevel / tot) * 100;
                                    return (
                                        <>
                                          <div
                                              className="h-full bg-emerald-500"
                                              style={{width: `${gPct}%`}}
                                          />
                                          <div
                                              className="h-full bg-rose-500"
                                              style={{width: `${cPct}%`}}
                                          />
                                          <div
                                              className="h-full bg-indigo-500"
                                              style={{width: `${mPct}%`}}
                                          />
                                        </>
                                    );
                                  })()}
                                </div>
                              </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {visibleSkills.map((meta) => {
                              const stat = selectedPlayer.skills[meta.key] || {
                                level: 0,
                                xp: 0,
                                xpToNext: 1020,
                              };
                              const xpToNext = stat.xpToNext || 1020 + stat.level * 20;
                              const xpPct = Math.min(
                                  100,
                                  Math.round((stat.xp / Math.max(1, xpToNext)) * 100)
                              );
                              const skillColor = isDark ? meta.color : meta.lightColor;

                              return (
                                  <div
                                      key={meta.key}
                                      className="rounded-xl bg-slate-50/80 dark:bg-slate-950/65 border border-slate-200/80 dark:border-slate-800/80 p-3.5 hover:border-slate-300 dark:hover:border-slate-700 transition"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                <span
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{backgroundColor: skillColor}}
                                />
                                        <span className="font-semibold text-sm text-slate-900 dark:text-white">
                                  {meta.labelKo}
                                </span>
                                        <span className="text-xs text-slate-500">
                                  {meta.labelEn}
                                </span>
                                      </div>
                                      <span
                                          className="text-sm font-bold"
                                          style={{color: skillColor}}
                                      >
                                Lv. {stat.level.toLocaleString()}
                              </span>
                                    </div>

                                    <div
                                        className="mt-2.5 w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800/90 overflow-hidden">
                                      <div
                                          className="h-full rounded-full transition-all duration-500"
                                          style={{
                                            width: `${xpPct}%`,
                                            backgroundColor: skillColor,
                                          }}
                                      />
                                    </div>

                                    <div
                                        className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                              <span>
                                다음 레벨 진행률:{" "}
                                <strong className="text-slate-700 dark:text-slate-200">
                                  {xpPct}%
                                </strong>
                              </span>
                                      <span className="font-mono text-slate-700 dark:text-slate-300">
                                {stat.xp.toLocaleString()} / {xpToNext.toLocaleString()} XP
                              </span>
                                    </div>
                                  </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* 4. Advancements & Biome Exploration Panel */}
                        {selectedPlayer.advancements && (
                            <div
                                className="rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800/90 p-5 sm:p-6 space-y-4 shadow-xs dark:shadow-none">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div>
                                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Medal className="w-4 h-4 text-amber-500 dark:text-amber-400"/>
                                    발전 과제 & 바이옴 탐험 진행도
                                  </h3>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    레시피 해금을 제외한 실제 인게임 발전 과제 및 오버월드 바이옴 탐험 기록
                                  </p>
                                </div>
                                <span
                                    className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                  총 {selectedPlayer.advancements.totalCompleted}개 발전 과제 달성
                                </span>
                              </div>

                              {/* 5 Advancement Categories */}
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                                {[
                                  {
                                    key: "story",
                                    label: "⛏ 스토리 (Story)",
                                    val: selectedPlayer.advancements.categories.story
                                  },
                                  {
                                    key: "adventure",
                                    label: "🗺 모험 (Adventure)",
                                    val: selectedPlayer.advancements.categories.adventure
                                  },
                                  {
                                    key: "husbandry",
                                    label: "🌾 농사 (Husbandry)",
                                    val: selectedPlayer.advancements.categories.husbandry
                                  },
                                  {
                                    key: "nether",
                                    label: "🔥 네더 (Nether)",
                                    val: selectedPlayer.advancements.categories.nether
                                  },
                                  {key: "end", label: "🐉 엔드 (End)", val: selectedPlayer.advancements.categories.end},
                                ].map((cat, idx) => (
                                    <div
                                        key={cat.key}
                                        className={`rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 p-3 flex items-center justify-between ${
                                            idx === 4 ? "col-span-2 sm:col-span-1" : ""
                                        }`}
                                    >
                                      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                        {cat.label}
                                      </span>
                                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                                        {cat.val}개
                                      </span>
                                    </div>
                                ))}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Visited Biomes (Adventuring Time) */}
                                <div
                                    className="rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800/80 p-3.5 space-y-2.5">
                                  <div className="flex items-center justify-between text-xs">
                                    <span
                                        className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                      <Compass className="w-3.5 h-3.5 text-emerald-500"/>
                                      모험의 시간 바이옴 탐험
                                    </span>
                                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                      {selectedPlayer.advancements.visitedBiomes.length} /{" "}
                                      {selectedPlayer.advancements.totalBiomesTarget} 곳
                                    </span>
                                  </div>
                                  <div
                                      className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 rounded-full transition-all"
                                        style={{
                                          width: `${Math.min(
                                              100,
                                              Math.round(
                                                  (selectedPlayer.advancements.visitedBiomes.length /
                                                      selectedPlayer.advancements.totalBiomesTarget) *
                                                  100
                                              )
                                          )}%`,
                                        }}
                                    />
                                  </div>
                                  {selectedPlayer.advancements.visitedBiomes.length > 0 ? (
                                      <div className="flex flex-wrap gap-1.5 pt-1 max-h-36 overflow-y-auto">
                                        {selectedPlayer.advancements.visitedBiomes.map((b) => (
                                            <span
                                                key={b.id}
                                                title={`방문 시각: ${b.visitedAt}`}
                                                className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                                            >
                                              {formatBiomeName(b.id)}
                                            </span>
                                        ))}
                                      </div>
                                  ) : (
                                      <div className="text-xs text-slate-500 py-2 text-center">
                                        방문한 바이옴 기록이 없습니다.
                                      </div>
                                  )}
                                </div>

                                {/* Recent Completed Advancements */}
                                <div
                                    className="rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800/80 p-3.5 space-y-2.5">
                                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    🏅 최근 달성한 발전 과제
                                  </div>
                                  {selectedPlayer.advancements.recent.length > 0 ? (
                                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                        {selectedPlayer.advancements.recent.map((adv) => (
                                            <div
                                                key={adv.key}
                                                className="flex items-center justify-between gap-2 text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800/70"
                                            >
                                              <div className="truncate">
                                                <span className="font-semibold text-amber-600 dark:text-amber-300">
                                                  {formatAdvancementName(adv.key)}
                                                </span>
                                                <span className="text-[11px] text-slate-400 ml-1.5 font-mono">
                                                  ({adv.key})
                                                </span>
                                              </div>
                                              <span className="text-[10px] font-mono text-slate-500 shrink-0">
                                                {adv.completedAt.slice(0, 16)}
                                              </span>
                                            </div>
                                        ))}
                                      </div>
                                  ) : (
                                      <div className="text-xs text-slate-500 py-4 text-center">
                                        아직 달성한 발전 과제가 없습니다.
                                      </div>
                                  )}
                                </div>
                              </div>
                            </div>
                        )}

                        {/* 5. GriefPrevention Claims & CMI Hourly Playtime Distribution */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* GriefPrevention Claims Card */}
                          <div
                              className="rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800/90 p-5 sm:p-6 space-y-4 shadow-xs dark:shadow-none">
                            <div>
                              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400"/>
                                영지 & 클레임 블록
                              </h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                보유 클레임 블록 한도 및 보호 구역 좌표 · 신뢰 멤버 정보
                              </p>
                            </div>

                            <div className="grid grid-cols-3 gap-2.5">
                              <div
                                  className="rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 p-3">
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                  누적+보너스
                                </div>
                                <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                                  {selectedPlayer.claims.totalAvailableBlocks.toLocaleString()}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  기본 {selectedPlayer.claims.accruedBlocks} / 보너스{" "}
                                  {selectedPlayer.claims.bonusBlocks}
                                </div>
                              </div>

                              <div
                                  className="rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 p-3">
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                  사용 중 면적
                                </div>
                                <div className="text-base font-bold text-emerald-600 dark:text-emerald-300 mt-0.5">
                                  {selectedPlayer.claims.usedBlocks.toLocaleString()}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  영지 {selectedPlayer.claims.claimCount}개
                                </div>
                              </div>

                              <div
                                  className="rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 p-3">
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                  남은 블록
                                </div>
                                <div className="text-base font-bold text-cyan-600 dark:text-cyan-300 mt-0.5">
                                  {selectedPlayer.claims.remainingBlocks.toLocaleString()}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  추가 확장 가능
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2.5">
                              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                생성된 영지 목록 ({selectedPlayer.claims.items.length})
                              </div>
                              {selectedPlayer.claims.items.length > 0 ? (
                                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                    {selectedPlayer.claims.items.map((claim) => {
                                      const centerX = Math.round((claim.minX + claim.maxX) / 2);
                                      const centerZ = Math.round((claim.minZ + claim.maxZ) / 2);
                                      const trustedList = Array.from(
                                          new Set([
                                            ...claim.builders,
                                            ...claim.containers,
                                            ...claim.accessors,
                                            ...claim.managers,
                                          ])
                                      );
                                      return (
                                          <div
                                              key={claim.id}
                                              className="rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800/90 p-3 space-y-2"
                                          >
                                            <div className="flex items-center justify-between gap-3">
                                              <div className="space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                        <span
                                            className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                          Claim #{claim.id}
                                        </span>
                                                  <span
                                                      className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                          <MapPin className="w-3 h-3 text-slate-500 dark:text-slate-400"/>
                                          월드: {claim.world}
                                        </span>
                                                  <button
                                                      type="button"
                                                      onClick={() =>
                                                          handleCopyClaimCoords(
                                                              claim.id,
                                                              centerX,
                                                              claim.minY,
                                                              centerZ
                                                          )
                                                      }
                                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-cyan-500/20 hover:text-cyan-600 dark:hover:text-cyan-300 transition"
                                                      title="중심 좌표 복사"
                                                  >
                                                    {copiedClaimId === claim.id ? (
                                                        <>
                                                          <Check className="w-2.5 h-2.5 text-emerald-500"/>
                                                          복사됨
                                                        </>
                                                    ) : (
                                                        <>
                                                          <Copy className="w-2.5 h-2.5"/>
                                                          좌표 복사
                                                        </>
                                                    )}
                                                  </button>
                                                </div>
                                                <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                                                  ({claim.minX}, {claim.minY}, {claim.minZ}) ~ (
                                                  {claim.maxX}, {claim.maxY}, {claim.maxZ})
                                                </div>
                                              </div>

                                              <div className="text-right shrink-0">
                                                <div
                                                    className="text-sm font-bold text-emerald-600 dark:text-emerald-300">
                                                  {claim.area.toLocaleString()} 블록²
                                                </div>
                                                <div className="text-[11px] text-slate-500">
                                                  {claim.width} × {claim.length}
                                                </div>
                                              </div>
                                            </div>

                                            {trustedList.length > 0 && (
                                                <div
                                                    className="pt-1.5 border-t border-slate-200/70 dark:border-slate-800/70 flex items-center gap-1.5 flex-wrap text-[11px]">
                                                  <span className="text-slate-500">
                                                    신뢰(Trust) 멤버:
                                                  </span>
                                                  {trustedList.map((member) => (
                                                      <span
                                                          key={member}
                                                          className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20"
                                                      >
                                                        {member}
                                                      </span>
                                                  ))}
                                                </div>
                                            )}
                                          </div>
                                      );
                                    })}
                                  </div>
                              ) : (
                                  <div
                                      className="rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/60 p-6 text-center text-xs text-slate-500">
                                    아직 생성한 영지가 없습니다.
                                  </div>
                              )}
                            </div>
                          </div>

                          {/* CMI Hourly Playtime Heatmap & Daily Log */}
                          <div
                              className="rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800/90 p-5 sm:p-6 space-y-4 shadow-xs dark:shadow-none">
                            <div>
                              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400"/>
                                시간대별 플레이 활동 분포
                              </h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                시간대별 접속 밀도 분석
                              </p>
                            </div>

                            {/* 24-Hour Bar Chart */}
                            {(() => {
                              const maxHourMs = Math.max(
                                  1,
                                  ...selectedPlayer.hourlyDistribution
                              );
                              return (
                                  <div className="pt-2">
                                    <div
                                        className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-1 items-end h-28 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3">
                                      {selectedPlayer.hourlyDistribution.map(
                                          (ms, hour) => {
                                            const heightPct =
                                                ms > 0
                                                    ? Math.max(
                                                        12,
                                                        Math.round((ms / maxHourMs) * 100)
                                                    )
                                                    : 4;
                                            return (
                                                <div
                                                    key={hour}
                                                    className="flex flex-col items-center justify-end h-full group relative"
                                                    title={`${hour}시: ${formatPlaytime(ms)}`}
                                                >
                                                  <div
                                                      className={`w-full rounded-t transition-all ${
                                                          ms > 0
                                                              ? "bg-gradient-to-t from-cyan-600 to-cyan-400 group-hover:from-cyan-500 group-hover:to-cyan-300"
                                                              : "bg-slate-200 dark:bg-slate-800/70"
                                                      }`}
                                                      style={{height: `${heightPct}%`}}
                                                  />
                                                </div>
                                            );
                                          }
                                      )}
                                    </div>
                                    <div
                                        className="flex justify-between text-[10px] text-slate-500 mt-1 px-1">
                                      <span>00시</span>
                                      <span>06시</span>
                                      <span>12시</span>
                                      <span>18시</span>
                                      <span>23시</span>
                                    </div>
                                  </div>
                              );
                            })()}

                            {/* Daily Playtime Records */}
                            <div className="space-y-2 pt-1">
                              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                최근 일자별 플레이타임 기록
                              </div>
                              {selectedPlayer.playtimeHistory.length > 0 ? (
                                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                    {selectedPlayer.playtimeHistory.map((day) => (
                                        <div
                                            key={day.dateInt}
                                            className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/70 text-xs"
                                        >
                                <span className="font-mono text-slate-700 dark:text-slate-300">
                                  {day.dateFormatted}
                                </span>
                                          <span className="font-semibold text-cyan-700 dark:text-cyan-300">
                                  {formatPlaytime(day.totalMs)}
                                </span>
                                        </div>
                                    ))}
                                  </div>
                              ) : (
                                  <div className="text-xs text-slate-500 py-4 text-center">
                                    일자별 플레이타임 세부 기록이 없습니다.
                                  </div>
                              )}
                            </div>
                          </div>
                        </div>
                </div>
              </div>
          )}
        </main>
      </div>
  );
}
