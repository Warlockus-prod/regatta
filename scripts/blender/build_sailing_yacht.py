"""Build an editable sailing asset and real Blender renders from shared sail samples.
Run export_sail_shapes.mjs first, then Blender --background --python this.py -- ROOT.
"""
import bpy
import json
import math
import sys
from pathlib import Path
from mathutils import Vector

root = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
out = root / "docs/design/audits/sailing-2026-09-08"
out.mkdir(parents=True, exist_ok=True)
shapes = json.loads((root / "assets/3d/sail-shapes.json").read_text())
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(root / "public/models/regatta_sloop.glb"))
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene["design_basis"] = "Synthetic cruiser, LOA 13.8554 m. Flat sail areas: main 45 m2, jib 30 m2. Not sea-trial calibrated."
scene["sail_source"] = "Runtime sailPoint sampled by scripts/blender/export_sail_shapes.mjs. Shape keys are absolute alternatives, use one at a time."

def xyz(p):
    return Vector((p[0], -p[2], p[1]))

def material(name, color, roughness=.65, metallic=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bs = mat.node_tree.nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value = (*color, 1)
    bs.inputs["Roughness"].default_value = roughness
    bs.inputs["Metallic"].default_value = metallic
    return mat

steel = material("Standing_Rigging_Steel", (.16,.19,.21), .42, .7)
spar = material("Anodised_Spar", (.37,.41,.43), .35, .7)
# Replace the malformed joined rigging, whose bounds extended below the keel.
for name in ["Rigging", "Battens", "SailNumber", "Main_Telltales", "Jib_Telltales", "Running_Rigging", "Boom"]:
    obj = bpy.data.objects.get(name)
    if obj:
        bpy.data.objects.remove(obj, do_unlink=True)

# Tubes built in world metres, then optionally parented while preserving placement.
def tubes(name, paths, radius, mat, parent=None):
    verts, faces = [], []
    for path in paths:
        for start, end in zip(path, path[1:]):
            a, b = xyz(start), xyz(end)
            direction = (b-a).normalized()
            helper = Vector((0,0,1)) if abs(direction.z) < .95 else Vector((0,1,0))
            u = direction.cross(helper).normalized() * radius
            v = direction.cross(u).normalized() * radius
            offset = len(verts)
            for center in [a,b]:
                verts.extend([center + math.cos(i*math.tau/8)*u + math.sin(i*math.tau/8)*v for i in range(8)])
            for i in range(8):
                j = (i+1)%8
                faces.append((offset+i,offset+j,offset+8+j,offset+8+i))
            faces.extend([tuple(offset+i for i in reversed(range(8))),tuple(offset+8+i for i in range(8))])
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    if parent:
        obj.parent = parent
        obj.matrix_parent_inverse = parent.matrix_world.inverted()
    for p in mesh.polygons:
        p.use_smooth = True
    return obj

jib_tack = [6.3,1.5,0]
jib_head = [6.3 + shapes["plan"]["jib"]["luffOffset"],1.5 + shapes["plan"]["jib"]["height"],0]
paths = [[jib_tack,jib_head], [[.3,19.7,0],[-5.95,2.5,0],[-6.1,1.55,-.6]], [[-5.95,2.5,0],[-6.1,1.55,.6]]]
for side in [-1,1]:
    paths += [[[.3,19.65,0],[.3,13.2,side*1.45],[.3,7.8,side*1.45],[-.05,1.6,side*1.8]],
              [[.3,7.8,0],[.8,1.6,side*1.8]]]
tubes("Rigging", paths, .014, steel)
# Boom matches the main tack/clew, rather than the old skewed box.
tubes("Boom", [[[.3,2.62,0],[-4.8,2.78,0]]], .095, spar, bpy.data.objects["MainRig"])
for name, p in {"Attachment_MainTack":[.4,2.7,0],"Attachment_MainClew":[-4.8,2.86,0],"Attachment_JibTack":jib_tack,"Attachment_JibHead":jib_head}.items():
    obj = bpy.data.objects.new(name,None)
    obj.location = xyz(p)
    obj.empty_display_size = .15
    scene.collection.objects.link(obj)

# Woven cloth markings in UV space: stay on both sides of the deformed runtime cloth.
size = 768
image = bpy.data.images.new("Sail_Draft_Stripes", width=size, height=size)
pixels = []
for y in range(size):
    v = y/(size-1)
    for x in range(size):
        u = x/(size-1)
        c = (.91,.90,.85)
        if min(u,1-u) < .016 or v < .012:
            c = (.75,.76,.72)
        if (u/.23)**2 + (v/.09)**2 < 1 or ((1-u)/.24)**2 + (v/.095)**2 < 1 or v > .955:
            c = (.82,.83,.78)
        if .055 < u < .965 and any(abs(v-h) < .0035 for h in [.25,.5,.75]):
            c = (.16,.22,.25)
        # Short batten pockets at the leech; all markings deform with the mesh.
        if u > .64 and any(abs(v-h) < .0018 for h in [.22,.44,.66,.84]):
            c = (.61,.64,.62)
        pixels.extend((*c,1))
image.pixels = pixels
image.pack()
cloth = material("Sail_Canvas_Draft", (.91,.90,.85), .72)
nodes = cloth.node_tree.nodes
tex = nodes.new("ShaderNodeTexImage")
tex.image = image
cloth.node_tree.links.new(tex.outputs["Color"], nodes.get("Principled BSDF").inputs["Base Color"])
for kind, name in [("main","MainSail"),("jib","Jib")]:
    obj = bpy.data.objects[name]
    obj.shape_key_clear()
    data = shapes["sails"][kind]
    def coords(values):
        return [xyz(values[i:i+3]) for i in range(0,len(values),3)]
    indices = data["indices"]
    mesh = bpy.data.meshes.new(name + "_SharedCloth")
    mesh.from_pydata(coords(data["positions"]["Basis"]), [], [indices[i:i+3] for i in range(0,len(indices),3)])
    obj.data = mesh
    uv = mesh.uv_layers.new(name="SailUV")
    for loop in mesh.loops:
        i = loop.vertex_index*2
        uv.data[loop.index].uv = data["uv"][i:i+2]
    mesh.materials.append(cloth)
    for key, values in data["positions"].items():
        block = obj.shape_key_add(name=key)
        block.value = 0
        for vertex, co in zip(block.data, coords(values)):
            vertex.co = co
    obj["planform_area_m2"] = shapes["plan"][kind]["area"]
    obj["draft_position_fraction"] = .45 if kind == "main" else .38
    for p in mesh.polygons:
        p.use_smooth = True

for name in ["Hull","Cabin"]:
    obj = bpy.data.objects.get(name)
    bevel = obj.modifiers.new("Manufactured edge radius", "BEVEL")
    bevel.width = .012
    bevel.segments = 2
    bevel.limit_method = "ANGLE"
    bevel.angle_limit = .6
    # Preserve planar cabin faces and hull hard chine shading.

# Finish the surfaces and deck fittings at real metre scale.
gelcoat = material("Gelcoat_White_Polished", (.86,.89,.9), .3)
teak = material("Teak_Deck_Finished", (.36,.23,.12), .78)
rubber = material("Fender_Rubber", (.8,.83,.81), .9)
glass = material("Marine_Glass", (.035,.095,.13), .18, .25)
for obj in list(scene.objects):
    if obj.type != "MESH":
        continue
    for slot in obj.material_slots:
        if slot.material and slot.material.name == "Teak_Deck":
            slot.material = teak
        elif slot.material and slot.material.name == "Gelcoat_White":
            slot.material = gelcoat
        elif slot.material and slot.material.name == "Glass_Tinted":
            slot.material = glass
hull = bpy.data.objects["Hull"]
for poly in hull.data.polygons:
    poly.use_smooth = True
normal = hull.modifiers.new("Weighted hull normals", "WEIGHTED_NORMAL")
normal.keep_sharp = True

def rounded_box(name, position, dimensions, mat, bevel=.03):
    bpy.ops.mesh.primitive_cube_add(size=1, location=xyz(position))
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = (dimensions[0], dimensions[2], dimensions[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    edge = obj.modifiers.new("Rounded manufactured edges", "BEVEL")
    edge.width = bevel
    edge.segments = 3
    obj.modifiers.new("Face normals", "WEIGHTED_NORMAL")
    return obj

# Seat slats make the cockpit recess readable without filling the footwell.
for side in [-1,1]:
    for i in range(3):
        rounded_box("Cockpit_Seat_%s_%s" % (side,i),[-3.0,1.47,side*(.6+i*.12)], [3.2,.06,.105],teak,.014)
    tubes("Cabin_Handrail_%s" % side,[[[.6,2.28,side*.82],[2.2,2.28,side*.82]]],.025,steel)
    # Horn cleats at the bow, with a readable base and two horns.
    rounded_box("Bow_Cleat_Base_%s" % side,[5.4,1.57,side], [.22,.045,.1],steel,.018)
    tubes("Bow_Cleat_%s" % side,[[[5.4,1.58,side],[5.4,1.68,side]],[[5.22,1.68,side],[5.58,1.68,side]]],.025,steel)
for i,x in enumerate([.45,1.55,2.65]):
    rounded_box("Hatch_Frame_%s" % i,[x,2.2,0],[.7,.055,.65],spar,.045)
    rounded_box("Hatch_Glass_%s" % i,[x,2.235,0],[.59,.018,.54],glass,.035)
# Static teaching lines and fenders are hidden by the sailing runtime.
tubes("Anatomy_Sheets",[[[-3.1,1.3,-.25],[-4.8,2.86,0]],[[2.25,2.55,0],[-3.4,1.34,-1.15]],[[2.25,2.55,0],[-3.4,1.34,1.15]]],.018,material("Sheet_Braid",(.66,.58,.38),.9))
for side in [-1,1]:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, location=xyz([-2.5,.9,side*2.04]))
    fender = bpy.context.object
    fender.name = "Anatomy_Fender_%s" % side
    fender.scale = (.14,.14,.5)
    fender.data.materials.append(rubber)
    for poly in fender.data.polygons:
        poly.use_smooth = True
    tubes("Anatomy_Fender_Line_%s" % side,[[[-2.5,1.85,side*1.95],[-2.5,1.35,side*2.04]]],.012,steel)

# Named teaching anchors are exported with the exact offline/shared coordinates.
for part in json.loads((root / "mobile/src/data/anatomy.json").read_text())["anatomyParts"]:
    if "three" not in part:
        continue
    point = part["three"]
    anchor = bpy.data.objects.new("AnatomyPoint_" + part["id"],None)
    anchor.location = (point["x"],point["y"],point["z"])
    anchor.empty_display_size = .1
    scene.collection.objects.link(anchor)

# Export the game asset before adding the presentation stage.
bpy.ops.export_scene.gltf(filepath=str(root / "public/models/regatta_sloop_sailing.glb"), export_format="GLB", export_apply=True, export_extras=True)
meshes = [o for o in scene.objects if o.type == "MESH"]
for obj in meshes:
    obj.data.calc_loop_triangles()
rig = bpy.data.objects["Rigging"]
corners = [rig.matrix_world @ Vector(p) for p in rig.bound_box]
(out / "blender-build.json").write_text(json.dumps({"blender":bpy.app.version_string,"mesh_count":len(meshes),"triangles":sum(len(o.data.loop_triangles) for o in meshes),"rigging_bounds_zup":{"min":[min(v[k] for v in corners) for k in range(3)],"max":[max(v[k] for v in corners) for k in range(3)]},"sail_areas":{k:shapes["plan"][k]["area"] for k in ["main","jib"]},"shape_keys":list(shapes["sails"]["main"]["positions"])},indent=2))

scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 24
scene.cycles.use_denoising = True
scene.render.resolution_x = 1200
scene.render.resolution_y = 1200
scene.render.resolution_percentage = 100
scene.world = bpy.data.worlds.new("Studio world")
scene.world.color = (.23,.27,.32)
scene.view_settings.view_transform = "AgX"
stage = bpy.data.collections.new("Presentation_only_not_exported")
scene.collection.children.link(stage)
def stage_link(obj):
    for coll in list(obj.users_collection):
        coll.objects.unlink(obj)
    stage.objects.link(obj)
for name, pos, energy, size in [("Key",(6,-10,24),3800,12),("Fill",(-8,7,17),2400,10)]:
    data = bpy.data.lights.new(name,"AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    obj = bpy.data.objects.new(name,data)
    stage.objects.link(obj)
    obj.location = pos
    obj.rotation_euler = (Vector((0,0,9))-obj.location).to_track_quat("-Z","Y").to_euler()
bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,-2.25))
plane = bpy.context.object
plane.name = "Studio floor (not water)"
plane.data.materials.append(material("Studio slate",(.055,.095,.12),.85))
stage_link(plane)
for name, pos in [("Side",(0,-40,10)),("ThreeQuarter",(27,-38,19)),("Stern",(-35,-12,15))]:
    data = bpy.data.cameras.new(name)
    data.type = "ORTHO"
    data.ortho_scale = 26
    camera = bpy.data.objects.new(name,data)
    stage.objects.link(camera)
    camera.location = pos
    camera.rotation_euler = (Vector((0,0,8.8))-camera.location).to_track_quat("-Z","Y").to_euler()
    scene.camera = camera
    scene.render.filepath = str(out / (name.lower()+".png"))
    bpy.ops.render.render(write_still=True)
scene.camera = bpy.data.objects["ThreeQuarter"]
for area in bpy.context.screen.areas:
    if area.type == "VIEW_3D":
        area.spaces.active.region_3d.view_perspective = "CAMERA"
bpy.ops.wm.save_as_mainfile(filepath=str(root / "assets/3d/regatta_sloop_sailing.blend"))
print("SAILING_YACHT_BUILT_AND_RENDERED")
