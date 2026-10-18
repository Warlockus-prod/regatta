"""iOS 27 App Store product page header (3840 x 1646, 21:9, no alpha, no text).

Usage: Blender -b --factory-startup -P scripts/blender/render_store_header.py -- \
  public/models/regatta_sloop_sailing.glb <out.png> <percent> <samples> <sun_rotation_deg>
Shipped header (2026-10-18): percent 100, samples 64, sun rotation 150.
The yacht sits in Apple's safe area (x 1097-2743, y 493-1154 of the full frame).
"""
import bpy, math, sys
from mathutils import Vector, Euler

glb, out, pct, samples, sunrot = sys.argv[-5], sys.argv[-4], int(sys.argv[-3]), int(sys.argv[-2]), float(sys.argv[-1])
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=glb)

# Group the imported yacht under one empty so we can heel and turn it as a whole.
root = bpy.data.objects.new("YachtRoot", None)
scene.collection.objects.link(root)
for o in list(scene.objects):
    if o is not root and o.parent is None:
        o.parent = root
root.rotation_euler = Euler((math.radians(-14), 0, math.radians(-38)), "XYZ")  # heel to leeward, 3/4 bow view
root.location = (0, 0, 0.15)

# Hide the helmsman figure: a header is not the place for a tiny person.
for o in scene.objects:
    if o.name.lower().startswith("helmsman"):
        o.hide_render = True

# Sea: large plane with the Ocean modifier.
bpy.ops.mesh.primitive_plane_add(size=2, location=(0, 0, 0))
sea = bpy.context.active_object
sea.name = "Sea"
oc = sea.modifiers.new("Ocean", "OCEAN")
oc.geometry_mode = "GENERATE"
oc.repeat_x = oc.repeat_y = 10
oc.spatial_size = 80
oc.resolution = 12
oc.wave_scale = 1.6
oc.choppiness = 1.5
oc.wind_velocity = 12
oc.wave_direction = math.radians(30)
sea.location = (-400, -400, 0)
bpy.ops.object.shade_smooth()
mat = bpy.data.materials.new("Water")
mat.use_nodes = True
bsdf = mat.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (0.004, 0.02, 0.04, 1)
bsdf.inputs["Roughness"].default_value = 0.06
bsdf.inputs["IOR"].default_value = 1.33
sea.data.materials.append(mat)

# Sky: physical sky, low sun behind and to the left of the camera's view.
world = bpy.data.worlds.new("Sky")
scene.world = world
world.use_nodes = True
nt = world.node_tree
sky = nt.nodes.new("ShaderNodeTexSky")
types = [i.identifier for i in sky.bl_rna.properties["sky_type"].enum_items]
for t in ("MULTIPLE_SCATTERING", "SINGLE_SCATTERING", "NISHITA"):
    if t in types:
        sky.sky_type = t
        break
sun_elev, sun_rot = math.radians(3.5), math.radians(sunrot)
if hasattr(sky, "sun_elevation"):
    sky.sun_elevation = sun_elev
    sky.sun_rotation = sun_rot
for attr, val in (("air_density", 1.0), ("dust_density", 2.5), ("ozone_density", 1.0)):
    if hasattr(sky, attr):
        setattr(sky, attr, val)
bg = nt.nodes["Background"]
bg.inputs["Strength"].default_value = 0.45
nt.links.new(sky.outputs["Color"], bg.inputs["Color"])

sun_data = bpy.data.lights.new("Sun", "SUN")
sun_data.energy = 3.5
sun_data.angle = math.radians(1.2)
sun_data.color = (1.0, 0.82, 0.62)
sun = bpy.data.objects.new("Sun", sun_data)
scene.collection.objects.link(sun)
sun.rotation_euler = Euler((math.radians(90) - sun_elev, 0, sun_rot + math.radians(90)), "XYZ")

# Camera: low, wide, yacht centred in the safe area.
cam_data = bpy.data.cameras.new("Cam")
cam_data.lens = 40
cam_data.sensor_width = 36
cam = bpy.data.objects.new("Cam", cam_data)
scene.collection.objects.link(cam)
cam.location = (0, -132, 2.6)
target = Vector((0, 0, 9.4))
cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.camera = cam

r = scene.render
r.engine = "CYCLES"
r.resolution_x, r.resolution_y, r.resolution_percentage = 3840, 1646, pct
r.image_settings.file_format = "PNG"
r.image_settings.color_mode = "RGB"  # no alpha channel (Apple rejects alpha)
r.film_transparent = False
scene.cycles.samples = samples
scene.cycles.use_denoising = True
try:
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "METAL"
    prefs.get_devices()
    for d in prefs.devices:
        d.use = True
    scene.cycles.device = "GPU"
except Exception as e:  # CPU fallback
    print("GPU unavailable:", e)
try:
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
except Exception:
    pass
r.filepath = out
bpy.ops.render.render(write_still=True)
print("RENDERED", out)
