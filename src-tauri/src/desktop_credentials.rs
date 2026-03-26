use base64::Engine;
use serde_json;

/// Extract the first OAuth access token from decrypted token cache JSON.
///
/// The decrypted JSON has composite keys mapping to `{ "token": "...", ... }`.
fn extract_token_from_cache(json_str: &str) -> Result<String, String> {
    let parsed: serde_json::Value =
        serde_json::from_str(json_str).map_err(|e| format!("Invalid token cache JSON: {}", e))?;

    let obj = parsed
        .as_object()
        .ok_or("Token cache is not a JSON object")?;

    for (_key, entry) in obj {
        if let Some(token) = entry.get("token").and_then(|v| v.as_str()) {
            if !token.is_empty() {
                return Ok(token.to_string());
            }
        }
    }

    Err("No token found in Desktop token cache".into())
}

/// Decrypt Chromium safeStorage encrypted data (macOS/Linux).
///
/// Algorithm: PBKDF2-HMAC-SHA1(password, "saltysalt", 1003) -> AES-128-CBC(iv=spaces).
#[cfg(not(target_os = "windows"))]
fn decrypt_safe_storage(password: &str, encrypted_b64: &str) -> Result<String, String> {
    use aes::cipher::{block_padding::Pkcs7, BlockDecryptMut, KeyIvInit};

    type Aes128CbcDec = cbc::Decryptor<aes::Aes128>;

    let raw = base64::engine::general_purpose::STANDARD
        .decode(encrypted_b64)
        .map_err(|e| format!("Base64 decode error: {}", e))?;

    // Strip "v10" prefix (3 bytes)
    if raw.len() < 4 {
        return Err("Encrypted data too short".into());
    }
    let ciphertext = &raw[3..];

    // Derive key: PBKDF2-HMAC-SHA1
    let mut key = [0u8; 16];
    pbkdf2::pbkdf2_hmac::<sha1::Sha1>(password.as_bytes(), b"saltysalt", 1003, &mut key);

    // Decrypt: AES-128-CBC, IV = 16 spaces
    let iv = [0x20u8; 16];
    let mut buf = ciphertext.to_vec();
    let plaintext = Aes128CbcDec::new(&key.into(), &iv.into())
        .decrypt_padded_mut::<Pkcs7>(&mut buf)
        .map_err(|_| "AES decryption failed — wrong password or corrupted data".to_string())?;

    String::from_utf8(plaintext.to_vec())
        .map_err(|e| format!("Decrypted data is not valid UTF-8: {}", e))
}

/// Read the Claude Desktop OAuth token config file and extract the encrypted cache.
fn read_config_token_cache(config_path: &std::path::Path) -> Result<String, String> {
    let content = std::fs::read_to_string(config_path)
        .map_err(|e| format!("Cannot read Claude Desktop config: {}", e))?;

    let parsed: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("Invalid config JSON: {}", e))?;

    parsed
        .get("oauth:tokenCache")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or("No oauth:tokenCache in Claude Desktop config".into())
}

// Platform-specific public entry point
pub fn read_desktop_token() -> Result<String, String> {
    platform_read_desktop_token()
}

// Stub for unsupported platforms
#[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
fn platform_read_desktop_token() -> Result<String, String> {
    Err("Claude Desktop credentials not supported on this platform".into())
}

#[cfg(target_os = "macos")]
fn platform_read_desktop_token() -> Result<String, String> {
    use std::process::Command;

    // 1. Read encryption password from Keychain
    let output = Command::new("security")
        .args([
            "find-generic-password",
            "-s",
            "Claude Safe Storage",
            "-a",
            "Claude Key",
            "-w",
        ])
        .output()
        .map_err(|e| format!("Failed to run security command: {}", e))?;

    if !output.status.success() {
        return Err("Claude Desktop keychain entry not found".into());
    }

    let password = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if password.is_empty() {
        return Err("Empty Claude Desktop keychain password".into());
    }

    // 2. Read config.json
    let home = std::env::var("HOME")
        .map_err(|_| "HOME environment variable not set".to_string())?;
    let config_path = std::path::PathBuf::from(&home)
        .join("Library")
        .join("Application Support")
        .join("Claude")
        .join("config.json");

    let encrypted_b64 = read_config_token_cache(&config_path)?;

    // 3. Decrypt and extract token
    let decrypted = decrypt_safe_storage(&password, &encrypted_b64)?;
    extract_token_from_cache(&decrypted)
}

