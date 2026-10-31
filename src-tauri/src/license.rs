use base64::{engine::general_purpose::STANDARD, Engine};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::{Digest, Sha256};

const SERVICE: &str = "com.capturita.app.license";
const KEY_ACCOUNT: &str = "pro-key";
const ACTIVATION_ACCOUNT: &str = "activation-token";
const REVOKED_ACCOUNT: &str = "revoked-license-id";
const PRODUCT: &str = "capturita";
const PUBLIC_KEY: &str = match option_env!("CAPTURITA_LICENSE_PUBKEY") {
    Some(key) => key,
    None => "",
};
const STATUS_URL: &str = match option_env!("CAPTURITA_LICENSE_API_URL") {
    Some(url) => url,
    None => "",
};
const BUILD_TS: u64 = match u64::from_str_radix(env!("CAPTURITA_BUILD_TS"), 10) {
    Ok(timestamp) => timestamp,
    Err(_) => 0,
};
const CLOCK_SKEW_SECS: u64 = 3 * 86400;

#[derive(Debug, Deserialize)]
struct Payload {
    lic: String,
    product: String,
    email: String,
    plan: String,
    updates_until: u64,
    expires: Option<u64>,
}

#[derive(Deserialize)]
struct ActivationToken {
    typ: String,
    lic: String,
    dev: String,
    iat: u64,
    exp: u64,
}

#[derive(Deserialize)]
struct ActivateReply {
    token: String,
}

#[derive(Deserialize)]
struct DeviceInfo {
    name: Option<String>,
}

#[derive(Deserialize, Default)]
struct ErrorReply {
    code: Option<String>,
    devices: Option<Vec<DeviceInfo>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseState {
    pub supported: bool,
    pub pro: bool,
    pub email: Option<String>,
    pub plan: Option<String>,
    pub updates_until: Option<u64>,
    pub error: Option<String>,
    pub notice: Option<String>,
}

impl Default for LicenseState {
    fn default() -> Self {
        let source_build = PUBLIC_KEY.is_empty();
        Self {
            supported: !source_build,
            pro: source_build,
            email: None,
            plan: None,
            updates_until: None,
            error: None,
            notice: None,
        }
    }
}

fn now() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn keychain_value(account: &str) -> Option<String> {
    let bytes = security_framework::passwords::get_generic_password(SERVICE, account).ok()?;
    String::from_utf8(bytes)
        .ok()
        .filter(|value| !value.is_empty())
}

fn save_keychain_value(account: &str, value: &str) -> Result<(), String> {
    let _ = security_framework::passwords::delete_generic_password(SERVICE, account);
    security_framework::passwords::set_generic_password(SERVICE, account, value.as_bytes())
        .map_err(|error| format!("Could not save the Pro license in Keychain: {error}"))
}

fn remove_keychain_value(account: &str) -> Result<(), String> {
    if keychain_value(account).is_none() {
        return Ok(());
    }
    security_framework::passwords::delete_generic_password(SERVICE, account)
        .map_err(|error| format!("Could not remove the Pro license from Keychain: {error}"))
}

/// Decodes `body` and checks its Ed25519 signature against the build's public key; returns the signed bytes.
fn verify_signature(body_b64: &str, signature_b64: &str, public_key: &str) -> Result<Vec<u8>, String> {
    let payload_bytes = STANDARD
        .decode(body_b64)
        .map_err(|_| "That license key is not valid")?;
    let signature_bytes: [u8; 64] = STANDARD
        .decode(signature_b64)
        .map_err(|_| "That license key is not valid")?
        .try_into()
        .map_err(|_| "That license key is not valid")?;
    let public_bytes: [u8; 32] = STANDARD
        .decode(public_key)
        .map_err(|_| "This app build has an invalid Pro verification key")?
        .try_into()
        .map_err(|_| "This app build has an invalid Pro verification key")?;
    let verifying_key = VerifyingKey::from_bytes(&public_bytes)
        .map_err(|_| "This app build has an invalid Pro verification key")?;
    verifying_key
        .verify(&payload_bytes, &Signature::from_bytes(&signature_bytes))
        .map_err(|_| "That license key is not valid")?;
    Ok(payload_bytes)
}

fn verify_with(key: &str, public_key: &str, build_ts: u64, now: u64) -> Result<Payload, String> {
    let (payload_b64, signature_b64) = key
        .trim()
        .split_once('.')
        .ok_or("That doesn't look like a Capturita license key")?;
    if signature_b64.contains('.') {
        return Err("That doesn't look like a Capturita license key".into());
    }
    if public_key.is_empty() {
        return Err(
            "This app build cannot verify Pro keys. Please install an official Capturita build."
                .into(),
        );
    }

    let payload_bytes = verify_signature(payload_b64, signature_b64, public_key)?;

    let payload: Payload =
        serde_json::from_slice(&payload_bytes).map_err(|_| "That license key is not valid")?;
    if payload.product != PRODUCT {
        return Err("That license key is for a different product".into());
    }
    if payload.plan != "pro" || payload.email.is_empty() || payload.lic.is_empty() {
        return Err("That license key is not valid".into());
    }
    if payload
        .expires
        .is_some_and(|expires| now > expires.saturating_add(CLOCK_SKEW_SECS))
    {
        return Err("That license key has expired".into());
    }
    if build_ts > 0 && payload.updates_until > 0 && build_ts > payload.updates_until {
        return Err("This Capturita build is newer than the updates covered by your license. Renew to unlock Pro.".into());
    }
    Ok(payload)
}

fn verify(key: &str) -> Result<Payload, String> {
    verify_with(key, PUBLIC_KEY, BUILD_TS, now())
}

fn active_state(payload: Payload, notice: Option<String>) -> LicenseState {
    LicenseState {
        supported: true,
        pro: true,
        email: Some(payload.email),
        plan: Some(payload.plan),
        updates_until: Some(payload.updates_until),
        error: None,
        notice,
    }
}

/// What the license server said about this key on this device.
enum Check {
    Active(String),
    Revoked,
    SeatLimit(String),
    Unconfigured,
}

/// SHA-256 of the Mac's hardware UUID, salted per product. Only this hash ever leaves the machine.
fn device_id() -> Result<&'static str, String> {
    static ID: std::sync::OnceLock<Option<String>> = std::sync::OnceLock::new();
    ID.get_or_init(|| {
        let out = std::process::Command::new("/usr/sbin/ioreg")
            .args(["-rd1", "-c", "IOPlatformExpertDevice"])
            .output()
            .ok()?;
        let text = String::from_utf8_lossy(&out.stdout);
        let uuid = text
            .lines()
            .find(|line| line.contains("IOPlatformUUID"))?
            .split('"')
            .nth(3)?
            .to_string();
        let digest = Sha256::digest(format!("{PRODUCT}:{uuid}"));
        Some(digest.iter().map(|byte| format!("{byte:02x}")).collect())
    })
    .as_deref()
    .ok_or_else(|| "Could not identify this Mac for license activation".to_string())
}

