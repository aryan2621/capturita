# Capturita landing site

Vite + React static site (Cloudflare assets). It describes the app, hosts the free download and troubleshooting, and links to the storefront for everything about money or the licence key.

Checkout, licence keys, receipts, refunds, device seats live in the storefront repo (`https://storefront.just-a-dev.workers.dev`, see its `docs/LANDING_MIGRATION.md`). The Pro price shown on `/pricing` is read from the storefront's `/api/products/capturita`.

## Develop

Requires Node 24 and pnpm.

```sh
pnpm install
pnpm dev
```

## Deploy

```sh
pnpm deploy
```

Official app builds set `CAPTURITA_LICENSE_API_URL` to the storefront and `LICENSE_PUBLIC_KEY` to the storefront's public key (from `pnpm keygen`):

```sh
scripts/set-release-vars.sh <LICENSE_PUBLIC_KEY>
```
