package stats.database;

import stats.config.PluginConfig;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.logging.Level;
import java.util.logging.Logger;

public class DatabaseManager {

    private final Logger logger;
    private HikariDataSource dataSource;

    public DatabaseManager(Logger logger) {
        this.logger = logger;
    }

    public synchronized void initialize(PluginConfig config) {
        close();

        HikariConfig hikariConfig = new HikariConfig();
        String jdbcUrl = String.format("jdbc:mysql://%s:%d/?useSSL=false&allowPublicKeyRetrieval=true&characterEncoding=UTF-8&serverTimezone=UTC", config.dbHost(), config.dbPort());

        hikariConfig.setJdbcUrl(jdbcUrl);
        hikariConfig.setUsername(config.dbUser());
        hikariConfig.setPassword(config.dbPassword());
        hikariConfig.setDriverClassName("com.mysql.cj.jdbc.Driver");
        hikariConfig.setPoolName("Serve-HikariPool");
        hikariConfig.setMaximumPoolSize(config.dbMaxPoolSize());
        hikariConfig.setMinimumIdle(config.dbMinIdle());
        hikariConfig.setConnectionTimeout(config.dbConnectionTimeoutMs());
        hikariConfig.setIdleTimeout(600000L);
        hikariConfig.setMaxLifetime(1800000L);

        // Standard MySQL optimizations
        hikariConfig.addDataSourceProperty("cachePrepStmts", "true");
        hikariConfig.addDataSourceProperty("prepStmtCacheSize", "250");
        hikariConfig.addDataSourceProperty("prepStmtCacheSqlLimit", "2048");
        hikariConfig.addDataSourceProperty("useServerPrepStmts", "true");

        try {
            this.dataSource = new HikariDataSource(hikariConfig);
            try (Connection conn = dataSource.getConnection()) {
                logger.info("[Database] MariaDB/MySQL connection pool successfully initialized!");
            }
        } catch (SQLException e) {
            logger.log(Level.SEVERE, "[Database] Failed to connect to database at " + jdbcUrl, e);
        }
    }

    public Connection getConnection() throws SQLException {
        if (dataSource == null || dataSource.isClosed()) {
            throw new SQLException("Database connection pool is not initialized or has been closed.");
        }
        return dataSource.getConnection();
    }

    public synchronized void close() {
        if (dataSource != null && !dataSource.isClosed()) {
            try {
                dataSource.close();
                logger.info("[Database] Hikari connection pool closed.");
            } catch (Exception e) {
                logger.log(Level.WARNING, "[Database] Error closing connection pool", e);
            } finally {
                dataSource = null;
            }
        }
    }

    public boolean isConnected() {
        return dataSource != null && !dataSource.isClosed();
    }
}
