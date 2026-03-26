# Claude Desktop App Credential Support

## Summary

Add support for reading OAuth tokens from the Claude Desktop app as a fallback when Claude Code credentials are not found. This allows Burnmeter to work for users who have the Claude Desktop app but not Claude Code CLI installed.

## Motivation

Currently Burnmeter requires `claude login` (Claude Code CLI) to function. The Claude Desktop app stores identical `sk-ant-oat01-...` OAuth tokens that work with the same `api.anthropic.com/api/oauth/usage` endpoint. Supporting both credential sources broadens the user base without changing the API interaction.

## Design

### Token resolution order

1. Claude Code credentials (existing behavior, unchanged)
2. Claude Desktop app credentials (new fallback)

If Claude Code credentials are found, Desktop credentials are never attempted. This ensures zero behavioral change for existing users.

### New module: `desktop_credentials.rs`

A single public function:

```rust
pub fn read_desktop_token() -> Result<String, String>
```

Internally dispatches to platform-specific implementations via `#[cfg(target_os)]`.

### macOS implementation

1. Read encryption password from Keychain:
   - Service: `"Claude Safe Storage"`
   - Account: `"Claude Key"`
   - Method: `security find-generic-password -s "Claude Safe Storage" -a "Claude Key" -w`
2. Read `~/Library/Application Support/Claude/config.json`
3. Extract `oauth:tokenCache` field (base64-encoded string)
4. Decrypt:
   - Base64 decode the value
   - Strip 3-byte `v10` prefix (Chromium safeStorage version tag)
   - Derive key: PBKDF2-HMAC-SHA1(password, salt=`"saltysalt"`, iterations=1003, key_length=16)
   - Decrypt: AES-128-CBC with IV = 16 space bytes (0x20)
   - Remove PKCS7 padding
5. Parse decrypted JSON, extract first entry's `token` field

### Linux implementation

1. Read encryption password:
   - Try: `secret-tool lookup application claude` (GNOME Keyring)
   - Fallback: hardcoded `"peanuts"` (Chromium default when no keyring available)
2. Read `~/.config/Claude/config.json`
3. Extract and decrypt `oauth:tokenCache` using same PBKDF2 + AES-128-CBC flow as macOS

### Windows implementation

1. Read `%APPDATA%\Claude\config.json`
2. Extract `oauth:tokenCache` (base64-encoded)
3. Decrypt:
   - Base64 decode
   - Strip DPAPI version prefix
   - Call `CryptUnprotectData` (Windows DPAPI)
4. Parse JSON, extract token

### Token extraction from decrypted JSON

The decrypted `oauth:tokenCache` is a JSON object with composite keys mapping to token objects:

```json
{
  "<uuid>:<uuid>:https://api.anthropic.com:...scopes...": {
    "token": "sk-ant-oat01-...",
    "refreshToken": "...",
    "expiresAt": 1774565949914
  }
}
```

We iterate entries and return the first `token` value found.

### Changes to `keychain.rs`

Minimal change to `read_oauth_token()`:

```rust
pub fn read_oauth_token() -> Result<String, String> {
    // Try Claude Code first
    if let Ok(raw) = platform_read_credentials() {
        if let Ok(token) = parse_token(&raw) {
            return Ok(token);
        }
    }
    // Fall back to Claude Desktop
    crate::desktop_credentials::read_desktop_token()
}
```

### New Cargo dependencies

- `aes = "0.8"` — AES block cipher
- `cbc = "0.1"` — CBC mode
- `pbkdf2 = "0.12"` — key derivation
- `hmac = "0.12"` — for PBKDF2-HMAC
- `sha1 = "0.10"` — for PBKDF2-HMAC-SHA1
- `base64 = "0.22"` — decoding encrypted blob
- `winapi` (Windows only, `#[cfg]`-gated) — for DPAPI

### Error handling

- All Desktop credential failures are treated as "not available" — they cause fallback, not user-visible errors
- The final error message remains: "No Claude OAuth token found. Run `claude login` first."
- No new error states are exposed to the frontend

### Files changed

- `src-tauri/Cargo.toml` — add crypto dependencies
- `src-tauri/src/desktop_credentials.rs` — new module (all decryption logic)
- `src-tauri/src/keychain.rs` — modify `read_oauth_token()` to try Desktop fallback
- `src-tauri/src/lib.rs` — add `mod desktop_credentials;`

### Testing

- Unit tests for token JSON parsing (decrypted structure to token string)
- Unit tests for the PBKDF2 + AES decrypt flow using known test vectors
- Integration: manual test on macOS with Claude Desktop installed

### Security considerations

- Read-only access to credentials (no writes, no token storage)
- Keychain access will trigger a macOS permission prompt on first use (same as existing Claude Code behavior)
- No tokens are logged, cached, or persisted by Burnmeter
