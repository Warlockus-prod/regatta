# Blender MCP setup

Status on this machine:

- `uv` and `uvx` are installed.
- `uvx blender-mcp` installs and starts the MCP server package.
- Blender is not installed yet, so MCP cannot connect to the Blender addon.
- Default Blender MCP socket: `localhost:9876`.

## Install Blender

Recommended local install on macOS:

```bash
brew install --cask blender
```

After install, confirm:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --version
```

## Run Blender MCP server

Run from a terminal after the Blender addon is enabled and running:

```bash
uvx blender-mcp
```

If Blender listens on a custom socket, pass environment variables:

```bash
BLENDER_HOST=localhost BLENDER_PORT=9876 uvx blender-mcp
```

## Project workflow

1. Open `public/models/Andryu_Yacht_ProductionReadyPrototype_v3.glb` in Blender.
2. Run the archive cleanup script if available:
   `Blender/01_Blender_Finalize_Asset.py`.
3. Verify normals, UVs, pivots, `COL_*`, `LOD0_*`, `LOD1_*`.
4. Export optimized GLB back into `public/models/`.
5. Recheck `/simulator-3d-lab` in the browser.

## Current asset issues to fix in Blender

- The GLB has no UV attributes.
- The GLB has no normal attributes, so the web lab computes normals at runtime.
- Pivot empties are described in metadata but are not baked into the GLB.
- Sail cloth is separate, but still needs production curvature and texture work.
- Static small meshes should be merged by material after visual approval.
