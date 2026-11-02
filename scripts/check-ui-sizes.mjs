#!/usr/bin/env node
// Size, contrast and layout check for the screens a player spends time on
// (package 11, audit K6, B6, B9, B11). DESIGN.md invariants, measured in a real
// browser at 390x844 against a running server:
//
//   BASE_URL=http://localhost:3025 npm run check:ui
//
// Visits the race (Simple and Pro, with the wheels and, package 13, with the
// on-screen arrows, while the race runs, every dock tab), the
// Trainer (/simulator-v3, 3D and top view), Basics (/simulator), Boat 3D
// (/simulator2) and /glossary, and fails on:
//   - visible text under 12 px for labels or under 14 px for reading text;
//   - interactive targets under 44 px (primary) or, for secondary targets
//     (inline links, data-target-size="secondary"), under 24 px or without a
//     free 44 px square around them (WCAG 2.5.8);
//   - text contrast under 4.5:1 (3:1 for 18 px or bold 14 px and larger);
//   - a truncated key label (scrollWidth over clientWidth, an ellipsis, or a
//     label cut by a clipping box or the screen edge);
//   - two visible text boxes intersecting;
//   - horizontal page scroll.
// Findings go to stdout only (route, state, selector, text, measurement); the
// script writes no files. Exit code 1 when anything is found.
//
// The race is started the way e2e/race-navigation.spec.ts startRace() does:
// the same stored preferences, the lobby, the briefing, the running clock.
import { chromium } from "playwright";

const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
// 390x844 is the gate; CHECK_UI_VIEWPORT=375x812 (or 320x568) looks at a smaller phone.
const [vpW, vpH] = (process.env.CHECK_UI_VIEWPORT || "390x844").split("x").map(Number);
const VIEWPORT = { width: vpW || 390, height: vpH || 844 };
const ONLY = process.env.CHECK_UI_ONLY ? new Set(process.env.CHECK_UI_ONLY.split(",")) : null;
const MAX_PRINT = Number(process.env.CHECK_UI_MAX ?? 400);

const LIMITS = { label: 12, reading: 14, primary: 44, secondary: 24, spacing: 44, contrast: 4.5, largeContrast: 3 };

