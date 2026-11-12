package stats.security;

import stats.config.PluginConfig;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.File;
import java.nio.file.Path;
import java.security.KeyPair;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.util.logging.Logger;

import static org.junit.jupiter.api.Assertions.*;

class RsaSecurityTest {

    @Test
    void testKeyPairGenerationAndPemParsing() throws Exception {
        KeyPair kp = RsaKeyUtils.generateKeyPair(2048);
        assertNotNull(kp.getPublic());
        assertNotNull(kp.getPrivate());

        String pubPem = RsaKeyUtils.exportPublicKeyPem(kp.getPublic());
        String privPem = RsaKeyUtils.exportPrivateKeyPem(kp.getPrivate());

        assertTrue(pubPem.startsWith("-----BEGIN PUBLIC KEY-----"));
        assertTrue(pubPem.contains("-----END PUBLIC KEY-----"));
        assertTrue(privPem.startsWith("-----BEGIN PRIVATE KEY-----"));
        assertTrue(privPem.contains("-----END PRIVATE KEY-----"));

        PublicKey parsedPub = RsaKeyUtils.parsePublicKey(pubPem);
        PrivateKey parsedPriv = RsaKeyUtils.parsePrivateKey(privPem);

        assertNotNull(parsedPub);
        assertNotNull(parsedPriv);

        String payload = "GET\n/api/stats\n" + System.currentTimeMillis();
        String signature = RsaKeyUtils.sign(parsedPriv, payload);
        assertNotNull(signature);
        assertFalse(signature.isBlank());

        boolean valid = RsaKeyUtils.verify(parsedPub, payload, signature);
        assertTrue(valid, "Signature should be valid");

        // Tampered payload should fail
        boolean invalid = RsaKeyUtils.verify(parsedPub, payload + "tampered", signature);
        assertFalse(invalid, "Tampered payload should fail verification");
    }

    @Test
    void testRsaAuthManagerVerification(@TempDir Path tempDir) throws Exception {
        Logger logger = Logger.getLogger("TestLogger");
        File dataFolder = tempDir.toFile();

        // Generate keys via RsaAuthManager
        PluginConfig config = new PluginConfig(
                "127.0.0.1", 4000, false, "",
                true, 300L, "keys/public_key.pem", "keys/private_key.pem",
                "127.0.0.1", 3306, "user", "pass", "wc", "gl",
                10, 2, 5000L, 10, ""
        );

        RsaAuthManager authManager = new RsaAuthManager(logger, dataFolder);
        authManager.initialize(config);

        assertNotNull(authManager.getPublicKey(), "Public key should be initialized");

        File privKeyFile = new File(dataFolder, "keys/private_key.pem");
        assertTrue(privKeyFile.exists(), "Private key should have been auto-generated");
        PrivateKey privKey = RsaKeyUtils.readPrivateKeyFromFile(privKeyFile);

        // 1. Valid request
        long now = System.currentTimeMillis();
        String method = "GET";
        String path = "/api/stats";
        String payload = method + "\n" + path + "\n" + now;
        String signature = RsaKeyUtils.sign(privKey, payload);

        var result = authManager.verify(method, path, signature, String.valueOf(now));
        assertTrue(result.success(), "Verification should succeed for valid signature: " + result.message());

        // 2. Missing signature header
        var missingSigResult = authManager.verify(method, path, null, String.valueOf(now));
        assertFalse(missingSigResult.success());
        assertTrue(missingSigResult.message().contains("x-api-signature"));

        // 3. Expired timestamp (replay attack)
        long oldTime = now - 600_000L; // 10 minutes ago
        String oldPayload = method + "\n" + path + "\n" + oldTime;
        String oldSig = RsaKeyUtils.sign(privKey, oldPayload);
        var expiredResult = authManager.verify(method, path, oldSig, String.valueOf(oldTime));
        assertFalse(expiredResult.success());
        assertTrue(expiredResult.message().contains("expired"));

        // 4. Invalid signature
        var invalidResult = authManager.verify(method, path, "invalid-base64-signature", String.valueOf(now));
        assertFalse(invalidResult.success());
    }
}
