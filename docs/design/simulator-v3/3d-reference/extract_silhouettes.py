"""
Extract V3-ready silhouettes from the Bavaria 46 lowpoly OBJ.

Reads the OBJ file, separates by named object, projects into:
  TOP   view: (x, -y)  -> X = forward, Y = port-to-starboard reversed for
                          screen coords (port left, starboard right).
  SIDE  view: (x,  z)  -> bow right, mast up.
  REAR  view: (y, -z)  -> port left, starboard right, mast up.

For each object, prints its bounding box and a coarse silhouette
(simplified convex outline) that can be pasted into the SVG.

Coordinate convention in the source OBJ:
  X axis: stern(-) to bow(+)
  Y axis: port/starboard (sign depends on hand)
  Z axis: vertical (up positive)
"""

import sys
import math
from collections import defaultdict


def parse_obj(path):
    objects = {}  # name -> list of (x, y, z)
    current = None
    verts = []  # global vertex list (1-indexed in OBJ)
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if line.startswith('o '):
                current = line[2:].strip()
                if current not in objects:
                    objects[current] = []
                continue
            if line.startswith('v '):
                parts = line.split()
                v = (float(parts[1]), float(parts[2]), float(parts[3]))
                verts.append(v)
                if current is not None:
                    objects[current].append(v)
    return objects, verts


def bbox(points):
    if not points:
        return None
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    zs = [p[2] for p in points]
    return {
        'x': (min(xs), max(xs)),
        'y': (min(ys), max(ys)),
        'z': (min(zs), max(zs)),
    }


def convex_hull(points):
    """2D convex hull via monotone chain. Returns ordered points."""
    pts = sorted(set(points))
    if len(pts) <= 2:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower = []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)

    upper = []
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)

    return lower[:-1] + upper[:-1]


def project_top(points):
    """Top view: x forward, y port/starboard. Screen y inverts."""
    return [(p[0], -p[1]) for p in points]


def project_side(points):
    """Side view: x forward, z up."""
    return [(p[0], p[2]) for p in points]


def project_rear(points):
    """Rear view: y -> port/starboard, z -> vertical."""
    return [(p[1], p[2]) for p in points]


def to_svg_path(hull_points):
    """Convert hull point list to an SVG path d string."""
    if not hull_points:
        return ''
    parts = [f'M {hull_points[0][0]:.3f} {hull_points[0][1]:.3f}']
    for x, y in hull_points[1:]:
        parts.append(f'L {x:.3f} {y:.3f}')
    parts.append('Z')
    return ' '.join(parts)


def main():
    objects, _ = parse_obj('/tmp/bavaria/bavaria_46_lowpoly_sloop.obj')

    # Group by component family for compact reporting.
    # Hull-related = the silhouette we care about for the SVG.
    hull_keys = ['01_hull_white_lowpoly']
    deck_keys = [k for k in objects if 'deck' in k or 'cockpit' in k]
    cabin_keys = [k for k in objects if 'cabin' in k or 'coachroof' in k]
    keel_keys = [k for k in objects if 'keel' in k]
    rudder_keys = [k for k in objects if 'rudder' in k]
    mast_keys = [k for k in objects if 'mast' in k]
    boom_keys = [k for k in objects if k.startswith('16_')]
    main_sail_keys = [k for k in objects if 'mainsail' in k and 'seam' not in k]
    jib_sail_keys = [k for k in objects if 'headsail' in k and 'seam' not in k]
    rigging_keys = [k for k in objects if 'rigging' in k]

    def collect(keys):
        all_pts = []
        for k in keys:
            all_pts.extend(objects.get(k, []))
        return all_pts

    print('=' * 60)
    print('Whole-boat bounding box')
    print('=' * 60)
    all_verts = []
    for v in objects.values():
        all_verts.extend(v)
    bb = bbox(all_verts)
    print(f"  X (stern->bow):   {bb['x'][0]:7.2f} .. {bb['x'][1]:7.2f}  (length {bb['x'][1]-bb['x'][0]:.2f} m)")
    print(f"  Y (beam):         {bb['y'][0]:7.2f} .. {bb['y'][1]:7.2f}  (beam   {bb['y'][1]-bb['y'][0]:.2f} m)")
    print(f"  Z (depth/height): {bb['z'][0]:7.2f} .. {bb['z'][1]:7.2f}  (height {bb['z'][1]-bb['z'][0]:.2f} m)")
    print()

    # Hull silhouette in each view
    sections = [
        ('Hull silhouette (TOP, deck plan)', collect(hull_keys + deck_keys), 'top'),
        ('Hull silhouette (SIDE, profile)', collect(hull_keys + deck_keys + cabin_keys), 'side'),
        ('Hull silhouette (REAR, transom)', collect(hull_keys), 'rear'),
        ('Keel (SIDE)', collect(keel_keys), 'side'),
        ('Rudder (SIDE)', collect(rudder_keys), 'side'),
        ('Cabin (SIDE)', collect(cabin_keys), 'side'),
        ('Mainsail (SIDE)', collect(main_sail_keys), 'side'),
        ('Jib (SIDE)', collect(jib_sail_keys), 'side'),
    ]

    for label, pts, view in sections:
        print('=' * 60)
        print(f'{label}  (n={len(pts)})')
        print('=' * 60)
        if not pts:
            print('  EMPTY')
            print()
            continue
        if view == 'top':
            proj = project_top(pts)
        elif view == 'side':
            proj = project_side(pts)
        elif view == 'rear':
            proj = project_rear(pts)
        else:
            proj = []
        bb2 = (
            min(p[0] for p in proj), max(p[0] for p in proj),
            min(p[1] for p in proj), max(p[1] for p in proj),
        )
        print(f'  bbox: x[{bb2[0]:.2f}, {bb2[1]:.2f}] y[{bb2[2]:.2f}, {bb2[3]:.2f}]')
        hull = convex_hull(proj)
        print(f'  hull points: {len(hull)}')
        # Print compactly for paste into SVG.
        print('  path d="', end='')
        print(to_svg_path(hull), end='')
        print('"')
        print()


if __name__ == '__main__':
    main()
