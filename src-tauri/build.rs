use std::time::{SystemTime, UNIX_EPOCH};

fn main() {
    for name in [
        "CAPTURITA_LICENSE_PUBKEY",
        "CAPTURITA_LICENSE_API_URL",
        "CAPTURITA_BUILD_TS",
    ] {
        println!("cargo:rerun-if-env-changed={name}");
    }
    let build_ts = match std::env::var("CAPTURITA_BUILD_TS") {
        Ok(timestamp) => timestamp
            .parse::<u64>()
            .expect("CAPTURITA_BUILD_TS must be Unix seconds"),
        Err(_) => SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
    };
    println!("cargo:rustc-env=CAPTURITA_BUILD_TS={build_ts}");

    // whisper.cpp's Metal backend uses `@available` checks, which need clang's runtime
    // (`___isPlatformVersionAtLeast`). Rust links with -nodefaultlibs, so add it explicitly.
    if let Ok(out) = std::process::Command::new("clang")
        .arg("--print-resource-dir")
        .output()
    {
        let dir = String::from_utf8_lossy(&out.stdout).trim().to_string();
        println!("cargo:rustc-link-search=native={dir}/lib/darwin");
        println!("cargo:rustc-link-lib=static=clang_rt.osx");
    }
    tauri_build::build()
}
