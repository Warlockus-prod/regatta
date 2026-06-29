# Brand: "Week to Regatta"

## The name

**Week to Regatta** is the project's full marketing name. It tells the
story: "you have a regatta in a week, you can still be ready." It
positions the bootcamp value-prop directly into the wordmark.

The short form **Regatta** is kept as the in-app top-nav wordmark and
in places where the long form would crowd a layout (iOS app icon
label, browser tab title under tight space, etc.).

## Where each form is used

| Surface | Form | Reason |
|---|---|---|
| Web `<title>` | `Week to Regatta - <localized tagline>` | SEO + browser tab |
| Web `og:title`, Twitter card | `Week to Regatta - <localized tagline>` | social previews |
| Web JSON-LD `name` | `Week to Regatta` (with `alternateName: Regatta`) | search engines |
| Web `siteName` (OG) | `Week to Regatta` | site-level OG |
| Web top-nav wordmark | `Regatta` | compactness in horizontal nav |
| Web bottom brand line | `Week to Regatta - <tagline>` | clear long-form anchor on every page (`src/components/SiteFooter.tsx`) |
| Mobile app `name` | `Week to Regatta` | App Store + display name |
| Mobile app icon label | `Regatta` (CFBundleDisplayName fallback) | iOS truncates >12 chars under the icon |
| Mobile in-app Home stack | `Week to` (small) over `Regatta` (large) | reads as one wordmark on a vertical screen |
| Domain (planned) | `weektoregatta.com` | see below |
| Bundle ID / npm slug / repo | `regatta`, `com.icoffio.regatta` | codebase identity does not need to chase the marketing name |

## Tagline

EN tagline: **sailing tutor**. Localized variants live in
`src/components/SiteFooter.tsx` and the app's metadata block in
`src/app/layout.tsx`:

| Lang | Tagline |
|---|---|
| RU | тренажёр парусного спорта |
| EN | sailing tutor |
| PL | symulator zeglarstwa |
| ES | simulador de vela |
| FR | simulateur de voile |
| DE | Segelsimulator |
| IT | simulatore di vela |

The full long-form line is **`Week to Regatta - <tagline>`**.

## Domain

**Status (2026-04-27):** `weektoregatta.com` is **available**. So are
`.io`, `.net`, `.me` and a number of niche TLDs. `.app`, `.co`, `.dev`
came back ambiguous in registry whois - re-check before purchase.

Recommended:
1. `weektoregatta.com` - primary brand domain. Buy via your existing
   registrar (the Hetzner VPS doesn't run a registrar; pick whichever
   you already have an account with - Namecheap, Cloudflare Registrar,
   or Reg.ru if you want a Russian registrar).
2. Optional: `weektoregatta.io` as a tech alias. Not strictly needed
   but cheap (~$30/y) and prevents squatting.
3. Skip `.app` until whois clears - that registry is loud about
   forced-HTTPS preload, takes a couple days to verify.

Once purchased, point it at the existing VPS:
- `A` record `weektoregatta.com` -> `178.104.223.93`
- `A` record `www.weektoregatta.com` -> `178.104.223.93`
- nginx_server on the VPS gets a vhost like `/opt/repos/nginx_server/conf.d/weektoregatta.conf` mirroring the `weektoregatta.com` block (TLS via certbot, proxy to `172.17.0.1:4500`).
- Add a 301 from the old `weektoregatta.com` to the new domain (or vice versa, depending on which you want as canonical), and update `metadataBase` in `src/app/layout.tsx`.

This work is in the **Shared lane** (nginx + DNS + layout metadata).

## Codebase identity (does not change)

These all stay as `regatta`:

- GitHub repo: `Warlockus-prod/regatta`
- Local working copy: `/Users/Andrey/App/all/regatta/`
- Docker image / container name: `regatta`
- VPS path: `/opt/repos/regatta/`
- npm package name: `regatta`
- Bundle ID for the mobile app: `com.icoffio.regatta`

Renaming the codebase would force every import path / git URL / VPS
path to be touched in lockstep, with very little upside. The
marketing name is decoupled.

## Logo

The wordmark on the mainsail in `/anatomy` (the AH-sailboat + vertical
"YACHTING" text with red base accent) is the brand logo. Source PNGs
live in `public/brand/`. The 3D model embeds the 2K version directly;
the website imports them from `/brand/*` for any 2D use.

## Honest status

The name is recent (2026-04-27). Nothing about the visual identity
has changed - same dark-ocean palette, same cyan accent, same icon.
"Week to Regatta" is purely a positioning + naming move so the
project can grow a real domain and App Store presence without
shadowing every `regatta` SEO term on the planet.
