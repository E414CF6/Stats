package stats.security;

import stats.config.PluginConfig;
import com.sun.net.httpserver.HttpExchange;

import java.io.File;
import java.nio.file.Files;
import java.security.KeyPair;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.util.logging.Level;
import java.util.logging.Logger;

public class RsaAuthManager {

    private final Logger logger;
    private final File dataFolder;

    private volatile PublicKey publicKey;
    private volatile boolean requireRsaSignature;
    private volatile long maxClockSkewMs;

    public record VerificationResult(boolean success, String message) {
        public static VerificationResult ok() {
            return new VerificationResult(true, "OK");
        }

        public static VerificationResult fail(String message) {
            return new VerificationResult(false, message);
        }
    }

    public RsaAuthManager(Logger logger, File dataFolder) {
        this.logger = logger;
        this.dataFolder = dataFolder;
    }

    public synchronized void initialize(PluginConfig config) {
        this.requireRsaSignature = config.requireRsaSignature();
        this.maxClockSkewMs = config.allowedClockSkewSeconds() * 1000L;

        File keysDir = new File(dataFolder, "keys");
        File pubKeyFile = resolveFile(config.rsaPublicKeyPath(), new File(keysDir, "public_key.pem"));
        File privKeyFile = resolveFile(config.rsaPrivateKeyPath(), new File(keysDir, "private_key.pem"));

        if (!pubKeyFile.exists() && !privKeyFile.exists()) {
            try {
                if (!keysDir.exists()) {
                    keysDir.mkdirs();
                }
                logger.info("[Security] No RSA keys found. Generating a new 2048-bit RSA key pair...");
                KeyPair kp = RsaKeyUtils.generateKeyPair(2048);
                Files.writeString(pubKeyFile.toPath(), RsaKeyUtils.exportPublicKeyPem(kp.getPublic()));
                Files.writeString(privKeyFile.toPath(), RsaKeyUtils.exportPrivateKeyPem(kp.getPrivate()));

                logger.info("[Security] RSA key pair generated successfully at: " + keysDir.getAbsolutePath());
                logger.info("[Security] Public key: " + pubKeyFile.getName() + " | Private key: " + privKeyFile.getName());
                logger.info("[Security] Copy the contents of private_key.pem to Viewer/.env.local (RSA_PRIVATE_KEY) to authenticate.");
            } catch (Exception e) {
                logger.log(Level.SEVERE, "[Security] Failed to auto-generate RSA key pair!", e);
            }
        }

        if (pubKeyFile.exists()) {
            try {
                this.publicKey = RsaKeyUtils.readPublicKeyFromFile(pubKeyFile);
                logger.info("[Security] RSA Public Key loaded successfully from " + pubKeyFile.getAbsolutePath());
            } catch (Exception e) {
                logger.log(Level.SEVERE, "[Security] Failed to parse RSA Public Key from " + pubKeyFile.getAbsolutePath(), e);
                this.publicKey = null;
            }
        } else {
            logger.warning("[Security] RSA Public Key file not found at " + pubKeyFile.getAbsolutePath() + "!");
        }
    }

    private File resolveFile(String configuredPath, File defaultFile) {
        if (configuredPath != null && !configuredPath.isBlank()) {
            File f = new File(configuredPath);
            return f.isAbsolute() ? f : new File(dataFolder, configuredPath);
        }
        return defaultFile;
    }

    public VerificationResult verify(HttpExchange exchange) {
        if (!requireRsaSignature) {
            return VerificationResult.ok();
        }

        String signature = exchange.getRequestHeaders().getFirst("x-api-signature");
        String timestampStr = exchange.getRequestHeaders().getFirst("x-api-timestamp");
        String method = exchange.getRequestMethod();
        String path = exchange.getRequestURI().getPath();

        return verify(method, path, signature, timestampStr);
    }

    public VerificationResult verify(String method, String path, String signature, String timestampStr) {
        if (!requireRsaSignature) {
            return VerificationResult.ok();
        }

        if (publicKey == null) {
            return VerificationResult.fail("Server RSA public key is not loaded or configured.");
        }

        if (signature == null || signature.isBlank()) {
            return VerificationResult.fail("Missing required header: 'x-api-signature'");
        }

        if (timestampStr == null || timestampStr.isBlank()) {
            return VerificationResult.fail("Missing required header: 'x-api-timestamp'");
        }

        long timestamp;
        try {
            timestamp = Long.parseLong(timestampStr.trim());
        } catch (NumberFormatException e) {
            return VerificationResult.fail("Invalid 'x-api-timestamp' format. Must be Unix timestamp in milliseconds.");
        }

        long now = System.currentTimeMillis();
        long skew = Math.abs(now - timestamp);
        if (skew > maxClockSkewMs) {
            return VerificationResult.fail(String.format("Request timestamp expired (clock skew: %d ms, max allowed: %d ms)", skew, maxClockSkewMs));
        }

        String normalizedMethod = method != null ? method.toUpperCase() : "GET";
        String normalizedPath = path != null && path.startsWith("/") ? path : ("/" + (path != null ? path : ""));
        String payloadToVerify = normalizedMethod + "\n" + normalizedPath + "\n" + timestamp;

        boolean valid = RsaKeyUtils.verify(publicKey, payloadToVerify, signature);
        if (!valid) {
            return VerificationResult.fail("Invalid RSA signature for request.");
        }

        return VerificationResult.ok();
    }

    public synchronized void generateNewKeys() throws Exception {
        File keysDir = new File(dataFolder, "keys");
        if (!keysDir.exists()) keysDir.mkdirs();
        File pubKeyFile = new File(keysDir, "public_key.pem");
        File privKeyFile = new File(keysDir, "private_key.pem");

        KeyPair kp = RsaKeyUtils.generateKeyPair(2048);
        Files.writeString(pubKeyFile.toPath(), RsaKeyUtils.exportPublicKeyPem(kp.getPublic()));
        Files.writeString(privKeyFile.toPath(), RsaKeyUtils.exportPrivateKeyPem(kp.getPrivate()));
        this.publicKey = kp.getPublic();
        logger.info("[Security] New RSA keypair generated and reloaded.");
    }

    public PublicKey getPublicKey() {
        return publicKey;
    }

    public boolean isRequireRsaSignature() {
        return requireRsaSignature;
    }
}
