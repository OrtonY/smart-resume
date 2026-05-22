package com.smartresume.common.security;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartresume.common.exception.AppException;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class AuthTokenService {

    private static final String HMAC_SHA_256 = "HmacSHA256";

    private final ObjectMapper objectMapper;
    private final AuthTokenProperties properties;

    public AuthTokenService(ObjectMapper objectMapper, AuthTokenProperties properties) {
        this.objectMapper = objectMapper;
        this.properties = properties;
    }

    public String createToken(long userId, long credentialVersion) {
        Instant now = Instant.now();
        TokenPayload payload = new TokenPayload(
            now.getEpochSecond(),
            now.plusSeconds(properties.tokenValidityDays() * 24 * 60 * 60).getEpochSecond(),
            userId,
            credentialVersion,
            UUID.randomUUID().toString()
        );
        String encodedPayload = encodePayload(payload);
        return encodedPayload + "." + sign(encodedPayload);
    }

    public TokenPayload verifyToken(String token) {
        if (token == null || token.isBlank()) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "Missing access token");
        }

        String[] segments = token.split("\\.");
        if (segments.length != 2) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "Invalid access token");
        }

        String payload = segments[0];
        String expectedSignature = sign(payload);
        if (!expectedSignature.equals(segments[1])) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "Invalid access token signature");
        }

        try {
            String json = new String(Base64.getUrlDecoder().decode(payload), StandardCharsets.UTF_8);
            TokenPayload tokenPayload = objectMapper.readValue(json, TokenPayload.class);
            if (tokenPayload.expiresAtEpochSecond() < Instant.now().getEpochSecond()) {
                throw new AppException(HttpStatus.UNAUTHORIZED, "Access token has expired");
            }
            return tokenPayload;
        } catch (JsonProcessingException | IllegalArgumentException exception) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "Unable to decode access token");
        }
    }

    private String encodePayload(TokenPayload payload) {
        try {
            String json = objectMapper.writeValueAsString(payload);
            return Base64.getUrlEncoder().withoutPadding().encodeToString(json.getBytes(StandardCharsets.UTF_8));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to serialize access token payload", exception);
        }
    }

    private String sign(String payload) {
        try {
            Mac mac = Mac.getInstance(HMAC_SHA_256);
            mac.init(new SecretKeySpec(properties.tokenSecret().getBytes(StandardCharsets.UTF_8), HMAC_SHA_256));
            byte[] signature = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(signature);
        } catch (NoSuchAlgorithmException | InvalidKeyException exception) {
            throw new IllegalStateException("Unable to sign access token", exception);
        }
    }

    public record TokenPayload(
        long issuedAtEpochSecond,
        long expiresAtEpochSecond,
        long userId,
        long credentialVersion,
        String nonce
    ) {
    }
}
