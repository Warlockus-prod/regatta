"""Reproducible source scene and conservative hard-surface finish. Run in Blender."""
import bpy
import sys
from pathlib import Path
root = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(root / "public/models/regatta_sloop.glb"))
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene.unit_settings.scale_length = 1
scene["boat_class"] = "Regatta synthetic cruiser: LOA 13.8554 m, LWL 12.2 m, main 45 m2, jib 30 m2"
scene["runtime_cloth"] = "Cloth is generated from src/lib/sailing-physics/sail-plan.ts; retain imported rigs for attachments."
for obj in scene.objects:
    if obj.type == "MESH" and obj.name in ("Hull", "Cabin", "Deck") and not obj.data.shape_keys:
        bevel = obj.modifiers.new("Small manufactured edge radii", "BEVEL")
        bevel.width = .012
        bevel.segments = 2
        bevel.limit_method = "ANGLE"
        bevel.angle_limit = .6
        for poly in obj.data.polygons:
            poly.use_smooth = True
for name, xyz in {"Attachment_MainTack":(.4,0,2.7), "Attachment_JibTack":(6.3,0,1.5), "Attachment_JibHead":(.5,0,17.6433333333)}.items():
    obj=bpy.data.objects.new(name,None)
    obj.location=xyz
    scene.collection.objects.link(obj)
source=root / "assets/3d/regatta_sloop.blend"
source.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(source))
bpy.ops.export_scene.gltf(filepath=str(root / "public/models/regatta_sloop_refined.glb"), export_format="GLB", export_apply=True, export_extras=True)
print("REFINED_YACHT_EXPORTED")
