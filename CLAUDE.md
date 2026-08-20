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
npm run lint     # Expect 0 errors (20 known pre-existing warnings)
npm run build    # Expect 0 errors
```

Both must pass with 0 errors before deploying.

## Build Notes

- Next.js 16 with static export to `out/`.
- The build uses **Turbopack** (Next 16 default) on every platform, including darwin/x64. Do not add `--webpack`.
- If the build fails with `Turbopack is not supported on this platform (darwin/x64)` preceded by
  `Attempted to load @next/swc-darwin-x64, but it was not installed`, the native SWC binary is
  missing from `node_modules/@next/swc-darwin-x64/` (the dir may exist with only `package.json` +
  `README.md`). It is a ~119 MB `next-swc.darwin-x64.node`. Restore it rather than switching
  bundlers. Verified recovery (npm's own install is what dropped it, so extract the tarball directly):

  ```bash
  V=$(node -p "require('next/package.json').version")
  cd "$(mktemp -d)" && npm pack @next/swc-darwin-x64@"$V" && tar -xzf *.tgz
  cp package/next-swc.darwin-x64.node "$OLDPWD/node_modules/@next/swc-darwin-x64/"
  ```
  Confirm with `file node_modules/@next/swc-darwin-x64/next-swc.darwin-x64.node`
  → `Mach-O 64-bit dynamically linked shared library x86_64`.
- There is **no lockfile** in this repo, so optional native deps can silently go missing on reinstall.
- Cloudflare Pages Functions live in `functions/`.