fn device_name() -> String {
    std::process::Command::new("/usr/sbin/scutil")
        .args(["--get", "ComputerName"])
        .output()
        .ok()
        .map(|out| String::from_utf8_lossy(&out.stdout).trim().to_string())
        .filter(|name| !name.is_empty())
        .unwrap_or_else(|| "Mac".into())
}

/// Takes or refreshes this device's seat (idempotent). The reply carries a signed, device-bound token that proves the check offline.
async fn check_online(key: &str) -> Result<Check, String> {
    if STATUS_URL.is_empty() {
        return Ok(Check::Unconfigured);
    }
    let response = reqwest::Client::new()
        .post(STATUS_URL)
        .timeout(std::time::Duration::from_secs(8))
        .json(&json!({ "key": key, "device_id": device_id()?, "device_name": device_name() }))
        .send()
        .await
        .map_err(|error| format!("Could not reach the license service: {error}"))?;
    let status = response.status().as_u16();
    if status == 200 {
        let reply: ActivateReply = response
            .json()
            .await
            .map_err(|error| format!("Could not read the license service response: {error}"))?;
        return Ok(Check::Active(reply.token));
    }
    let reply: ErrorReply = response.json().await.unwrap_or_default();
    // Only an explicit answer from our server revokes; a wrong URL or proxy error must never delete a buyer's key.
    match (status, reply.code.as_deref()) {
        (403 | 404, Some("revoked" | "invalid_key")) => Ok(Check::Revoked),
        (409, Some("seat_limit")) => {
            let names: Vec<String> = reply
                .devices
                .unwrap_or_default()
                .into_iter()
                .map(|d| d.name.unwrap_or_else(|| "Unnamed Mac".into()))
                .collect();
            Ok(Check::SeatLimit(format!(
                "This license is already active on {}. Remove it from one of those Macs (Settings → License → Remove), or email support to free a seat.",
                names.join(" and ")
            )))
        }
        _ => Err(format!("The license service returned HTTP {status}")),
    }
}

