"""Render one picture per yacht part from the editable scene (package 32: every subject has a
schematic and a picture, in every section that shows it).

Run after build_sailing_yacht.py:
  Blender --background assets/3d/regatta_sloop_sailing.blend --python scripts/blender/render_part_visuals.py -- OUT_DIR
Writes OUT_DIR/<part id>.png (960x720, the pictures), OUT_DIR/diagram-side.png and
diagram-top.png (the schematic drawings) and OUT_DIR/diagram.json (where each part is on them).
scripts/build-part-visuals.mjs turns them into the shipped files and checks that every part of
the shared anatomy data has both.

The parts and their anchor points are the AnatomyPoint_<id> empties the build script exports
from the shared anatomy data, so a part added there is rendered here without editing this file
(it gets the default view until a better one is listed in VIEWS).
"""
import bpy
import math
import sys
from pathlib import Path
from mathutils import Vector

out = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
out.mkdir(parents=True, exist_ok=True)
scene = bpy.context.scene

# A bright, even studio: the pictures sit on the app's paper theme next to line drawings.
for obj in list(bpy.data.objects):
    if obj.type in {"LIGHT", "CAMERA"} or obj.name.startswith("Studio floor"):
        bpy.data.objects.remove(obj, do_unlink=True)
# People are hidden: a part is easier to read without a figure in front of it.
for name in ["Helmsman", "Crew_Starboard", "Crew_Port"]:
    obj = bpy.data.objects.get(name)
    if obj:
        obj.hide_render = True

world = bpy.data.worlds.new("Part studio")
world.use_nodes = True
background = world.node_tree.nodes["Background"]
background.inputs["Color"].default_value = (.62, .76, .90, 1)
background.inputs["Strength"].default_value = .55
scene.world = world

sun_data = bpy.data.lights.new("Part sun", "SUN")
sun_data.energy = 2.4
sun_data.angle = .12
sun = bpy.data.objects.new("Part sun", sun_data)
scene.collection.objects.link(sun)
sun.rotation_euler = (Vector((0, 0, 0)) - Vector((6, -9, 14))).to_track_quat("-Z", "Y").to_euler()

floor_mat = bpy.data.materials.new("Part floor")
floor_mat.use_nodes = True
floor_bsdf = floor_mat.node_tree.nodes.get("Principled BSDF")
floor_bsdf.inputs["Base Color"].default_value = (.50, .64, .76, 1)
floor_bsdf.inputs["Roughness"].default_value = .9
bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, -2.3))
bpy.context.object.name = "Part floor"
bpy.context.object.data.materials.append(floor_mat)

scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 960
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - High Contrast"

# Per part: where the camera looks (x fore, y, z up; negative y is the side the camera stands on),
# where it stands, and the lens. The anchor of the shared data is the fallback target.
VIEWS = {
    "bow":       {"target": (5.6, 0, 1.2),      "camera": (13.5, -8.5, 4.0),  "lens": 50},
    "stern":     {"target": (-6.0, 0, 1.2),     "camera": (-13.0, -7.0, 3.8), "lens": 50},
    "mast":      {"target": (0.3, 0, 9.5),      "camera": (1.6, -15.5, 2.2),  "lens": 24},
    "boom":      {"target": (-2.3, 0, 2.6),     "camera": (-3.2, -11.5, 4.6), "lens": 50},
    "mainsail":  {"target": (-1.8, 0, 9.0),     "camera": (-15.0, -19.0, 6.5),"lens": 30},
    "jib":       {"target": (3.4, 0, 7.5),      "camera": (17.0, -13.0, 5.0), "lens": 30},
    "shrouds":   {"target": (0.3, -1.4, 6.0),   "camera": (6.5, -8.5, 2.6),   "lens": 35},
    "forestay":  {"target": (4.6, 0, 6.5),      "camera": (11.0, -17.0, 4.5), "lens": 32},
    "mainsheet": {"target": (-3.9, 0, 2.05),    "camera": (-8.2, -5.2, 4.2),  "lens": 60},
    "jib-sheet": {"target": (-1.2, -0.7, 2.0),  "camera": (-6.5, -7.0, 4.8),  "lens": 50},
    "winch":     {"target": (-3.4, -1.24, 1.3), "camera": (-4.7, -3.2, 2.2),  "lens": 85},
    "cleat":     {"target": (5.4, -1.0, 1.64),  "camera": (7.0, -2.6, 2.0),   "lens": 110},
    "rudder":    {"target": (-5.7, 0, -0.9),    "camera": (-12.0, -8.5, -0.4),"lens": 55},
    "keel":      {"target": (0, 0, -1.2),       "camera": (7.5, -15.0, -0.6), "lens": 50},
    "fender":    {"target": (-2.5, -2.0, 0.9),  "camera": (-5.0, -7.5, 2.1),  "lens": 70},
    "wheel":     {"target": (-4.3, 0, 2.25),    "camera": (-1.6, -3.4, 3.3),  "lens": 55},
    "cockpit":   {"target": (-3.1, 0, 1.5),     "camera": (-9.5, -5.5, 6.2),  "lens": 45},
}

