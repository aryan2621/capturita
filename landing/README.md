# Capturita landing site

Vite + React site with a Cloudflare Worker and D1 database for Capturita Pro checkout, signed license issuance, refunds, and device activation, and key recovery.

## Local development

Requires Node 24 and pnpm.

```sh
pnpm install
cp .dev.vars.example .dev.vars
pnpm keygen
```

Put the generated private and public keys in `.dev.vars` as `LICENSE_PRIVATE_KEY` and `LICENSE_PUBLIC_KEY_RAW`. Keep `.dev.vars` private; it is gitignored. Add Razorpay test credentials before testing checkout.

Apply the local database migration, build, and run the Worker:

```sh
pnpm d1:migrate:local
pnpm build
pnpm dev:worker
```

Open `http://localhost:8787`. For UI hot reload, run `pnpm dev` in a second terminal; Vite proxies `/api` to the Worker.

Tests use generated test keys and a mocked payment network:

```sh
pnpm test
```

## Deploy

1. Create a separate Cloudflare D1 database with `wrangler d1 create capturita-db`; put its ID in `wrangler.jsonc`.
2. Set `SITE_URL` to the deployed site URL and choose an unused `CHECKOUT_LIMITER` namespace ID. Replace the example support email in `wrangler.jsonc` and the seller legal-name placeholder in `src/config.ts` before launch.
3. Apply the remote migration with `pnpm d1:migrate:remote`.
4. Add secrets with `wrangler secret put`: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `LICENSE_PRIVATE_KEY`, `LICENSE_PUBLIC_KEY_RAW`, `ADMIN_TOKEN`, `ORDER_TOKEN_SECRET`, and `TURNSTILE_SECRET`. Do commit any secret values.
5. Configure the Razorpay webhook at `https://<site>/api/webhooks/razorpay` for `payment.captured`, `order.paid`, and `refund.processed`.
6. Deploy with `pnpm deploy`.
7. Build the official app with the matching public key, deployed status endpoint, and release build timestamp:

   ```sh
   CAPTURITA_LICENSE_PUBKEY=<LICENSE_PUBLIC_KEY_RAW> \
   CAPTURITA_LICENSE_API_URL=https://<site>/api/licenses/activate \
   CAPTURITA_BUILD_TS=$(date +%s) \
   npm run build:app
   ```

The private signing key must stay in the Worker secret store and must never be embedded in the app. License signatures are verified locally. Official builds check the license ID against the Worker; when the service is unreachable, Pro remains available for up to 30 days after the last successful check.

For GitHub-tagged app releases, set the repository variables `CAPTURITA_LICENSE_PUBKEY` and `CAPTURITA_LICENSE_API_URL` to the matching public key and deployed `/api/licenses/activate` URL. The release workflow fails early if either is missing.

Cloudflare Turnstile is optional. Configure `TURNSTILE_SECRET` and `TURNSTILE_SITE_KEY` to enable it at checkout.