/// Verifies a server-signed activation token: signature, this license, this device, not expired, not issued in the future.
fn verify_activation(token: &str, public_key: &str, lic: &str, device: &str, now: u64) -> Result<(), String> {
    let (body, signature) = token.split_once('.').ok_or("Invalid activation")?;
    let bytes = verify_signature(body, signature, public_key)?;
    let t: ActivationToken = serde_json::from_slice(&bytes).map_err(|_| "Invalid activation")?;
    if t.typ != "activation" || t.lic != lic || t.dev != device {
        return Err("This activation belongs to a different license or device".into());
    }
    if now > t.exp {
        return Err("The last license check is more than 30 days old".into());
    }
    if now.saturating_add(CLOCK_SKEW_SECS) < t.iat {
        return Err("The system clock looks wrong".into());
    }
    Ok(())
}

fn stored_activation_valid(lic: &str) -> Result<(), String> {
    let token = keychain_value(ACTIVATION_ACCOUNT).ok_or("This Mac has not been activated")?;
    verify_activation(&token, PUBLIC_KEY, lic, device_id()?, now())
}

fn offline_state(payload: Payload, status_error: String) -> LicenseState {
    if let Err(reason) = stored_activation_valid(&payload.lic) {
        return LicenseState {
            error: Some(format!("Could not verify Pro status: {status_error}. {reason}. Connect to the internet to continue using Pro.")),
            ..Default::default()
        };
    }
    active_state(
        payload,
        Some(format!("Pro status could not be checked: {status_error}. Offline use is available for up to 30 days after the last successful check.")),
    )
}

/// Saves a fresh activation token after confirming it is signed for this license and device.
fn save_activation(token: &str, lic: &str) -> Result<(), String> {
    verify_activation(token, PUBLIC_KEY, lic, device_id()?, now())?;
    save_keychain_value(ACTIVATION_ACCOUNT, token)
}

fn clear_license() -> Result<(), String> {
    remove_keychain_value(KEY_ACCOUNT)?;
    remove_keychain_value(ACTIVATION_ACCOUNT)
}

/// Checks a signed key locally, then re-confirms the seat online. Refunds and revocations land here.
#[tauri::command]
pub async fn license_state() -> LicenseState {
    let Some(key) = keychain_value(KEY_ACCOUNT) else {
        return LicenseState::default();
    };
    let payload = match verify(&key) {
        Ok(payload) => payload,
        Err(error) => {
            return LicenseState {
                error: Some(error),
                ..Default::default()
            }
        }
    };
    let revoked = keychain_value(REVOKED_ACCOUNT).as_deref() == Some(&payload.lic);

    match check_online(&key).await {
        Ok(Check::Active(token)) => {
            let saved = save_activation(&token, &payload.lic)
                .and_then(|_| if revoked { remove_keychain_value(REVOKED_ACCOUNT) } else { Ok(()) });
            match saved {
                Ok(()) => active_state(payload, None),
                Err(error) => LicenseState { error: Some(error), ..Default::default() },
            }
        }
        Ok(Check::Revoked) => {
            let mark_error = save_keychain_value(REVOKED_ACCOUNT, &payload.lic).err();
            let detail = mark_error.or(clear_license().err());
            LicenseState {
                error: Some(detail.map_or_else(
                    || "This Pro license was refunded or revoked.".to_string(),
                    |error| format!("This Pro license was refunded or revoked. {error}"),
                )),
                ..Default::default()
            }
        }
        Ok(Check::SeatLimit(message)) => LicenseState {
            error: Some(message),
            ..Default::default()
        },
        _ if revoked => LicenseState {
            error: Some("This Pro license was refunded or revoked.".into()),
            ..Default::default()
        },
        Ok(Check::Unconfigured) => offline_state(payload, "the license service is not configured for this build".into()),
        Err(error) => offline_state(payload, error),
    }
}

/// First activation needs the internet: it takes one of the license's seats.
#[tauri::command]
pub async fn activate_license(key: String) -> Result<LicenseState, String> {
    let key = key.trim().to_string();
    if key.is_empty() {
        return Err("Paste your Capturita license key first.".into());
    }
    let payload = verify(&key)?;
    match check_online(&key).await {
        Ok(Check::Active(token)) => {
            save_activation(&token, &payload.lic)?;
            save_keychain_value(KEY_ACCOUNT, &key)?;
            let _ = remove_keychain_value(REVOKED_ACCOUNT);
            Ok(active_state(payload, Some("License activated on this Mac.".into())))
        }
        Ok(Check::Revoked) => Err("This Pro license was refunded or revoked.".into()),
        Ok(Check::SeatLimit(message)) => Err(message),
        Ok(Check::Unconfigured) => Err("This build cannot activate licenses. Please install an official Capturita build.".into()),
        Err(error) => Err(format!("Could not activate: {error}. Connect to the internet and try again.")),
    }
}