camera_data = bpy.data.cameras.new("Part camera")
camera = bpy.data.objects.new("Part camera", camera_data)
scene.collection.objects.link(camera)
scene.camera = camera

rendered = []
for anchor in sorted((o for o in bpy.data.objects if o.name.startswith("AnatomyPoint_")), key=lambda o: o.name):
    part = anchor.name[len("AnatomyPoint_"):]
    view = VIEWS.get(part, {"target": tuple(anchor.location), "camera": tuple(anchor.location + Vector((7, -9, 4))), "lens": 50})
    camera.location = view["camera"]
    camera.rotation_euler = (Vector(view["target"]) - Vector(view["camera"])).to_track_quat("-Z", "Y").to_euler()
    camera_data.lens = view["lens"]
    scene.render.filepath = str(out / (part + ".png"))
    bpy.ops.render.render(write_still=True)
    rendered.append(part)

# The schematic: two orthographic drawings of the whole yacht (profile and plan) in flat colours
# with an outline, on a transparent ground, plus where every part's anchor lands in each of them.
# One drawing serves all parts: the page marks the part on it (src/components/anatomy/PartVisuals.tsx).
import json
from bpy_extras.object_utils import world_to_camera_view

bpy.data.objects["Part floor"].hide_render = True
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "FLAT"
scene.display.shading.color_type = "MATERIAL"
scene.display.shading.show_object_outline = True
scene.display.shading.object_outline_color = (.07, .16, .24)
scene.render.film_transparent = True
scene.render.image_settings.color_mode = "RGBA"
scene.view_settings.view_transform = "Standard"
scene.view_settings.look = "None"
camera_data.type = "ORTHO"
PX_PER_M = 60
DRAWINGS = {
    # name: where the camera stands, its rotation (profile: looking along +Y, bow to the right;
    # plan: looking down, bow up, starboard to the right) and the drawing's size in metres.
    "side": {"camera": (0, -60, 8.85), "rotation": (math.pi / 2, 0, 0),  "size": (15.6, 23.4)},
    "top":  {"camera": (0, 0, 60),     "rotation": (0, 0, -math.pi / 2), "size": (6.0, 15.6)},
}
# The cloth is nearly the paper's colour: in the drawing it gets a light blue so the sails read as shapes.
for name in ["Sail_Canvas_Draft", "Sail_Canvas"]:
    cloth = bpy.data.materials.get(name)
    if cloth:
        cloth.diffuse_color = (.74, .84, .93, 1)
diagram = {}
for name, d in DRAWINGS.items():
    width, height = d["size"]
    scene.render.resolution_x = round(width * PX_PER_M)
    scene.render.resolution_y = round(height * PX_PER_M)
    camera_data.ortho_scale = max(width, height)
    camera.location = d["camera"]
    camera.rotation_euler = d["rotation"]
    bpy.context.view_layer.update()
    scene.render.filepath = str(out / ("diagram-" + name + ".png"))
    bpy.ops.render.render(write_still=True)
    points = {}
    for anchor in (o for o in bpy.data.objects if o.name.startswith("AnatomyPoint_")):
        view = world_to_camera_view(scene, camera, anchor.matrix_world.translation)
        points[anchor.name[len("AnatomyPoint_"):]] = [round(view.x, 4), round(1 - view.y, 4)]
    diagram[name] = {"width": scene.render.resolution_x, "height": scene.render.resolution_y, "points": points}
(out / "diagram.json").write_text(json.dumps(diagram, indent=1, sort_keys=True))
print("PART_VISUALS_RENDERED=" + ",".join(rendered))
