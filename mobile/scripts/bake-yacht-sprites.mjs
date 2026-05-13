#!/usr/bin/env node
/*
 * bake-yacht-sprites.mjs
 *
 * Bake a 16-frame top-down sprite atlas of the low-poly yacht GLB into
 * `mobile/assets/yacht-sprites/top-frame-NN.png`. The sprite atlas is the
 * "photo mode" source for `SkiaYacht` in modes where Skia rotation is
 * cheaper than rotating a single high-res image, or where we want to bake
 * lighting-correct shadows per heading.
 *
 * Sprint 8 status (2026-05-13):
 *   - Blender MCP was NOT connected during the sprint, so this script was
 *     written but not executed. The shipped `<SkiaYacht mode='photo'>`
 *     uses `mobile/assets/anatomy/yacht-top.png` as a single rotating
 *     sprite. When Blender MCP becomes available, run this script to
 *     replace the single sprite with a 16-frame atlas.
 *
 * Two ways to run this:
 *
 *   1. As a Blender headless render (preferred):
 *        blender --background --python mobile/scripts/bake-yacht-sprites.mjs
 *      Note: Blender's `--python` flag accepts `.py` only, so when running
 *      headless copy the inline `BLENDER_PY` block below into a temp .py
 *      file or use the inline `--python-expr` form. This module also
 *      doubles as documentation for the Python steps.
 *
 *   2. Through the Blender MCP runtime (what this repo uses normally):
 *        node mobile/scripts/bake-yacht-sprites.mjs --via-mcp
 *      In that mode the script prints the Python program; copy it to the
 *      Blender MCP `execute_blender_code` call site.
 *
 * Inputs:
 *   - GLB:  3d/regatta_anatomy_final_v8/models/lowpoly_mobile_v8.glb
 *   - Out:  mobile/assets/yacht-sprites/top-frame-00.png .. top-frame-15.png
 *           (256x256, transparent background, top-down ortho camera at +Z)
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..', '..');

const GLB_PATH = path.join(
  REPO_ROOT,
  '3d',
  'regatta_anatomy_final_v8',
  'models',
  'lowpoly_mobile_v8.glb',
);
const OUT_DIR = path.join(REPO_ROOT, 'mobile', 'assets', 'yacht-sprites');
const FRAME_COUNT = 16;
const FRAME_SIZE = 256;

const HEADINGS_DEG = Array.from({ length: FRAME_COUNT }, (_, i) =>
  (i * 360) / FRAME_COUNT,
);

const BLENDER_PY = `
import bpy, math, os
GLB_PATH = ${JSON.stringify(GLB_PATH)}
OUT_DIR = ${JSON.stringify(OUT_DIR)}
FRAME_SIZE = ${FRAME_SIZE}
HEADINGS_DEG = ${JSON.stringify(HEADINGS_DEG)}

os.makedirs(OUT_DIR, exist_ok=True)

# 1. Reset scene and import the GLB.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB_PATH)

# 2. Group all imported meshes under a single empty so we can rotate the
#    whole yacht by parenting.
yacht = bpy.data.objects.new('Yacht', None)
bpy.context.collection.objects.link(yacht)
for obj in list(bpy.data.objects):
    if obj.type == 'MESH' and obj.parent is None and obj is not yacht:
        obj.parent = yacht

# 3. Camera: orthographic, looking straight down (-Z).
cam_data = bpy.data.cameras.new('TopCam')
cam_data.type = 'ORTHO'
cam_data.ortho_scale = 14.0  # tune so hull fills ~85% of frame
cam = bpy.data.objects.new('TopCam', cam_data)
cam.location = (0.0, 0.0, 12.0)
cam.rotation_euler = (0.0, 0.0, 0.0)  # default look down -Z in render coords
bpy.context.collection.objects.link(cam)
bpy.context.scene.camera = cam

# 4. Sun light from above for even illumination.
light_data = bpy.data.lights.new('TopLight', type='SUN')
light_data.energy = 2.5
light = bpy.data.objects.new('TopLight', light_data)
light.location = (0.0, 0.0, 10.0)
light.rotation_euler = (0.0, 0.0, 0.0)
bpy.context.collection.objects.link(light)

# 5. Render settings: PNG with alpha, transparent film.
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.film_transparent = True
scene.render.resolution_x = FRAME_SIZE
scene.render.resolution_y = FRAME_SIZE
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'

# 6. For each heading, rotate the parent empty around Z and render.
for i, heading_deg in enumerate(HEADINGS_DEG):
    yacht.rotation_euler = (0.0, 0.0, math.radians(heading_deg))
    out_path = os.path.join(OUT_DIR, f'top-frame-{i:02d}.png')
    scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print(f'baked {out_path}')

print('done')
`;

function main() {
  const wantMcp = process.argv.includes('--via-mcp');
  if (wantMcp) {
    process.stdout.write(BLENDER_PY);
    return;
  }
  const lines = [
    'bake-yacht-sprites.mjs',
    '',
    `GLB:           ${GLB_PATH}`,
    `Output dir:    ${OUT_DIR}`,
    `Frame count:   ${FRAME_COUNT}`,
    `Frame size:    ${FRAME_SIZE}x${FRAME_SIZE} px`,
    `Headings (deg): ${HEADINGS_DEG.join(', ')}`,
    '',
    'This script prints the Python program for the Blender MCP runtime.',
    'Pipe `--via-mcp` to print only the Python:',
    '  node mobile/scripts/bake-yacht-sprites.mjs --via-mcp > /tmp/bake.py',
    '',
    'Or run headless:',
    '  blender --background --python /tmp/bake.py',
    '',
    'Sprint 8: Blender MCP was offline; sprite atlas not baked. The shipped',
    'photo mode in <SkiaYacht> uses the single yacht-top.png sprite instead.',
    'When Blender MCP is back online, run this script to bake the 16-frame',
    'atlas, drop the PNGs into mobile/assets/yacht-sprites/, and extend',
    '<SkiaYacht> to pick the closest frame to headingRad.',
  ];
  process.stdout.write(lines.join('\n') + '\n');
}

main();