/** Runs inside the page: every finding for the current screen state. */
function auditPage(limits) {
  const vw = innerWidth, vh = innerHeight;
  const findings = [];
  const add = (kind, el, text, detail) => findings.push({ kind, selector: describe(el), text: (text || "").replace(/\s+/g, " ").trim().slice(0, 60), detail });

  function describe(el) {
    if (!el || el.nodeType !== 1) return "?";
    const parts = [];
    for (let e = el, depth = 0; e && e.nodeType === 1 && depth < 4; e = e.parentElement, depth++) {
      const test = e.getAttribute("data-testid");
      let part = e.tagName.toLowerCase();
      if (test) { parts.unshift(`${part}[data-testid=${test}]`); break; }
      if (e.id) { parts.unshift(`${part}#${e.id}`); break; }
      const cls = typeof e.className === "string" ? e.className.trim().split(/\s+/).filter(Boolean).slice(0, 2) : [];
      if (cls.length) part += "." + cls.map(c => c.replace(/[^\w-]/g, "")).join(".");
      const role = e.getAttribute("role");
      if (role) part += `[role=${role}]`;
      parts.unshift(part);
    }
    return parts.join(" > ");
  }

  const styleOf = new Map();
  const cs = (el) => { let s = styleOf.get(el); if (!s) { s = getComputedStyle(el); styleOf.set(el, s); } return s; };

  /** The part of the screen an element can paint into: viewport cut by every clipping ancestor. */
  function clipBox(el) {
    const box = { l: 0, t: 0, r: vw, b: vh, scrollY: false, hardY: false };
    let fixed = cs(el).position === "fixed";
    for (let a = el.parentElement; a && a !== document.documentElement && !fixed; a = a.parentElement) {
      const s = cs(a);
      if (s.overflowX !== "visible" || s.overflowY !== "visible") {
        const r = a.getBoundingClientRect();
        const l = r.left + a.clientLeft, t = r.top + a.clientTop;
        if (s.overflowX !== "visible") { box.l = Math.max(box.l, l); box.r = Math.min(box.r, l + a.clientWidth); }
        if (s.overflowY !== "visible") {
          box.t = Math.max(box.t, t); box.b = Math.min(box.b, t + a.clientHeight);
          // Only the nearest vertical clip says whether a cut line is scrolled away or lost.
          if (!box.scrollY && !box.hardY) {
            if (s.overflowY === "auto" || s.overflowY === "scroll") box.scrollY = true; else box.hardY = true;
          }
        }
      }
      if (s.position === "fixed") fixed = true;
    }
    return box;
  }

  const cut = (r, c) => ({ l: Math.max(r.left, c.l), t: Math.max(r.top, c.t), r: Math.min(r.right, c.r), b: Math.min(r.bottom, c.b) });
  const area = (b) => Math.max(0, b.r - b.l) * Math.max(0, b.b - b.t);

  function opacityOf(el) {
    let o = 1;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) o *= Number(cs(e).opacity);
    return o;
  }

  function visible(el) {
    if (!el.checkVisibility || !el.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true })) return false;
    if (el.closest("[inert]")) return true; // dimmed but shown (finish hold): still measured
    return opacityOf(el) > 0.05;
  }

  /** The text is on top at this point (not under an overlay). */
  function onTop(el, x, y) {
    if (x < 0 || y < 0 || x >= vw || y >= vh) return false;
    const hit = document.elementFromPoint(x, y);
    if (!hit) return false;
    return hit === el || el.contains(hit) || hit.contains(el) || (hit.closest("label") && hit.closest("label") === el.closest("label"));
  }

  const parseColor = (str) => {
    const m = str.match(/rgba?\(([^)]+)\)/);
    if (!m) {
      const c = str.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/);
      if (c) return [Number(c[1]) * 255, Number(c[2]) * 255, Number(c[3]) * 255, c[4] === undefined ? 1 : Number(c[4])];
      return null;
    }
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3]];
  };
  const over = (top, under) => {
    const a = top[3];
    return [top[0] * a + under[0] * (1 - a), top[1] * a + under[1] * (1 - a), top[2] * a + under[2] * (1 - a), 1];
  };
  const lum = (c) => {
    const ch = c.slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  };
  const ratio = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };

  /** Background from the element's own ancestors, or null when it is a picture, gradient or the scene. */
  function computedBackground(el, x, y) {
    const stack = document.elementsFromPoint(x, y);
    const layers = [];
    for (let a = el; a && a.nodeType === 1; a = a.parentElement) {
      const s = cs(a);
      if (s.backgroundImage && s.backgroundImage !== "none") return null;
      const c = parseColor(s.backgroundColor);
      if (c && c[3] > 0) {
        layers.push(c);
        if (c[3] >= 0.99) break;
      }
      // A canvas, video or image painted between this ancestor and the next one.
      const idx = stack.indexOf(a);
      if (idx >= 0) {
        const next = a.parentElement ? stack.indexOf(a.parentElement) : stack.length;
        for (let i = idx + 1; i < (next < 0 ? stack.length : next); i++) {
          if (/^(CANVAS|VIDEO|IMG|svg)$/i.test(stack[i].tagName) && !a.contains(stack[i])) return null;
        }
      }
    }
    if (!layers.length || layers[layers.length - 1][3] < 0.99) return null;
    let bg = layers[layers.length - 1];
    for (let i = layers.length - 2; i >= 0; i--) bg = over(layers[i], bg);
    return bg;
  }

  // ---- text ---------------------------------------------------------------
  const texts = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const value = node.nodeValue;
    if (!value || !value.trim()) continue;
    const el = node.parentElement;
    if (!el || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|TITLE|OPTION)$/.test(el.tagName)) continue;
    if (!visible(el)) continue;
    range.selectNodeContents(node);
    const rects = [...range.getClientRects()].filter(r => r.width > 0.5 && r.height > 0.5);
    if (!rects.length) continue;
    const clip = clipBox(el);
    const shown = rects.map(r => ({ raw: r, box: cut(r, clip) })).filter(x => area(x.box) > 2);
    if (!shown.length) continue;
    // Screen reader only text: one pixel boxes.
    const er = el.getBoundingClientRect();
    if (er.width <= 2 || er.height <= 2) continue;
    texts.push({ node, el, value, rects, shown, clip });
  }

  const KEY = "button, a, label, summary, legend, th, dt, h1, h2, h3, h4, h5, h6, output, [role=tab], [role=radio], [role=button], [role=switch], [role=link], [role=menuitem]";
  const svgScale = (el) => { const m = el.getScreenCTM && el.getScreenCTM(); return m ? Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) : 1; };
  const contrastQueue = [];
  const seenEl = new Set();
  const reportedCover = new Set();

  for (const t of texts) {
    const el = t.el;
    const s = cs(el);
    const inSvg = el instanceof SVGElement;
    const size = Number.parseFloat(s.fontSize) * (inSvg ? svgScale(el) : 1);
    const weight = Number(s.fontWeight) || 400;
    const full = (el.textContent || "").replace(/\s+/g, " ").trim();
    const reading = !el.closest(KEY) && !inSvg && full.length >= 40 && full.split(" ").length >= 6;
    const min = reading ? limits.reading : limits.label;
    const first = t.shown[0].box;
    const cx = (first.l + first.r) / 2, cy = (first.t + first.b) / 2;
    const top = onTop(el, cx, cy);
    if (!seenEl.has(el)) {
      seenEl.add(el);
      if (top && size < min - 0.05) add("text-size", el, full || t.value, `${size.toFixed(1)}px < ${min}px (${reading ? "reading" : "label"})`);
      if (top) contrastQueue.push({ el, text: full || t.value, size, weight, box: first, color: parseColor(inSvg ? (s.fill && s.fill !== "none" ? s.fill : s.color) : s.color), opacity: opacityOf(el), bg: computedBackground(el, cx, cy) });
    }
    // Partly under another box (a label half hidden by a card over the scene).
    // A sticky or fixed bar the page scrolls under is not a cover.
    const covered = (x, y) => {
      if (x < 0 || y < 0 || x >= vw || y >= vh) return false;
      const hit = document.elementFromPoint(x, y);
      if (!hit || hit === el || el.contains(hit) || hit.contains(el)) return false;
      // Inside one drawing the empty corners of a letter box show the drawing itself.
      if (el instanceof SVGElement && hit.closest("svg") === el.closest("svg")) return false;
      if (hit.closest("nextjs-portal")) return false; // the dev server's own badge
      for (let e = hit; e && e !== document.body; e = e.parentElement) {
        const p = cs(e).position;
        if (p === "fixed" || p === "sticky") return false;
      }
      return true;
    };
    if (!reportedCover.has(el)) {
      for (const { box: b } of t.shown) {
        // The letter box includes the line's half-leading: test inside the glyphs.
        const ix = 2, iy = Math.max(2, (b.b - b.t) * 0.25);
        const pts = [[(b.l + b.r) / 2, (b.t + b.b) / 2], [b.l + ix, b.t + iy], [b.r - ix, b.t + iy], [b.l + ix, b.b - iy], [b.r - ix, b.b - iy]];
        const hits = pts.map(([x, y]) => covered(x, y));
        if (hits.some(Boolean) && !hits.every(Boolean)) {
          const hit = pts.map(([x, y]) => document.elementFromPoint(x, y)).find((h, i) => hits[i]);
          reportedCover.add(el);
          add("covered", el, full || t.value, `partly under ${describe(hit)}`);
          break;
        }
      }
    }
    // Cut by a clipping box or the screen edge, sideways: a label off the edge of a tab strip.
    for (const { raw } of t.shown) {
      const sideways = raw.left < t.clip.l - 1 || raw.right > t.clip.r + 1;
      const hardCut = t.clip.hardY && (raw.top < t.clip.t - 1 || raw.bottom > t.clip.b + 1) && el.closest(KEY);
      if (sideways || hardCut) {
        add("truncated", el, full || t.value, sideways ? `text ${Math.round(raw.left)}..${Math.round(raw.right)} outside ${Math.round(t.clip.l)}..${Math.round(t.clip.r)}` : "text cut by a fixed-height box");
        break;
      }
    }
  }

  // Ellipsis, line clamp and content wider than its own box on key labels.
  const keyEls = new Set();
  for (const t of texts) {
    for (let e = t.el; e && e !== document.body; e = e.parentElement) {
      keyEls.add(e);
      if (e.matches(KEY)) break;
    }
  }
  for (const e of keyEls) {
    if (!(e instanceof HTMLElement) || !e.closest(KEY)) continue;
    const s = cs(e);
    const clips = s.overflowX !== "visible" || s.textOverflow === "ellipsis";
    const clamp = s.webkitLineClamp && s.webkitLineClamp !== "none";
    if (s.textOverflow === "ellipsis" && e.scrollWidth > e.clientWidth + 1) add("truncated", e, e.textContent, `ellipsis: scrollWidth ${e.scrollWidth} > clientWidth ${e.clientWidth}`);
    else if (clips && e.scrollWidth > e.clientWidth + 1 && s.overflowX !== "auto" && s.overflowX !== "scroll") add("truncated", e, e.textContent, `scrollWidth ${e.scrollWidth} > clientWidth ${e.clientWidth}`);
    if (clamp && e.scrollHeight > e.clientHeight + 1) add("truncated", e, e.textContent, `line clamp: scrollHeight ${e.scrollHeight} > clientHeight ${e.clientHeight}`);
  }

  // Two visible text boxes intersecting. Text scrolled under an opaque bar
  // (the sticky site header) is hidden, not overlapped.
  function occluded(a, b, x, y) {
    const stack = document.elementsFromPoint(x, y);
    const ia = stack.indexOf(a), ib = stack.indexOf(b);
    if (ia < 0 || ib < 0) return false; // a pointer-events: none label: it shows
    const [upper, lower] = ia < ib ? [ia, ib] : [ib, ia];
    for (let k = upper; k < lower; k++) {
      const e = stack[k];
      if (e.contains(stack[lower])) continue;
      const c = parseColor(cs(e).backgroundColor);
      if ((c && c[3] > 0.85) || (cs(e).backgroundImage && cs(e).backgroundImage !== "none")) return true;
    }
    return false;
  }
  const boxes = [];
  for (const t of texts) for (const { box } of t.shown) boxes.push({ el: t.el, text: t.value, box });
  for (let i = 0; i < boxes.length; i++) {
    const a = boxes[i];
    for (let j = i + 1; j < boxes.length; j++) {
      const b = boxes[j];
      if (a.el === b.el) continue;
      const w = Math.min(a.box.r, b.box.r) - Math.max(a.box.l, b.box.l);
      const h = Math.min(a.box.b, b.box.b) - Math.max(a.box.t, b.box.t);
      if (w <= 2 || h <= 0) continue;
      const minH = Math.min(a.box.b - a.box.t, b.box.b - b.box.t);
      if (h < Math.max(3, minH * 0.3)) continue;
      if (occluded(a.el, b.el, (Math.max(a.box.l, b.box.l) + Math.min(a.box.r, b.box.r)) / 2, (Math.max(a.box.t, b.box.t) + Math.min(a.box.b, b.box.b)) / 2)) continue;
      add("overlap", a.el, `${a.text.trim().slice(0, 28)} / ${b.text.trim().slice(0, 28)}`, `${Math.round(w)}x${Math.round(h)}px with ${describe(b.el)}`);
    }
  }

  // ---- targets ------------------------------------------------------------
  const TARGET = "button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=radio], [role=checkbox], [role=switch], [role=slider], [role=link], [role=menuitem], [tabindex]:not([tabindex='-1'])";
  const targets = [];
  for (const el of document.querySelectorAll(TARGET)) {
    if (!visible(el)) continue;
    if (el.matches("[tabindex]") && !el.matches("button, a, input, select, textarea, summary, [role]")) continue; // focusable regions, not targets
    // A switch or checkbox inside its label: the label is the target.
    const label = el.matches("input[type=checkbox], input[type=radio]") ? el.closest("label") : null;
    const target = label ?? el;
    const r = target.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const clip = clipBox(target);
    const shown = cut(r, clip);
    if (area(shown) < 4) continue;
    const cx = (shown.l + shown.r) / 2, cy = (shown.t + shown.b) / 2;
    const hit = document.elementFromPoint(cx, cy);
    if (!hit || !(hit === target || target.contains(hit) || hit.contains(target) || hit.closest("label") === target)) continue;
    // Inline links in running text are exempt (WCAG 2.5.8 inline exception) but still need spacing.
    const inline = el.tagName === "A" && cs(el).display === "inline" && el.parentElement && (el.parentElement.textContent || "").trim().length > (el.textContent || "").trim().length + 10;
    const secondary = inline || el.closest("[data-target-size=secondary]") !== null;
    targets.push({ el: target, r, secondary, inline, name: el.getAttribute("aria-label") || target.textContent || el.getAttribute("title") || "" });
  }
  for (const t of targets) {
    const { r } = t;
    if (!t.secondary) {
      if (r.width < limits.primary - 0.5 || r.height < limits.primary - 0.5) add("target", t.el, t.name, `${Math.round(r.width)}x${Math.round(r.height)}px < ${limits.primary}px`);
      continue;
    }
    if (t.inline) continue;
    const small = r.width < limits.secondary - 0.5 || r.height < limits.secondary - 0.5;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2, half = limits.spacing / 2;
    const crowded = targets.some(o => o !== t && !o.el.contains(t.el) && !t.el.contains(o.el)
      && o.r.left < cx + half && o.r.right > cx - half && o.r.top < cy + half && o.r.bottom > cy - half);
    if (small || crowded) add("target", t.el, t.name, `${Math.round(r.width)}x${Math.round(r.height)}px secondary${small ? ` < ${limits.secondary}px` : ""}${crowded ? `, no free ${limits.spacing}px square` : ""}`);
  }

  // ---- page ---------------------------------------------------------------
  const se = document.scrollingElement || document.documentElement;
  if (se.scrollWidth > vw + 1) add("page-scroll", document.documentElement, "", `page ${se.scrollWidth}px wide in a ${vw}px window`);

  return { findings, contrast: contrastQueue.map(q => ({ ...q, el: undefined, selector: describe(q.el) })) };
}

