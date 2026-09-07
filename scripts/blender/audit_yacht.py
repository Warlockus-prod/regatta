"""Read-only GLB inventory. Blender --background --python this_file -- model.glb."""
import bpy
import json
import sys
from mathutils import Vector

model_path = sys.argv[sys.argv.index("--") + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=model_path)
meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
rows = []
for obj in meshes:
    obj.data.calc_loop_triangles()
    corners = [obj.matrix_world @ Vector(p) for p in obj.bound_box]
    rows.append({
        "name": obj.name,
        "triangles": len(obj.data.loop_triangles),
        "materials": len(obj.data.materials),
        "min": [round(min(p[k] for p in corners), 4) for k in range(3)],
        "max": [round(max(p[k] for p in corners), 4) for k in range(3)],
    })
print("YACHT_AUDIT=" + json.dumps({
    "blender": bpy.app.version_string,
    "axes": "Blender Z-up; source GLB Y-up",
    "mesh_count": len(rows),
    "triangles": sum(row["triangles"] for row in rows),
    "material_slots": sum(row["materials"] for row in rows),
    "meshes": rows,
}))
