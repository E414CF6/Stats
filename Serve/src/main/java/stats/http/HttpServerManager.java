package stats.http;

import stats.config.PluginConfig;
import stats.model.PlayerDetailResponse;
import stats.model.PlayerSummary;
import stats.model.StatsApiResponse;
import stats.service.StatsQueryService;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.logging.Level;
import java.util.logging.Logger;

import stats.security.RsaAuthManager;

public class HttpServerManager {

    private final Logger logger;
    private final StatsQueryService queryService;
    private final RsaAuthManager rsaAuthManager;
    private final Gson gson;

    private HttpServer server;
    private ExecutorService executorService;
    private volatile PluginConfig config;

    public HttpServerManager(Logger logger, StatsQueryService queryService, RsaAuthManager rsaAuthManager, PluginConfig config) {
        this.logger = logger;
        this.queryService = queryService;
        this.rsaAuthManager = rsaAuthManager;
        this.config = config;
        this.gson = new GsonBuilder().serializeNulls().create();
    }

    public synchronized void start(PluginConfig newConfig) throws IOException {
        stop();
        this.config = newConfig;

        InetSocketAddress address = new InetSocketAddress(config.httpHost(), config.httpPort());
        this.server = HttpServer.create(address, 0);

        this.executorService = Executors.newFixedThreadPool(8, runnable -> {
            Thread thread = new Thread(runnable, "Serve-Worker");
            thread.setDaemon(true);
            return thread;
        });
        server.setExecutor(executorService);

        // Register handlers
        server.createContext("/health", new HealthHandler());
        server.createContext("/api/stats", new StatsHandler());
        server.createContext("/api/players", new PlayerHandler());
        server.createContext("/", new FallbackHandler());

        server.start();
        logger.info(String.format("[HttpServer] Listening on http://%s:%d (API Key: %s | RSA Signatures: %s)", config.httpHost(), config.httpPort(), config.requireApiKey() && !config.apiSecretKey().isEmpty() ? "ENABLED" : "DISABLED", config.requireRsaSignature() ? "REQUIRED" : "DISABLED"));
    }

    public synchronized void stop() {
        if (server != null) {
            try {
                server.stop(1);
                logger.info("[HttpServer] HTTP server stopped.");
            } catch (Exception e) {
                logger.log(Level.WARNING, "[HttpServer] Error stopping server", e);
            } finally {
                server = null;
            }
        }

        if (executorService != null && !executorService.isShutdown()) {
            try {
                executorService.shutdown();
                if (!executorService.awaitTermination(3, TimeUnit.SECONDS)) {
                    executorService.shutdownNow();
                }
            } catch (InterruptedException e) {
                executorService.shutdownNow();
                Thread.currentThread().interrupt();
            } finally {
                executorService = null;
            }
        }
    }

    private void addCorsHeaders(HttpExchange exchange) {
        Headers headers = exchange.getResponseHeaders();
        headers.set("Access-Control-Allow-Origin", "*");
        headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
        headers.set("Access-Control-Allow-Headers", "Content-Type, x-api-key, x-api-signature, x-api-timestamp");
    }

    private boolean checkApiKey(HttpExchange exchange) throws IOException {
        // 1. RSA-SHA256 Signature verification
        if (rsaAuthManager != null) {
            RsaAuthManager.VerificationResult rsaResult = rsaAuthManager.verify(exchange);
            if (!rsaResult.success()) {
                sendJson(exchange, 401, Map.of("error", "Unauthorized: RSA signature verification failed", "reason", rsaResult.message()));
                return false;
            }
        }

        // 2. Legacy API Key check (optional fallback)
        if (config.requireApiKey() && !config.apiSecretKey().isEmpty()) {
            String apiKey = exchange.getRequestHeaders().getFirst("x-api-key");
            if (apiKey == null || !apiKey.equals(config.apiSecretKey())) {
                sendJson(exchange, 401, Map.of("error", "Unauthorized: Invalid x-api-key"));
                return false;
            }
        }
        return true;
    }

    private void sendJson(HttpExchange exchange, int statusCode, Object data) throws IOException {
        addCorsHeaders(exchange);
        Headers headers = exchange.getResponseHeaders();
        headers.set("Content-Type", "application/json; charset=utf-8");

        byte[] bytes = gson.toJson(data).getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private void handleOptions(HttpExchange exchange) throws IOException {
        addCorsHeaders(exchange);
        exchange.sendResponseHeaders(204, -1);
        exchange.close();
    }

    private class HealthHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                handleOptions(exchange);
                return;
            }

            if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendJson(exchange, 405, Map.of("error", "Method Not Allowed"));
                return;
            }

            sendJson(exchange, 200, Map.of("status", "ok", "timestamp", Instant.now().toString()));
        }
    }

    private class StatsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                handleOptions(exchange);
                return;
            }

            if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendJson(exchange, 405, Map.of("error", "Method Not Allowed"));
                return;
            }

            if (!checkApiKey(exchange)) {
                return;
            }

            try {
                URI uri = exchange.getRequestURI();
                String query = uri.getQuery();
                String searchQuery = null;
                if (query != null) {
                    for (String pair : query.split("&")) {
                        String[] kv = pair.split("=", 2);
                        if (kv.length == 2 && "q".equalsIgnoreCase(kv[0])) {
                            searchQuery = URLDecoder.decode(kv[1], StandardCharsets.UTF_8);
                            break;
                        }
                    }
                }

                StatsApiResponse response = queryService.getStats(searchQuery);
                sendJson(exchange, 200, response);
            } catch (Exception e) {
                logger.log(Level.SEVERE, "[HttpServer] Error processing /api/stats", e);
                sendJson(exchange, 500, Map.of("error", "데이터베이스 조회 중 오류가 발생했습니다.", "details", e.getMessage() != null ? e.getMessage() : e.toString()));
            }
        }
    }

    private class PlayerHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                handleOptions(exchange);
                return;
            }

            if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendJson(exchange, 405, Map.of("error", "Method Not Allowed"));
                return;
            }

            if (!checkApiKey(exchange)) {
                return;
            }

            try {
                String path = exchange.getRequestURI().getPath();
                // Expecting /api/players/{id}
                String prefix = "/api/players/";
                if (!path.startsWith(prefix) || path.length() <= prefix.length()) {
                    sendJson(exchange, 404, Map.of("error", "Not Found"));
                    return;
                }

                String rawId = path.substring(prefix.length());
                String id = URLDecoder.decode(rawId, StandardCharsets.UTF_8).trim();

                PlayerSummary player = queryService.getPlayer(id);
                if (player == null) {
                    sendJson(exchange, 404, Map.of("error", "해당 플레이어를 찾을 수 없습니다."));
                    return;
                }

                PlayerDetailResponse response = new PlayerDetailResponse(player, Instant.now().toString(), "local-mariadb");
                sendJson(exchange, 200, response);
            } catch (Exception e) {
                logger.log(Level.SEVERE, "[HttpServer] Error processing /api/players", e);
                sendJson(exchange, 500, Map.of("error", "데이터베이스 조회 중 오류가 발생했습니다.", "details", e.getMessage() != null ? e.getMessage() : e.toString()));
            }
        }
    }

    private class FallbackHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                handleOptions(exchange);
                return;
            }

            sendJson(exchange, 404, Map.of("error", "Not Found"));
        }
    }
}