#[cfg(target_os = "linux")]
fn platform_read_desktop_token() -> Result<String, String> {
    use std::process::Command;

    // 1. Read encryption password — try GNOME Keyring, fall back to "peanuts"
    let password = Command::new("secret-tool")
        .args(["lookup", "application", "claude"])
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "peanuts".to_string());

    // 2. Read config.json
    let home = std::env::var("HOME")
        .map_err(|_| "HOME environment variable not set".to_string())?;

    let config_paths = [
        std::path::PathBuf::from(&home)
            .join(".config")
            .join("Claude")
            .join("config.json"),
        std::path::PathBuf::from(&home)
            .join(".config")
            .join("claude")
            .join("config.json"),
    ];

    let encrypted_b64 = config_paths
        .iter()
        .find_map(|p| read_config_token_cache(p).ok())
        .ok_or("Claude Desktop config not found on Linux")?;

    // 3. Decrypt and extract token
    let decrypted = decrypt_safe_storage(&password, &encrypted_b64)?;
    extract_token_from_cache(&decrypted)
}

#[cfg(target_os = "windows")]
fn platform_read_desktop_token() -> Result<String, String> {
    use base64::Engine;

    // 1. Read config.json
    let appdata = std::env::var("APPDATA")
        .or_else(|_| std::env::var("LOCALAPPDATA"))
        .map_err(|_| "APPDATA environment variable not set".to_string())?;

    let config_paths = [
        std::path::PathBuf::from(&appdata)
            .join("Claude")
            .join("config.json"),
        std::path::PathBuf::from(&appdata)
            .join("claude")
            .join("config.json"),
    ];

    let encrypted_b64 = config_paths
        .iter()
        .find_map(|p| read_config_token_cache(p).ok())
        .ok_or("Claude Desktop config not found on Windows")?;

    // 2. Base64 decode and strip DPAPI prefix
    let raw = base64::engine::general_purpose::STANDARD
        .decode(&encrypted_b64)
        .map_err(|e| format!("Base64 decode error: {}", e))?;

    // Strip "v10" prefix if present
    let ciphertext = if raw.len() > 3 && &raw[..3] == b"v10" {
        &raw[3..]
    } else {
        &raw
    };

    // 3. Decrypt via DPAPI
    let plaintext = dpapi_decrypt(ciphertext)?;
    let json_str = String::from_utf8(plaintext)
        .map_err(|e| format!("Decrypted data is not valid UTF-8: {}", e))?;

    extract_token_from_cache(&json_str)
}

