#!/bin/sh
# One-shot: points the app's release builds at the deployed worker. Needs `gh` logged in.
gh variable set CAPTURITA_LICENSE_API_URL --repo aryan2621/capturita --body "https://capturita-site.just-a-dev.workers.dev/api/licenses/activate" &&
gh variable set CAPTURITA_LICENSE_PUBKEY --repo aryan2621/capturita --body "$(grep '^LICENSE_PUBLIC_KEY_RAW=' "$(dirname "$0")/../.dev.vars" | cut -d= -f2-)"
