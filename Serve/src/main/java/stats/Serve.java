package stats;

import stats.command.StatsCommand;
import stats.config.PluginConfig;
import stats.database.DatabaseManager;
import stats.http.HttpServerManager;
import stats.service.StatsQueryService;
import stats.security.RsaAuthManager;
import org.bukkit.command.PluginCommand;
import org.bukkit.plugin.java.JavaPlugin;

import java.io.IOException;
import java.util.logging.Level;

public final class Serve extends JavaPlugin {

    private PluginConfig pluginConfig;
    private DatabaseManager databaseManager;
    private StatsQueryService queryService;
    private RsaAuthManager rsaAuthManager;
    private HttpServerManager httpServerManager;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        this.pluginConfig = PluginConfig.fromConfig(getConfig());

        // 1. Initialize Database
        this.databaseManager = new DatabaseManager(getLogger());
        this.databaseManager.initialize(pluginConfig);

        // 2. Initialize Query Service
        this.queryService = new StatsQueryService(getLogger(), databaseManager, pluginConfig);

        // 3. Initialize RSA Security
        this.rsaAuthManager = new RsaAuthManager(getLogger(), getDataFolder());
        this.rsaAuthManager.initialize(pluginConfig);

        // 4. Initialize & Start HTTP Server
        this.httpServerManager = new HttpServerManager(getLogger(), queryService, rsaAuthManager, pluginConfig);
        try {
            this.httpServerManager.start(pluginConfig);
        } catch (IOException e) {
            getLogger().log(Level.SEVERE, "[Serve] Could not start HTTP server on port " + pluginConfig.httpPort(), e);
        }

        // 4. Register Commands
        StatsCommand commandHandler = new StatsCommand(this);
        registerCommand("serve", commandHandler);

        getLogger().info(String.format("[Serve] API Server running at http://%s:%d", pluginConfig.httpHost(), pluginConfig.httpPort()));
    }

    @Override
    public void onDisable() {
        if (httpServerManager != null) {
            httpServerManager.stop();
        }
        if (databaseManager != null) {
            databaseManager.close();
        }
        if (queryService != null) {
            queryService.invalidateCache();
        }
        getLogger().info("[Serve] Plugin disabled.");
    }

    public synchronized void reloadPluginConfig() throws Exception {
        reloadConfig();
        this.pluginConfig = PluginConfig.fromConfig(getConfig());

        // Update database pool
        if (databaseManager != null) {
            databaseManager.initialize(pluginConfig);
        }

        // Update query service config
        if (queryService != null) {
            queryService.updateConfig(pluginConfig);
        }

        // Update RSA Security config
        if (rsaAuthManager != null) {
            rsaAuthManager.initialize(pluginConfig);
        }

        // Restart HTTP Server
        if (httpServerManager != null) {
            httpServerManager.start(pluginConfig);
        }

        getLogger().info("[Serve] Plugin configuration and services reloaded.");
    }

    private void registerCommand(String name, StatsCommand handler) {
        PluginCommand cmd = getCommand(name);
        if (cmd != null) {
            cmd.setExecutor(handler);
            cmd.setTabCompleter(handler);
        }
    }

    public PluginConfig getPluginConfig() {
        return pluginConfig;
    }

    public DatabaseManager getDatabaseManager() {
        return databaseManager;
    }

    public StatsQueryService getQueryService() {
        return queryService;
    }

    public RsaAuthManager getRsaAuthManager() {
        return rsaAuthManager;
    }

    public HttpServerManager getHttpServerManager() {
        return httpServerManager;
    }
}
