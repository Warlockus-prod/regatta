# Sternik materials (archive)

Source materials for the /sternik section (sternik motorowodny exam prep),
preserved here per request so the originals live in git.

Provenance: generated 2026-07 by a local agent session as a standalone static
package (konspekt + 77-question test), originally dropped into the untracked
`sternik/` folder at the repo root. The live implementation at
`weektoregatta.com/sternik` (src/app/sternik/*, src/data/sternik.ts)
supersedes everything here:

- theory ported and fact-checked against tekst jednolity Dz.U. 2026 poz. 604,
  ustawa o zegludze srodladowej art. 37a, ustawa o rejestracji jachtow;
- the 77 questions were deduplicated, corrected and merged into the live bank;
- the PNG figures were redrawn as theme-aware inline SVG components.

Contents:

- `index.html` - original bilingual konspekt (PL/RU), self-contained.
- `test.html` - original 77-question interactive test (BANK array inside).
- `SOURCE-README.md` - the package's own README.
- `fig_0.png` ... `fig_14.png` - rendered diagram screenshots.

Note: em/en dashes in the HTML/MD copies were replaced with ASCII hyphens to
comply with the repo-wide typography rule (.githooks/pre-commit). Content is
otherwise unmodified. Do not edit these files - they are an archive; change
the live app instead.