/** Background pixels around a text box, read from a screenshot drawn into a canvas. */
async function sampleBackgrounds(page, png, boxes) {
  return page.evaluate(async ({ data, boxes }) => {
    const img = new Image();
    img.src = `data:image/png;base64,${data}`;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.width; canvas.height = img.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const scale = img.width / innerWidth;
    return boxes.map(b => {
      const px = [];
      const pad = 3;
      const l = Math.max(0, Math.floor((b.l - pad) * scale)), r = Math.min(img.width - 1, Math.ceil((b.r + pad) * scale));
      const t = Math.max(0, Math.floor((b.t - pad) * scale)), btm = Math.min(img.height - 1, Math.ceil((b.b + pad) * scale));
      const read = (x, y) => { const d = ctx.getImageData(x, y, 1, 1).data; px.push([d[0], d[1], d[2]]); };
      const stepX = Math.max(1, Math.floor((r - l) / 24)), stepY = Math.max(1, Math.floor((btm - t) / 8));
      for (let x = l; x <= r; x += stepX) { read(x, t); read(x, btm); }
      for (let y = t; y <= btm; y += stepY) { read(l, y); read(r, y); }
      return { ring: px };
    });
  }, { data: png.toString("base64"), boxes });
}

function luminance(c) {
  const ch = c.slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
const contrast = (a, b) => { const la = luminance(a), lb = luminance(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
const blend = (top, under, alpha) => [0, 1, 2].map(i => top[i] * alpha + under[i] * (1 - alpha));

/** The median of the ring of pixels just outside the text box: what the letters sit on. */
function sampledBackground(sample) {
  const ring = [...sample.ring].sort((a, b) => luminance(a) - luminance(b));
  return ring[Math.floor(ring.length / 2)];
}

async function checkState(page, route, state, results) {
  await page.waitForTimeout(400);
  const { findings, contrast: queue } = await page.evaluate(auditPage, LIMITS);
  const png = await page.screenshot({ animations: "disabled", caret: "hide" });
  const needSample = queue.filter(q => !q.bg && q.color);
  const samples = needSample.length ? await sampleBackgrounds(page, png, needSample.map(q => q.box)) : [];
  needSample.forEach((q, i) => { q.sampled = sampledBackground(samples[i]); });
  for (const q of queue) {
    if (!q.color) continue;
    const bg = q.bg ?? q.sampled;
    if (!bg) continue;
    const fg = blend(q.color, bg, q.color[3] * q.opacity);
    const r = contrast(fg, bg);
    const large = q.size >= 18 || (q.size >= 14 && q.weight >= 700);
    const need = large ? LIMITS.largeContrast : LIMITS.contrast;
    if (r < need - 0.005) findings.push({ kind: "contrast", selector: q.selector, text: (q.text || "").replace(/\s+/g, " ").trim().slice(0, 60),
      detail: `${r.toFixed(2)}:1 < ${need}:1 (${q.size.toFixed(0)}px${q.bg ? "" : ", sampled"} fg ${fg.map(Math.round).join(",")} bg ${bg.slice(0, 3).map(Math.round).join(",")})` });
  }
  // One line per selector and kind: a list of identical rows is one finding.
  const unique = new Map();
  for (const f of findings) {
    const key = `${f.kind}|${f.selector}|${f.detail.replace(/[\d.]+/g, "#")}`;
    if (!unique.has(key)) unique.set(key, { ...f, count: 1 }); else unique.get(key).count++;
  }
  results.push({ route, state, findings: [...unique.values()], png });
}

async function newPage(browser, init) {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, locale: "ru-RU", hasTouch: false,
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 RegattaE2E" });
  await context.addInitScript(init ?? (() => {}));
  return context.newPage();
}

const BASE_INIT = () => {
  try {
    localStorage.setItem("regatta.lang.v1", "ru");
    localStorage.setItem("regatta.onboarding.v1", "1");
    localStorage.setItem("regatta.v3.tour.v1", "1");
    localStorage.setItem("regatta.race.intro-seen.v1", "1");
    localStorage.setItem("regatta.controls.v1", JSON.stringify({ version: 1, mode: "wheels", helmReturnToCenter: false }));
    localStorage.removeItem("regatta.race.briefing-seen.v1");
  } catch { /* storage may be unavailable */ }
};

/** Package 13: a device that steers the race with the on-screen arrows (the
 * default of a new install), the other race routes keep the stored wheels. */
const ARROWS_INIT = () => {
  try {
    localStorage.setItem("regatta.lang.v1", "ru");
    localStorage.setItem("regatta.onboarding.v1", "1");
    localStorage.setItem("regatta.v3.tour.v1", "1");
    localStorage.setItem("regatta.race.intro-seen.v1", "1");
    localStorage.setItem("regatta.race.helm.v1", "arrows");
    localStorage.removeItem("regatta.race.briefing-seen.v1");
  } catch { /* storage may be unavailable */ }
};

/** e2e/race-navigation.spec.ts startRace(), without the test runner. */
async function startRace(page, mode) {
  await page.goto(`${BASE}/game?embed=1`);
  await page.getByRole("heading", { name: "Гонка", exact: true }).waitFor({ timeout: 30_000 });
  await page.getByRole("button", { name: /^Первая гонка/ }).click();
  await page.getByRole("radio", { name: mode === "pro" ? "Pro" : "Простой", exact: true }).click();
  await page.getByRole("button", { name: /Начать первую гонку/i }).click();
  await page.getByRole("button", { name: /Готов - старт/ }).click();
  const scene = page.getByTestId("race-3d");
  await scene.locator("[data-scene-startup=ready]").waitFor({ timeout: 40_000 });
  const clock = page.getByTestId("race-time").locator("strong");
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline && /^0:00\.0$/.test((await clock.textContent()) ?? "")) await page.waitForTimeout(250);
}

/** Scroll a container through its full height, one screenful at a time. */
async function eachScroll(page, locator, fn) {
  const panel = page.locator(locator).first();
  if (!(await panel.count())) { await fn(""); return; }
  const { height, client } = await panel.evaluate(el => ({ height: el.scrollHeight, client: el.clientHeight }));
  const steps = client > 0 ? Math.min(12, Math.ceil(height / client)) : 1;
  for (let i = 0; i < steps; i++) {
    await panel.evaluate((el, top) => el.scrollTo({ top }), i * client);
    await fn(steps > 1 ? ` scroll ${i + 1}/${steps}` : "");
  }
  await panel.evaluate(el => el.scrollTo({ top: 0 }));
}

const ROUTES = [
  { id: "race-simple", run: async (browser, results) => raceRoute(browser, results, "simple") },
  { id: "race-pro", run: async (browser, results) => raceRoute(browser, results, "pro") },
  { id: "race-simple-arrows", run: async (browser, results) => raceRoute(browser, results, "simple", ARROWS_INIT) },
  { id: "race-pro-arrows", run: async (browser, results) => raceRoute(browser, results, "pro", ARROWS_INIT) },
  { id: "trainer", run: async (browser, results) => {
    const page = await newPage(browser, BASE_INIT);
    await page.goto(`${BASE}/simulator-v3?embed=1&lang=ru`);
    await page.locator("[data-scene-startup]").first().waitFor({ timeout: 40_000 });
    await page.waitForFunction(() => document.querySelector("[data-scene-startup]")?.getAttribute("data-scene-startup") !== "loading", null, { timeout: 40_000 }).catch(() => {});
    for (const view of ["3D", "Сверху"]) {
      if (view !== "3D") {
        await page.getByTestId("scene-view-button").click();
        await page.getByTestId("scene-drawer").first().getByRole("button", { name: view, exact: true }).click();
        await page.waitForTimeout(500);
      }
      await dockTabs(page, results, "trainer", view);
    }
    await page.context().close();
  } },
  { id: "basics", run: async (browser, results) => simpleRoute(browser, results, "basics", "/simulator?embed=1&lang=ru") },
  { id: "boat3d", run: async (browser, results) => simpleRoute(browser, results, "boat3d", "/simulator2?embed=1&lang=ru") },
  { id: "glossary", run: async (browser, results) => {
    const page = await newPage(browser, BASE_INIT);
    await page.goto(`${BASE}/glossary?lang=ru`);
    await page.waitForLoadState("networkidle").catch(() => {});
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    const steps = Math.min(10, Math.ceil(height / VIEWPORT.height));
    for (let i = 0; i < steps; i++) {
      await page.evaluate(top => scrollTo(0, top), i * VIEWPORT.height);
      await checkState(page, "glossary", `page ${i + 1}/${steps}`, results);
    }
    await page.context().close();
  } },
];

async function dockTabs(page, results, route, prefix) {
  const tabs = page.getByTestId("control-dock").getByRole("tab");
  const names = (await tabs.allTextContents()).map(s => s.trim()).filter(Boolean);
  if (!names.length) { await checkState(page, route, prefix, results); return; }
  for (const name of names) {
    await page.getByTestId("control-dock").getByRole("tab", { name, exact: true }).first().click();
    await eachScroll(page, '[data-testid="control-dock"] [role=tabpanel]', async (step) => checkState(page, route, `${prefix}: ${name}${step}`, results));
  }
  await page.getByTestId("control-dock").getByRole("tab", { name: names[0], exact: true }).first().click();
}

async function simpleRoute(browser, results, route, path) {
  const page = await newPage(browser, BASE_INIT);
  await page.goto(`${BASE}${path}`);
  await page.getByTestId("control-dock").waitFor({ timeout: 40_000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await dockTabs(page, results, route, "dock");
  await page.context().close();
}

async function raceRoute(browser, results, mode, init = BASE_INIT) {
  const route = `race-${mode}${init === ARROWS_INIT ? "-arrows" : ""}`;
  const page = await newPage(browser, init);
  await startRace(page, mode);
  const tabs = page.getByTestId("race-cockpit").locator("nav button");
  const names = (await tabs.allTextContents()).map(s => s.trim());
  // Race layout on a phone (audit K6): the scene keeps at least 60% of the
  // height, the dock (tabs and helm) at most 25%, the tabs one row inside the screen.
  const layout = await page.evaluate(() => {
    const box = (sel) => { const e = document.querySelector(sel); return e ? e.getBoundingClientRect() : null; };
    const scene = box('[data-testid="race-3d"]'), dock = box('[data-testid="race-cockpit"] aside');
    const nav = [...document.querySelectorAll('[data-testid="race-cockpit"] aside nav button')].map(b => b.getBoundingClientRect());
    return { vh: innerHeight, vw: innerWidth, scene: scene?.height ?? 0, dock: dock?.height ?? 0,
      rows: new Set(nav.map(r => Math.round(r.top))).size, right: Math.max(0, ...nav.map(r => r.right)) };
  });
  const layoutFindings = [];
  const flag = (detail) => layoutFindings.push({ kind: "race-layout", selector: "[data-testid=race-cockpit]", text: "", detail, count: 1 });
  if (layout.scene < layout.vh * 0.6) flag(`scene ${Math.round(layout.scene)}px < 60% of ${layout.vh}px`);
  if (layout.dock > layout.vh * 0.25 + 0.5) flag(`dock ${Math.round(layout.dock)}px > 25% of ${layout.vh}px`);
  if (layout.rows > 1) flag(`dock tabs in ${layout.rows} rows`);
  if (layout.right > layout.vw + 0.5) flag(`dock tabs reach ${Math.round(layout.right)}px in a ${layout.vw}px screen`);
  results.push({ route, state: "layout", findings: layoutFindings, png: await page.screenshot() });
  // The dock tabs, without the Auto switch (it is a control, not a tab).
  for (const [index, name] of names.slice(0, names.length - 1).entries()) {
    await tabs.nth(index).click();
    await eachScroll(page, '[data-testid="race-dock-panel"]', async (step) => checkState(page, route, `${name || "settings"}${step}`, results));
  }
  await tabs.first().click();
  await page.context().close();
}

const browser = await chromium.launch();
const results = [];
const failures = [];
for (const route of ROUTES) {
  if (ONLY && !ONLY.has(route.id)) continue;
  try { await route.run(browser, results); }
  catch (error) { failures.push(`${route.id}: ${error instanceof Error ? error.message.split("\n").slice(0, 3).join(" ") : String(error)}`); }
}
await browser.close();

const shotDir = process.env.CHECK_UI_SHOTS;
if (shotDir) {
  const fs = await import("node:fs");
  const path = await import("node:path");
  fs.mkdirSync(shotDir, { recursive: true });
  // Latin file names: the Cyrillic tab names are transliterated, the index keeps them unique.
  const lat = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ы: "y", э: "e", ю: "yu", я: "ya" };
  results.forEach((r, i) => {
    const name = `${String(i + 1).padStart(2, "0")}-${r.route}-${r.state}`.toLowerCase().replace(/[а-яё]/g, ch => lat[ch] ?? "").replace(/[^\w.-]+/g, "_");
    fs.writeFileSync(path.join(shotDir, `${name}.png`), r.png);
  });
}

let total = 0, printed = 0;
const perRoute = new Map();
for (const r of results) {
  for (const f of r.findings) {
    total++;
    perRoute.set(r.route, (perRoute.get(r.route) ?? 0) + 1);
    if (printed++ < MAX_PRINT) console.log(`${r.route} | ${r.state} | ${f.kind} | ${f.selector} | "${f.text}" | ${f.detail}${f.count > 1 ? ` (x${f.count})` : ""}`);
  }
}
const states = results.length;
console.log(`\ncheck:ui ${BASE} at ${VIEWPORT.width}x${VIEWPORT.height}: ${states} screen states, ${total} findings`);
for (const route of ROUTES) if (!ONLY || ONLY.has(route.id)) console.log(`  ${route.id}: ${perRoute.get(route.id) ?? 0}${results.some(r => r.route === route.id) ? "" : " (not reached)"}`);
for (const f of failures) console.log(`  could not check ${f}`);
process.exit(total || failures.length ? 1 : 0);
