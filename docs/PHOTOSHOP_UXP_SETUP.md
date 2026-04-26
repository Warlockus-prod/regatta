# Photoshop UXP integration with Claude

How to drive Adobe Photoshop from Claude / Claude Code. Three approaches,
ordered by how invasive they are. Pick one based on what you actually
need automated.

---

## Approach A — `.jsx` scripts (simplest, no setup)

**Use when:** you need batch image processing (resize, export layers,
rename, watermark, color profile conversion). One-off jobs.

**How it works:**
1. Claude generates a `.jsx` file (ExtendScript - Adobe's classic JS API).
2. You run it in Photoshop: `File → Scripts → Browse...` → pick the file.
3. The script executes, you see results.

**No setup required.** ExtendScript ships with every Photoshop install.

**Example use cases:**
- "Export every layer in this PSD as a separate PNG, named after the layer."
- "Resize all open documents to 1920x1080 and save as JPG quality 85 next to the original."
- "Find every text layer that contains 'TODO' and turn it red."

**Limits:**
- ExtendScript is being deprecated by Adobe in favour of UXP. Still works
  in current Photoshop, but new features land in UXP first.
- One-shot only - no live two-way conversation with Claude during the
  script run.

---

## Approach B — UXP Plugin Panel (mid effort, daily-driver)

**Use when:** you do Photoshop work most days and want a panel inside
Photoshop where you can paste prompts, click buttons, and have Claude
generate / manipulate the doc on the spot.

**How it works:**
1. You install **Adobe UXP Developer Tool** (free; download from
   https://developer.adobe.com/photoshop/uxp/2022/guides/devtool/).
2. You install a UXP plugin built on top of Claude API (or any LLM)
   into Photoshop. The plugin appears as a panel under
   `Window → Plugins → <plugin name>`.
3. The panel is HTML/JS - it can call `require("photoshop").app` to
   read/write the document, AND it can call any HTTP API you want
   (Claude included).

**One-time setup (~15 min):**

1. Install the dev tool above.
2. Open Photoshop. `Plugins → Plugins Panel → Add Plugin (development)`.
3. Pick the plugin folder (we will write one).
4. Plugin shows up in `Window → Plugins`.

**The plugin we would write for the regatta project:**

A panel that takes a prompt and:
- Sends the active document's selection or current layer as a base64 image
  to Claude API
- Receives back instructions (e.g. "increase saturation 15%, add 5px
  white border")
- Applies them to the document via `require("photoshop").action.batchPlay`

This is what the user means by "AI-paint inside Photoshop" - same
ergonomics as Firefly Generative Fill but using Claude instead.

**Reference / starting point:**
- https://github.com/AdobeDocs/uxp-photoshop-plugin-samples (official samples)
- The `Hello-World-React` sample is a working bare-bones plugin you can
  fork. It shows the bundler config and the panel HTML.

**Cost:** dev time, plus Claude API calls per request. UXP itself is free
because you already have Photoshop.

---

## Approach C — Adobe MCP Server (most ambitious)

**Use when:** you want Claude inside Claude Code (this chat tool) to be
able to read/edit a Photoshop document the same way it edits files.

**How it works:**
- A community MCP server (`adobe-mcp` on PyPI, when it exists) sits between
  Claude Code and Photoshop.
- Claude Code connects to it via the user-scope `~/.claude.json` entry
  (the same way our `blender` MCP works).
- You launch Photoshop with a companion UXP plugin running. The plugin
  exposes a local HTTP/socket API.
- The MCP server proxies Claude's requests to that plugin: "open file X",
  "select layer Y", "run filter Z", "export as PNG to path P".

**Setup (~30 min):**

1. Verify the package exists. As of writing, search:
   ```bash
   pip search adobe-mcp        # or browse https://pypi.org/search/?q=adobe+mcp
   uv tool install adobe-mcp   # if it exists
   ```
   If no canonical package exists yet, this approach is **not ready** -
   skip and use Approach A or B.

2. Install the bridge UXP plugin in Photoshop (similar to Approach B).

3. Add to `~/.claude.json`:
   ```json
   "adobe": {
     "command": "uvx",
     "args": ["adobe-mcp"]
   }
   ```

4. Restart Claude Code. Run `/mcp` - should show `adobe` connected.

5. Now from Claude Code: "open ~/projects/poster.psd, increase contrast,
   export the result as poster-v2.png" - Claude does it through the MCP.

**Cost:** dev time to set up, plus the MCP itself depends on the
community maintaining it. Risk: project may go stale.

---

## Recommendation for this project (regatta)

**Don't set anything up unless you have a concrete recurring task.**
The regatta web app uses GLB textures baked in Blender; Photoshop isn't
on the critical path.

**If you DO need Photoshop later:** start with **Approach A** (jsx
scripts). I generate them for you as needed; you run them with one click.
If after a month you find yourself running 5+ scripts a week, upgrade
to **Approach B** (UXP panel - I'd write the panel code, you'd install
it once via UXP Developer Tool).

**Skip Approach C for now.** The MCP ecosystem for Photoshop is still
shaky and mixing experimental MCPs with paid Photoshop creates support
risk you don't want.

---

## Quick-start: have Claude write you a `.jsx` next time

In Claude Code, just ask:

> Write a Photoshop ExtendScript that opens every .jpg in
> `~/photos/regatta-2025/` and saves a 1600px-wide WebP next to it.

You get a file. Drop it into Photoshop via `File → Scripts → Browse`.
Done.
