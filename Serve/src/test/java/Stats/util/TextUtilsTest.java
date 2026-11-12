package stats.util;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class TextUtilsTest {

    @Test
    void testStripMinecraftCodes() {
        assertNull(TextUtils.stripMinecraftCodes(null));
        assertNull(TextUtils.stripMinecraftCodes(""));
        assertNull(TextUtils.stripMinecraftCodes("   "));
        assertNull(TextUtils.stripMinecraftCodes("&a&l"));

        assertEquals("Player1", TextUtils.stripMinecraftCodes("&ePlayer1&r"));
        assertEquals("Gold", TextUtils.stripMinecraftCodes("§6Gold§r"));
        assertEquals("CustomRank", TextUtils.stripMinecraftCodes("{#ff00ff}CustomRank{#000000}"));
    }

    @Test
    void testStripNamespace() {
        assertEquals("", TextUtils.stripNamespace(null));
        assertEquals("stone", TextUtils.stripNamespace("minecraft:stone"));
        assertEquals("custom_mod:item", TextUtils.stripNamespace("custom_mod:item"));
    }

    @Test
    void testFormatCmiDate() {
        assertEquals("누적/기타", TextUtils.formatCmiDate(0));
        assertEquals("누적/기타", TextUtils.formatCmiDate(-1));
        assertEquals("2024-10-26", TextUtils.formatCmiDate(241026));
        assertEquals("2026-01-05", TextUtils.formatCmiDate(260105));
    }

    @Test
    void testParseCorner() {
        assertNull(TextUtils.parseCorner(null));
        assertNull(TextUtils.parseCorner("invalid"));

        TextUtils.Corner corner = TextUtils.parseCorner("world;100;64;-200;extra");
        assertNotNull(corner);
        assertEquals("world", corner.world());
        assertEquals(100, corner.x());
        assertEquals(64, corner.y());
        assertEquals(-200, corner.z());
    }

    @Test
    void testParseListField() {
        Map<String, String> uuidMap = Map.of("abc-123", "UserOne", "def-456", "UserTwo");

        var list = TextUtils.parseListField("[abc-123; public, def-456]", uuidMap);
        assertEquals(3, list.size());
        assertEquals("UserOne", list.get(0));
        assertEquals("전체 공개", list.get(1));
        assertEquals("UserTwo", list.get(2));
    }
}