/// Frees this Mac's seat (best effort, so removing works offline too), then forgets the key.
#[tauri::command]
pub async fn remove_license() -> Result<(), String> {
    if let (Some(key), Ok(device)) = (keychain_value(KEY_ACCOUNT), device_id()) {
        if !STATUS_URL.is_empty() {
            let _ = reqwest::Client::new()
                .post(STATUS_URL.replace("/activate", "/deactivate"))
                .timeout(std::time::Duration::from_secs(5))
                .json(&json!({ "key": key, "target": device }))
                .send()
                .await;
        }
    }
    clear_license()?;
    remove_keychain_value(REVOKED_ACCOUNT)
}

/// Guard paid Tauri commands as well as the UI; online checks are refreshed by the app provider.
pub fn require_pro() -> Result<(), String> {
    if PUBLIC_KEY.is_empty() {
        return Ok(());
    }
    let key = keychain_value(KEY_ACCOUNT)
        .ok_or("This is a Pro feature. Activate a Capturita Pro key in Settings → License.")?;
    let payload = verify(&key)?;
    if keychain_value(REVOKED_ACCOUNT).as_deref() == Some(&payload.lic) {
        return Err("This Pro license was refunded or revoked.".into());
    }
    stored_activation_valid(&payload.lic)
        .map_err(|reason| format!("Connect to the internet to verify your Capturita Pro license ({reason})."))
}

#[cfg(test)]
mod tests {
    use super::*;
    use ed25519_dalek::{Signer, SigningKey};

    fn signed_key(signing_key: &SigningKey, updates_until: u64) -> String {
        let payload = format!(
            r#"{{"lic":"lic_0123456789abcdefabcd","product":"capturita","email":"a@b.c","plan":"pro","issued":1,"updates_until":{updates_until},"expires":null}}"#
        );
        let signature = signing_key.sign(payload.as_bytes());
        format!(
            "{}.{}",
            STANDARD.encode(payload),
            STANDARD.encode(signature.to_bytes())
        )
    }

    #[test]
    fn verifies_signature_product_and_update_cutoff() {
        let signing_key = SigningKey::from_bytes(&[7; 32]);
        let public_key = STANDARD.encode(signing_key.verifying_key().to_bytes());
        let key = signed_key(&signing_key, 2000);
        assert!(verify_with(&key, &public_key, 1000, 10).is_ok());
        assert!(verify_with(&key, &public_key, 3000, 10).is_err());
        assert!(verify_with(&key, "", 1000, 10).is_err());
        assert!(verify_with("not-a-key", &public_key, 1000, 10).is_err());

        let other_key = SigningKey::from_bytes(&[8; 32]);
        let invalid_signature = signed_key(&other_key, 2000);
        assert!(verify_with(&invalid_signature, &public_key, 1000, 10).is_err());
    }

    #[test]
    fn activation_token_is_bound_to_license_device_and_time() {
        let sk = SigningKey::from_bytes(&[7; 32]);
        let public_key = STANDARD.encode(sk.verifying_key().to_bytes());
        let body = r#"{"typ":"activation","lic":"lic_1","dev":"dev_1","iat":1000000,"exp":2000000}"#;
        let token = format!("{}.{}", STANDARD.encode(body), STANDARD.encode(sk.sign(body.as_bytes()).to_bytes()));
        assert!(verify_activation(&token, &public_key, "lic_1", "dev_1", 1500000).is_ok());
        assert!(verify_activation(&token, &public_key, "lic_2", "dev_1", 1500000).is_err(), "other license");
        assert!(verify_activation(&token, &public_key, "lic_1", "dev_2", 1500000).is_err(), "other device");
        assert!(verify_activation(&token, &public_key, "lic_1", "dev_1", 2000001).is_err(), "expired");
        assert!(verify_activation(&token, &public_key, "lic_1", "dev_1", 1000000 - CLOCK_SKEW_SECS - 1).is_err(), "clock rolled back");
        let forged = format!("{}.{}", STANDARD.encode(body.replace("2000000", "9999999")), token.split_once('.').unwrap().1);
        assert!(verify_activation(&forged, &public_key, "lic_1", "dev_1", 1500000).is_err(), "tampered");
    }

    #[test]
    fn source_builds_keep_pro_features_unrestricted() {
        let state = LicenseState::default();
        assert_eq!(state.supported, !PUBLIC_KEY.is_empty());
        assert_eq!(state.pro, PUBLIC_KEY.is_empty());
    }
}
