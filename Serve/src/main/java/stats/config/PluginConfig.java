package stats.config;

import org.bukkit.configuration.file.FileConfiguration;

public record PluginConfig(String httpHost, int httpPort, boolean requireApiKey, String apiSecretKey,
                           boolean requireRsaSignature, long allowedClockSkewSeconds, String rsaPublicKeyPath,
                           String rsaPrivateKeyPath, String dbHost, int dbPort, String dbUser, String dbPassword,
                           String dbNameWc, String dbNameGl, int dbMaxPoolSize, int dbMinIdle,
                           long dbConnectionTimeoutMs, int cacheTtlSeconds, String customWorldDir) {
    public static PluginConfig fromConfig(FileConfiguration config) {
        String httpHost = config.getString("http.host", "127.0.0.1");
        int httpPort = config.getInt("http.port", 4000);
        boolean requireApiKey = config.getBoolean("http.require-api-key", false);
        String apiSecretKey = config.getString("http.api-secret-key", "").trim();

        // RSA Security
        boolean requireRsaSignature = config.getBoolean("security.require-rsa-signature", true);
        long allowedClockSkewSeconds = config.getLong("security.allowed-clock-skew-seconds", 300L);
        String rsaPublicKeyPath = config.getString("security.public-key-path", "keys/public_key.pem");
        String rsaPrivateKeyPath = config.getString("security.private-key-path", "keys/private_key.pem");

        String dbHost = config.getString("database.host", "127.0.0.1");
        int dbPort = config.getInt("database.port", 3306);
        String dbUser = config.getString("database.user", "46770d6");
        String dbPassword = config.getString("database.password", "7f04916");
        String dbNameWc = config.getString("database.database-wc", "msdwc");
        String dbNameGl = config.getString("database.database-gl", "msdgl");
        int dbMaxPoolSize = config.getInt("database.maximum-pool-size", 10);
        int dbMinIdle = config.getInt("database.minimum-idle", 2);
        long dbConnectionTimeoutMs = config.getLong("database.connection-timeout-ms", 5000L);

        int cacheTtlSeconds = config.getInt("cache.ttl-seconds", 10);
        String customWorldDir = config.getString("world-dir", "").trim();

        return new PluginConfig(httpHost, httpPort, requireApiKey, apiSecretKey, requireRsaSignature, allowedClockSkewSeconds, rsaPublicKeyPath, rsaPrivateKeyPath, dbHost, dbPort, dbUser, dbPassword, dbNameWc, dbNameGl, dbMaxPoolSize, dbMinIdle, dbConnectionTimeoutMs, cacheTtlSeconds, customWorldDir);
    }
}
