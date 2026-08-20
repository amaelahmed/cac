# CAC Website – Developer Guide

## Deployment

- **`main` auto-deploys to production** via Cloudflare Pages at `cancelagencyculture.in`. Never push directly to `main`.
- **Always work on a branch.** Create a feature branch for every change.
- **Always deploy previews** using `--branch` to avoid touching production:
  ```bash
  npx wrangler pages deploy out --project-name=cac --branch=<branch-name>
  ```

## Pre-Deploy Checklist

Run lint and build before every deploy:

```bash
npm run lint          # Expect 0 errors (warnings are OK)
npx next build --webpack   # Use --webpack on darwin/x64 (Turbopack unsupported)
```

Both must pass with 0 errors before deploying.

## Build Notes

- Next.js 16 with static export to `out/`.
- Turbopack is not supported on darwin/x64 — always use `npx next build --webpack` or add `--webpack` to the build script.
- Cloudflare Pages Functions live in `functions/`.
