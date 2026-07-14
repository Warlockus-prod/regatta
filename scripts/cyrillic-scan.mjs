// Scan content routes for Cyrillic leaks in ES/FR/DE/IT.
// Run after `npm run dev -- --port 3007`.
import { chromium } from 'playwright';

const BASE = process.env.SCAN_BASE || 'http://localhost:3007';
// PL and EN were NOT scanned, which is how "МППСС-72" sat inside the Polish
// rules blurb unnoticed: the Russian abbreviation for COLREGS, on the Polish
// page. Every non-Russian language is checked now.
const LANGS = ['pl', 'en', 'es', 'fr', 'de', 'it'];
const ROUTES = [
  '/', '/start', '/onboard', '/checklist', '/courses', '/racing',
  '/glossary', '/rules', '/anatomy', '/gallery', '/simulator',
  '/simulator-v3', '/simulator2', '/leaderboard', '/game', '/multiplayer',
  '/spots', '/privacy', '/quick', '/support',
];

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const report = [];
for (const lang of LANGS) {
  for (const route of ROUTES) {
    const url = `${BASE}${route}?lang=${lang}`;
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 20_000 });
      // Give React a beat to hydrate
      await page.waitForTimeout(600);
      const cyrillic = await page.evaluate(() => {
        const text = document.body.innerText;
        const matches = text.match(/[а-яА-ЯёЁ]{3,}/g);
        return matches ?? [];
      });
      if (cyrillic.length > 0) {
        report.push({ lang, route, count: cyrillic.length, sample: cyrillic.slice(0, 8) });
      }
    } catch (e) {
      report.push({ lang, route, error: e.message.slice(0, 80) });
    }
  }
}

await browser.close();

const header = `\nCyrillic leak scan (ES/FR/DE/IT across ${ROUTES.length} routes):\n`;
console.log(header);
if (report.length === 0) {
  console.log('ALL CLEAN - 0 leaks across all routes and target langs.');
} else {
  for (const r of report) {
    if (r.error) {
      console.log(`  [${r.lang}] ${r.route}: ERROR ${r.error}`);
    } else {
      console.log(`  [${r.lang}] ${r.route}: ${r.count} words - sample: ${r.sample.join(', ')}`);
    }
  }
}
console.log('');

// Fail the process on real leaks so CI (or a manual run) can gate on it.
// Fetch/render errors are reported but do not fail the run (transient).
const leaks = report.filter((r) => !r.error && r.count > 0);
if (leaks.length > 0) {
  console.error(`FAIL: Cyrillic leaks in ${leaks.length} route/language combination(s).`);
  process.exit(1);
}
