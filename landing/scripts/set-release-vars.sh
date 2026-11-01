#!/bin/sh
# One-shot: points the app's release builds at the storefront. Usage: set-release-vars.sh <LICENSE_PUBLIC_KEY (raw 32-byte, base64)>. Needs `gh` logged in.
gh variable set CAPTURITA_LICENSE_API_URL --repo aryan2621/capturita --body "https://storefront.just-a-dev.workers.dev/api/licenses/activate" &&
gh variable set LICENSE_PUBLIC_KEY --repo aryan2621/capturita --body "$1"
