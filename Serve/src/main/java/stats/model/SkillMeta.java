package stats.model;

import java.util.List;

public record SkillMeta(String key, String labelKo, String labelEn, String category, String color, String lightColor,
                        String icon) {
    public static final List<SkillMeta> ALL = List.of(
            // Gathering (채집)
            new SkillMeta("mining", "채광", "Mining", "gathering", "#38bdf8", "#0284c7", "Pickaxe"), new SkillMeta("woodcutting", "벌목", "Woodcutting", "gathering", "#4ade80", "#16a34a", "Trees"), new SkillMeta("herbalism", "약초학", "Herbalism", "gathering", "#a3e635", "#4d7c0f", "Sprout"), new SkillMeta("excavation", "발굴", "Excavation", "gathering", "#fbbf24", "#d97706", "Shovel"), new SkillMeta("fishing", "낚시", "Fishing", "gathering", "#60a5fa", "#2563eb", "Fish"),

            // Combat (전투)
            new SkillMeta("swords", "검술", "Swords", "combat", "#f87171", "#dc2626", "Sword"), new SkillMeta("axes", "도끼술", "Axes", "combat", "#fb923c", "#ea580c", "Axe"), new SkillMeta("unarmed", "격투", "Unarmed", "combat", "#f43f5e", "#e11d48", "HandMetal"), new SkillMeta("archery", "궁술", "Archery", "combat", "#c084fc", "#9333ea", "Crosshair"), new SkillMeta("taming", "조련", "Taming", "combat", "#e879f9", "#c026d3", "PawPrint"), new SkillMeta("crossbows", "석궁", "Crossbows", "combat", "#a78bfa", "#7c3aed", "Target"), new SkillMeta("tridents", "삼지창", "Tridents", "combat", "#2dd4bf", "#0d9488", "Anchor"), new SkillMeta("maces", "철퇴", "Maces", "combat", "#fb7185", "#e11d48", "Hammer"), new SkillMeta("spears", "창술", "Spears", "combat", "#f97316", "#ea580c", "Compass"),

            // Misc (기타/보조)
            new SkillMeta("repair", "수리", "Repair", "misc", "#94a3b8", "#475569", "Wrench"), new SkillMeta("acrobatics", "곡예", "Acrobatics", "misc", "#34d399", "#059669", "Feather"), new SkillMeta("alchemy", "연금술", "Alchemy", "misc", "#818cf8", "#4f46e5", "FlaskConical"));
}