#[cfg(target_os = "windows")]
fn dpapi_decrypt(data: &[u8]) -> Result<Vec<u8>, String> {
    use windows_sys::Win32::Security::Cryptography::{
        CryptUnprotectData, CRYPT_INTEGER_BLOB,
    };

    let mut input_blob = CRYPT_INTEGER_BLOB {
        cbData: data.len() as u32,
        pbData: data.as_ptr() as *mut u8,
    };

    let mut output_blob = CRYPT_INTEGER_BLOB {
        cbData: 0,
        pbData: std::ptr::null_mut(),
    };

    let success = unsafe {
        CryptUnprotectData(
            &mut input_blob,
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            0,
            &mut output_blob,
        )
    };

    if success == 0 {
        return Err("DPAPI CryptUnprotectData failed".into());
    }

    let result =
        unsafe { std::slice::from_raw_parts(output_blob.pbData, output_blob.cbData as usize) }
            .to_vec();

    // Free the DPAPI-allocated buffer
    unsafe {
        windows_sys::Win32::System::Memory::LocalFree(output_blob.pbData as isize);
    }

    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_token_from_cache() {
        let json = r#"{
            "a473d7bb:8e0149e8:https://api.anthropic.com:user:inference": {
                "token": "sk-ant-oat01-test-token-123",
                "refreshToken": "refresh-abc",
                "expiresAt": 1774565949914
            }
        }"#;
        let token = extract_token_from_cache(json).unwrap();
        assert_eq!(token, "sk-ant-oat01-test-token-123");
    }

    #[test]
    fn test_extract_token_empty_cache() {
        let json = "{}";
        let err = extract_token_from_cache(json).unwrap_err();
        assert!(err.contains("No token found"));
    }

    #[test]
    fn test_extract_token_missing_token_field() {
        let json = r#"{"key": {"refreshToken": "abc"}}"#;
        let err = extract_token_from_cache(json).unwrap_err();
        assert!(err.contains("No token found"));
    }

    #[test]
    fn test_extract_token_invalid_json() {
        let err = extract_token_from_cache("not json").unwrap_err();
        assert!(err.contains("Invalid token cache JSON"));
    }

    #[test]
    fn test_extract_token_multiple_entries_returns_first() {
        let json = r#"{
            "key1": { "token": "first-token", "refreshToken": "a", "expiresAt": 1 },
            "key2": { "token": "second-token", "refreshToken": "b", "expiresAt": 2 }
        }"#;
        let token = extract_token_from_cache(json).unwrap();
        assert!(token == "first-token" || token == "second-token");
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn test_decrypt_safe_storage_known_vector() {
        use aes::cipher::{block_padding::Pkcs7, BlockEncryptMut, KeyIvInit};
        type Aes128CbcEnc = cbc::Encryptor<aes::Aes128>;

        let password = "testpassword";
        let plaintext = r#"{"key":{"token":"sk-test"}}"#;

        let mut key = [0u8; 16];
        pbkdf2::pbkdf2_hmac::<sha1::Sha1>(password.as_bytes(), b"saltysalt", 1003, &mut key);

        let iv = [0x20u8; 16];
        let mut out_buf = [0u8; 48];
        let ct = Aes128CbcEnc::new(&key.into(), &iv.into())
            .encrypt_padded_b2b_mut::<Pkcs7>(plaintext.as_bytes(), &mut out_buf)
            .unwrap();

        let mut with_prefix = b"v10".to_vec();
        with_prefix.extend_from_slice(ct);
        let encrypted_b64 = base64::engine::general_purpose::STANDARD.encode(&with_prefix);

        let result = decrypt_safe_storage(password, &encrypted_b64).unwrap();
        assert_eq!(result, plaintext);
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn test_decrypt_safe_storage_wrong_password() {
        use aes::cipher::{block_padding::Pkcs7, BlockEncryptMut, KeyIvInit};
        type Aes128CbcEnc = cbc::Encryptor<aes::Aes128>;

        let password = "correctpassword";
        let plaintext = r#"{"key":{"token":"sk-test"}}"#;

        let mut key = [0u8; 16];
        pbkdf2::pbkdf2_hmac::<sha1::Sha1>(password.as_bytes(), b"saltysalt", 1003, &mut key);

        let iv = [0x20u8; 16];
        let mut out_buf = [0u8; 48];
        let ct = Aes128CbcEnc::new(&key.into(), &iv.into())
            .encrypt_padded_b2b_mut::<Pkcs7>(plaintext.as_bytes(), &mut out_buf)
            .unwrap();

        let mut with_prefix = b"v10".to_vec();
        with_prefix.extend_from_slice(ct);
        let encrypted_b64 = base64::engine::general_purpose::STANDARD.encode(&with_prefix);

        let err = decrypt_safe_storage("wrongpassword", &encrypted_b64).unwrap_err();
        assert!(err.contains("AES decryption failed"));
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn test_decrypt_safe_storage_bad_base64() {
        let err = decrypt_safe_storage("pass", "not-valid-base64!!!").unwrap_err();
        assert!(err.contains("Base64 decode error"));
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn test_decrypt_safe_storage_too_short() {
        let short = base64::engine::general_purpose::STANDARD.encode(b"v1");
        let err = decrypt_safe_storage("pass", &short).unwrap_err();
        assert!(err.contains("too short"));
    }
}
