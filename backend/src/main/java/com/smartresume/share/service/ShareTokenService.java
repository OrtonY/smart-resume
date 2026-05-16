package com.smartresume.share.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartresume.common.exception.AppException;
import com.smartresume.common.security.AuthTokenProperties;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class ShareTokenService {

    private static final String HMAC_SHA_256 = "HmacSHA256";
    private static final long TOKEN_VALIDITY_SECONDS = 24 * 60 * 60; // 24 hours

    private final ObjectMapper objectMapper;
    private final AuthTokenProperties properties;

    public ShareTokenService(ObjectMapper objectMapper, AuthTokenProperties properties) {
        this.objectMapper = objectMapper;
        this.properties = properties;
    }

    public String createShareToken(String shareCode) {
        Instant now = Instant.now();
        ShareTokenPayload payload = new ShareTokenPayload(
            shareCode,
            now.getEpochSecond(),
            now.plusSeconds(TOKEN_VALIDITY_SECONDS).getEpochSecond()
        );
        String encodedPayload = encodePayload(payload);
        return encodedPayload + "." + sign(encodedPayload);
    }

    public ShareTokenPayload verifyShareToken(String token, String expectedShareCode) {
        if (token == null || token.isBlank()) {
            throw new AppException(HttpStatus.FORBIDDEN, "Password required");
        }

        String[] segments = token.split("\\.");
        if (segments.length != 2) {
            throw new AppException(HttpStatus.FORBIDDEN, "Invalid share token");
        }

        String payloadSegment = segments[0];
        String expectedSignature = sign(payloadSegment);
        if (!expectedSignature.equals(segments[1])) {
            throw new AppException(HttpStatus.FORBIDDEN, "Invalid share token");
        }

        try {
            String json = new String(Base64.getUrlDecoder().decode(payloadSegment), StandardCharsets.UTF_8);
            ShareTokenPayload payload = objectMapper.readValue(json, ShareTokenPayload.class);

            if (payload.expiresAt() < Instant.now().getEpochSecond()) {
                throw new AppException(HttpStatus.FORBIDDEN, "Share token has expired, please re-enter password");
            }

            if (!expectedShareCode.equals(payload.shareCode())) {
                throw new AppException(HttpStatus.FORBIDDEN, "Invalid share token");
            }

            return payload;
        } catch (JsonProcessingException | IllegalArgumentException exception) {
            throw new AppException(HttpStatus.FORBIDDEN, "Invalid share token");
        }
    }

    private String encodePayload(ShareTokenPayload payload) {
        try {
            String json = objectMapper.writeValueAsString(payload);
            return Base64.getUrlEncoder().withoutPadding().encodeToString(json.getBytes(StandardCharsets.UTF_8));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to serialize share token payload", exception);
        }
    }

    private String sign(String payload) {
        try {
            String secret = "share:" + properties.tokenSecret();
            Mac mac = Mac.getInstance(HMAC_SHA_256);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_SHA_256));
            byte[] signature = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(signature);
        } catch (NoSuchAlgorithmException | InvalidKeyException exception) {
            throw new IllegalStateException("Unable to sign share token", exception);
        }
    }

    public record ShareTokenPayload(String shareCode, long issuedAt, long expiresAt) {
    }
}
