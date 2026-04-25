"""
Convert Bavaria 46 OBJ silhouettes into V3 SVG path strings, in V3's
local coordinate system.

V3 SceneTop boat coordinates:
  - Origin at the mast/deck centerline midship, y growing aft (down).
  - Current rough hull extents: x in [-38, +38], y in [-96, 160].
  - So total length ~256 px maps to ~13.9 m of OBJ length.
    Scale factor = 256 / 13.9 = 18.42 px / meter.
  - Conversion:
      V3.y = -OBJ.x * SCALE + Y_OFFSET   (OBJ x = stern->bow, V3 y bow=top)
      V3.x =  OBJ.y * SCALE
    With Y_OFFSET = (V3 stern y + V3 bow y) / 2 = (160 + -96) / 2 = 32

V3 SceneRear coordinates (from-behind transom view):
  - Hull centered around (0, 0) with rear-view scale matching the
    visible transom width.
  - Beam of 4.35m maps to ~220 px wide -> SCALE_REAR = 220/4.35 = 50.6
    (I'll keep transom modest since current implementation uses ~118
    half-beam, so I'll stick to 50 for a clean read at 600x600 SVG).
"""

import math

SCALE_TOP = 256.0 / 13.9        # ~18.42 px/m
Y_OFFSET_TOP = 32.0
SCALE_SIDE_X = 360.0 / 13.9     # ~25.9 - SceneSide HULL_LEN constant
SCALE_SIDE_Y = 25.9             # same vertical scale
SCALE_REAR = 50.0               # px/m for rear view


def to_v3_top(x_obj, y_obj):
    """OBJ (x, y) -> V3 SceneTop SVG (x, y)."""
    return (y_obj * SCALE_TOP, -x_obj * SCALE_TOP + Y_OFFSET_TOP)


def to_v3_side(x_obj, z_obj):
    """OBJ (x, z) -> V3 SceneSide SVG (x, y) in the rotated boat group.
    Bow is at positive x, mast goes up = negative y.
    """
    return (x_obj * SCALE_SIDE_X, -z_obj * SCALE_SIDE_Y)


def to_v3_rear(y_obj, z_obj):
    """OBJ (y, z) -> V3 SceneRear SVG (x, y) in the rotated boat group."""
    return (y_obj * SCALE_REAR, -z_obj * SCALE_REAR)


# Top-view hull convex hull from extract_silhouettes.py output, simplified
# to a smooth deck-plan path. Picked a representative subset of the 40
# hull vertices to keep the SVG path clean.
TOP_DECK = [
    # Stern centerline, going CCW around the deck
    (-6.950, -0.761),
    (-6.529, -1.542),  # transom corner (port)
    (-5.265, -1.892),  # widening
    (-3.580, -2.079),  # near max beam
    (-1.895, -2.175),  # max beam
    ( 0.211, -2.175),  # max beam carried forward
    ( 1.053, -2.120),
    ( 3.600, -1.860),
    ( 6.000, -0.775),
    ( 6.950, -0.033),
    # Bow tip
    ( 6.950,  0.033),
    # Returning aft on starboard
    ( 6.000,  0.775),
    ( 3.600,  1.860),
    ( 1.053,  2.120),
    ( 0.211,  2.175),
    (-1.895,  2.175),
    (-3.580,  2.079),
    (-5.265,  1.892),
    (-6.529,  1.542),
    (-6.950,  0.761),
]

# Side-view hull profile (sheer + bottom of hull)
# The hull's bottom curves up at bow + stern (sheer line). We sample.
SIDE_HULL_BOTTOM = [
    (-6.950, 0.102),  # transom bottom
    (-6.529, -0.068),
    (-5.265, -0.245),
    (-3.580, -0.372),
    (-1.895, -0.441),
    ( 0.000, -0.466),  # deepest point
    ( 1.895, -0.441),
    ( 3.580, -0.372),
    ( 5.265, -0.245),
    ( 6.108, -0.143),
    ( 6.529, -0.068),
    ( 6.950,  0.102),  # bow tip waterline
]
SIDE_DECK_TOP = [
    ( 6.950, 0.750),  # bow deck
    ( 3.900, 1.205),  # cabin top
    ( 1.300, 1.505),  # cabin top max
    (-3.500, 1.505),  # cabin top
    (-3.500, 0.855),  # cabin aft
    (-6.950, 0.750),  # stern deck
]

# Rear view transom (looking from astern)
REAR_TRANSOM = [
    (-2.175,  0.723),
    (-2.138,  0.376),
    (-2.028,  0.154),
    (-1.849, -0.026),
    (-1.607, -0.173),
    (-1.311, -0.290),
    (-0.969, -0.378),
    (-0.595, -0.437),
    (-0.201, -0.466),
    ( 0.201, -0.466),
    ( 0.595, -0.437),
    ( 0.969, -0.378),
    ( 1.311, -0.290),
    ( 1.607, -0.173),
    ( 1.849, -0.026),
    ( 2.028,  0.154),
    ( 2.138,  0.376),
    ( 2.175,  0.723),
]

# Keel side profile
KEEL_SIDE = [
    (-0.850, -0.620),
    (-0.405, -2.286),
    (-0.333, -2.393),
    (-0.226, -2.465),
    (-0.100, -2.490),
    ( 0.026, -2.465),
    ( 0.550, -2.150),
    ( 0.850, -0.620),
]

# Rudder side profile (the rudder at stern)
RUDDER_SIDE = [
    (-6.250, -1.650),
    (-5.750, -1.750),
    (-5.550, -0.650),
    (-6.050, -0.550),
]


def make_path(points, transform):
    parts = []
    for i, (a, b) in enumerate(points):
        x, y = transform(a, b)
        cmd = 'M' if i == 0 else 'L'
        parts.append(f'{cmd} {x:.1f} {y:.1f}')
    parts.append('Z')
    return ' '.join(parts)


print('======= V3 SceneTop hull (deck plan) =======')
print(make_path(TOP_DECK, to_v3_top))
print()
print('======= V3 SceneSide hull bottom (waterline curve) =======')
print(make_path(SIDE_HULL_BOTTOM, to_v3_side))
print()
print('======= V3 SceneSide deck top (sheer + cabin) =======')
print(make_path(SIDE_DECK_TOP, to_v3_side))
print()
print('======= V3 SceneRear transom (U-shape) =======')
print(make_path(REAR_TRANSOM, to_v3_rear))
print()
print('======= V3 SceneSide keel =======')
print(make_path(KEEL_SIDE, to_v3_side))
print()
print('======= V3 SceneSide rudder =======')
print(make_path(RUDDER_SIDE, to_v3_side))
print()
print('Coordinate scales:')
print(f'  TOP:   {SCALE_TOP:.2f} px/m, Y_offset {Y_OFFSET_TOP}')
print(f'  SIDE:  {SCALE_SIDE_X:.2f} px/m, Y scale {SCALE_SIDE_Y}')
print(f'  REAR:  {SCALE_REAR:.2f} px/m')
