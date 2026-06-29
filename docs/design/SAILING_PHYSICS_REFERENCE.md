# Sailing Physics and Boat Anatomy: Scientific Reference

Reference documentation for the "Week to Regatta" training app. This document
synthesizes eight cited research briefs into one engineering reference. It drives
two concrete deliverables:

1. fixes to the 3D Blender boat model (geometry, proportions, materials), and
2. corrections to the V3 trim-physics engine (force model, heel, helm, polars).

Target boat throughout: a modern cruising sloop of roughly 13.9 m length overall
(about 45 ft), fin keel with bulb, near-masthead fractional rig. Where a brief
quotes data for a 40-46 ft / 12-14 m boat, that data is treated as applicable to
our target hull.

Typography note: this file uses ASCII hyphens only, plain ASCII quotes, no
em-dash or en-dash, per project rules.

---

## 1. Executive Summary: Physical Facts a Sailing Sim MUST Get Right

These are the load-bearing facts. Every later section expands one of them.

1. **A sail is a cambered airfoil, not a parachute.** Upwind it works by lift
   (suction on the leeward side dominates), not by wind pushing on the back.
   The popular "equal transit time" Bernoulli story is wrong; lift comes from
   circulation set by angle of attack plus camber, fixed by the Kutta condition
   at the trailing edge (leech).

2. **Sails feel apparent wind, not true wind.** Apparent wind is the vector sum
   of true wind and the boat-motion headwind. It is stronger and further forward
   than true wind upwind, and weaker than true wind dead downwind. All trim and
   all force generation target apparent wind.

3. **The same total sail force splits two ways.** Resolved against the wind it is
   lift plus drag; resolved against the boat heading it is drive plus side
   (heeling) force. Upwind, the force points nearly abeam, so most of it is side
   force and only a small projection is drive. This is why upwind needs a good
   keel and produces the most heel. Downwind the force points along the course,
   so it is almost all drive with little heel.

4. **Force scales with the square of apparent wind speed and linearly with sail
   area.** `F = C * 0.5 * rho * V_A^2 * A`. A 1.5x gust is a 2.25x force spike.
   This single relationship governs drive, heel, and rudder/keel forces.

5. **Heel is an equilibrium between heeling moment and righting moment.** The boat
   rolls to leeward until `displacement * GZ(phi) = side_force * lever_height`.
   Heel rises with the square of wind, falls toward downwind points of sail, and
   drops when reefed or twisted open. Cruisers sail best at 10-20 degrees;
   30 degrees is the "reduce sail now" line.

6. **The boat crabs sideways (leeway).** The keel only makes lift by meeting the
   water at the leeway angle (its angle of attack), typically 3-5 degrees
   close-hauled, near zero off the wind. Steady state: keel side force equals
   sail side force.

7. **A boat cannot sail into the wind.** The no-go zone is about 40-45 degrees
   either side of the true wind for a cruiser (a dead zone roughly 80-90 degrees
   wide). The closest pointing angle equals the sum of the two foil drag angles:
   `beta_min = epsilon_aero + epsilon_hydro`.

8. **A little weather helm is correct; too much is a brake.** Target 3-5 degrees.
   Weather helm rises with heel. CE aft of CLR causes it; CE forward causes
   (dangerous) lee helm.

9. **Displacement hulls are speed-capped near hull speed.** `hull_speed_kn =
   2.43 * sqrt(LWL_m) = 1.34 * sqrt(LWL_ft)`. For our hull this is about
   8.4-8.8 kn. Wave-making drag rises near-vertically as the boat approaches it.

10. **The mainsail is the primary sail on a modern rig.** On a near-masthead
    fractional cruiser the main is the taller and (with a working jib) the larger
    sail. A headsail only dwarfs the main on an old true-masthead rig flying a
    150 percent-plus genoa. Our model must NOT show that.

---

## 2. Sail Aerodynamics

### 2.1 How a sail makes force

A sail is a thin, flexible, highly cambered airfoil. The wind develops a total
aerodynamic force `F_T` on it. Resolved relative to the apparent wind `V_A`:

- **Lift L**: component perpendicular (90 degrees) to apparent wind.
- **Drag D**: component parallel to apparent wind.

Lift arises from a pressure difference: average windward pressure exceeds leeward
("suction") pressure. The curved airflow around the cambered sail sets up a
pressure gradient across the streamlines, lower on the convex leeward side. On a
well-trimmed upwind sail most of the drive comes from leeward suction, not
windward push.

In inviscid theory, lift per unit span is the Kutta-Joukowski result:

```
L' = rho * V * Gamma
```

where `Gamma` is circulation, fixed physically by the Kutta condition (flow must
leave the sharp leech smoothly). Angle of attack plus camber set the circulation;
the asymmetric velocity field produces the pressure difference; the integrated
pressure difference is the lift. This is the same mechanism as an aircraft wing.

**Misconception to avoid in any explainer UI:** the "equal transit time" story is
false. Leeward air actually reaches the leech ahead of windward air. Bernoulli
relates the resulting velocities to pressures but does not explain why they
differ.

**Coefficient form.** Forces non-dimensionalize as:

```
C = F / (0.5 * rho * V_A^2 * A)
```

giving `C_L` (force perpendicular to flow) and `C_D` (force in line with flow),
with `A` = sail area. Both are functions of angle of attack `alpha` (chord vs
apparent wind) and aspect ratio (luff length / mean chord). Total drag = induced
drag (penalty of making lift, falls with higher aspect ratio) plus parasitic drag
(skin friction plus pressure drag). As `alpha` rises, `C_L` and induced drag rise
until stall.

### 2.2 Apparent wind vs true wind

A sail never feels true wind. It feels apparent wind:

```
V_A = V_T - V_B    (vector)
```

Scalar form with `W` = true wind speed, `V` = boat speed, `alpha` = true wind
angle (0 = dead upwind, 180 = dead downwind):

```
A    = sqrt( W^2 + V^2 + 2*W*V*cos(alpha) )           (apparent wind speed)
beta = arccos( (W*cos(alpha) + V) / A )               (apparent wind angle off bow)
```

Inverse (recover true wind from measured A, beta, V):

```
W = sqrt( A^2 + V^2 - 2*A*V*cos(beta) )
```

Consequences:
- Upwind/close-hauled: apparent wind is faster and further forward than true wind;
  sails sheet in hard; the boat sails at an apparent angle much narrower than its
  true wind angle.
- Dead downwind: `alpha = 180`, so `A = W - V`. Apparent wind is weaker than true
  wind; a displacement boat can never exceed true wind speed dead downwind.

**Wind gradient (shear).** Wind speed grows with height by a power law:

```
V(h) = V(h0) * (h / h0)^p
```

with `p` about 0.11 over open ocean to 0.31 over land. A 10 kn wind at 3 m can be
about 12 kn at 15 m. Two effects: stronger wind aloft raises the center of effort
and heeling moment; and because boat speed is the same at every height while true
wind grows, the apparent wind both strengthens and frees (shifts aft) with height.
This is the physical justification for sail **twist** (Section 3).

### 2.3 Drive vs heel (side) force, by point of sail

The same `F_T` resolves in a boat-fixed frame:

- **Driving force F_R**: along the heading; overcomes hull drag.
- **Lateral (side) force F_LAT**: athwartships; resisted by the keel, produces
  leeway and (acting above the water against the keel below) the heeling moment.

L/D and F_R/F_LAT are two decompositions of one vector. How `F_T` splits depends
entirely on the angle `theta` between `F_T` and the heading:

```
F_R   = F_T * cos(theta)
F_LAT = F_T * sin(theta)
```

| Point of sail | Approx true wind angle | Dominant component |
|---|---|---|
| Luffing / no-go zone | 0-30 deg (no useful drive to ~40-50 deg) | none (sails flog) |
| Close-hauled (beating) | 30-50 deg | lift |
| Beam reach | ~90 deg | lift |
| Broad reach | ~135 deg | lift + drag |
| Running (dead downwind) | 180 deg | drag |

Upwind, `theta` is large, so `sin(theta) >> cos(theta)`: most force is side force,
little is drive. This is why upwind needs an efficient keel and heels the most, and
why high lift-to-drag ratio matters most upwind. As the boat bears away, `F_T`
rotates toward the course, drive grows, heel falls. A **beam reach is typically the
fastest point of sail**: a large fraction of a still-strong lift-dominated force
projects onto drive at moderate heel.

Dead downwind the mechanism inverts: attached-flow lift collapses, the sail
operates stalled, and force comes mainly from drag (windward pressure). `F_T`
points almost straight down the course, so it is nearly all drive with little heel.
A drag device cannot outrun the wind; a lift device (reaching) can exceed true wind
speed.

### 2.4 The slot effect (jib and main interaction)

The gap between the jib leech and the main's leeward surface is the **slot**. The
interaction is real and beneficial, but the old explanation is wrong.

**Discredited Venturi myth:** that the slot is a nozzle that accelerates the air to
"blow away" the main's boundary layer. Per Arvel Gentry (1981 AIAA), the slot is
NOT a Venturi; closing it slows the flow and promotes separation.

**Current understanding (after Gentry):**
1. Air in the slot is actually slowed and its pressure raised. This higher pressure
   on the forward lee of the main reduces the adverse pressure gradient its
   boundary layer must climb, delaying/reducing mainsail stall.
2. The main in turn lowers pressure on the lee of the jib, accelerating jib lee
   flow and raising the jib's lift and efficiency.
3. The main's upwash bends the oncoming flow, increasing the effective angle at the
   jib luff, letting the jib (and the boat) point higher before luffing.

**Backwinding** (a bubble/reversed curve in the forward 20-40 percent of the main's
lee side) is NOT the slot working. It is a trim imbalance that closed the slot too
far. A little is accepted upwind in exchange for a high-pointing genoa; chronic
heavy backwind means the slot is over-closed (genoa over-trimmed or sheeted too
far inboard, or the main not eased/twisted enough). The cure is to open the slot.

### 2.5 Stall and luffing

A sail makes its design force only within a working band of `alpha`.

- **Luffing (alpha too small):** sail eased too far or steered too close to the
  wind, so the leading edge cannot hold the pressure difference; the luff goes
  slack and flogs. In the no-go zone (within about 40-50 degrees of true wind) the
  sails cannot make useful propulsion. Fix: increase `alpha` (sheet in, or bear
  away).
- **Stall (alpha too large):** beyond the critical angle the leeward boundary layer
  separates; lift drops abruptly and pressure drag rises sharply. Fix: reduce
  `alpha` (ease sheet, or head up).

Sails on a broad reach to a run operate fully stalled by design; downwind the goal
is maximum drag, so separation is desirable. Upwind, separation is the enemy and
the whole game is holding the highest `C_L` without stalling. The instrument for
finding that optimum is the telltale.

### 2.6 Telltales

A streaming telltale = attached flow; a lifting/spiraling telltale = separation on
that side. Response: always act to re-attach the misbehaving side.

**Jib luff telltales** (pair, one each side, 10-20 percent of chord aft of luff) -
steering/angle-of-attack guide:
- Windward telltale lifts/dances -> alpha too small (pinching or under-trimmed);
  bear away or sheet in.
- Leeward telltale stalls/spirals -> alpha too large (too low or over-trimmed);
  head up or ease.
- Both streaming -> correct.
- Memory aid: "tiller toward the tattling tail." Windward dancing is acceptable
  when overpowered (feathering sheds heel); leeward stall is essentially never ok.

**Jib leech telltale** (15-30 percent down from head) - sheet-tension/stall guide:
keep it flowing at least about 80 percent of the time. If it stalls (curls to
leeward), the sail is too tight; ease the sheet or move the lead aft.

**Mainsail leech telltales** (one per batten pocket, all but the top) -
twist/mainsheet-and-vang guide. Upwind they should stream most of the time:
- Top leech telltale stalls and hides behind the sail -> upper leech too
  tight/hooked; ease mainsheet (or ease vang to add twist).
- Top telltale streams hard and never stalls -> leech too open; trim on.
- Target upwind: top leech telltale flowing roughly 50-80 percent of the time, on
  the edge of stalling.

Unifying rule: every telltale reports attached-or-separated on a patch of sail;
correct by changing the boat's angle to the wind (steer) and/or the sail's angle to
the wind (trim).

---

## 3. Sail Shape and Trim Controls

### 3.1 The four shape parameters

**Draft depth (camber):** max distance from chord line to sail curve, as a percent
of chord.
- Flat: about 7-10 percent. Full/powerful: about 15-17 percent. Cruising default:
  about 15 percent. Deepest low-to-mid, flatter near the head.
- More camber = more lift AND more drag, force vector further forward, more heel.
  Full for power (light air, chop, underpowered); flat for pointing and depowering.

**Draft position:** chordwise location of max draft, percent aft of luff.
- Mainsail: 40-45 percent aft (45-50 percent with a jib set).
- Headsail: about 40-47 percent aft (No.1 genoas often 45-47 percent).
- Forward = forgiving (wide groove, good for chop); aft = max pointing in smooth
  water (narrow groove). As wind builds, draft blows aft and must be pulled forward
  again with luff tension.

**Entry and exit angle:** round entry = wide groove (forgiving); flat entry = points
higher but unforgiving. Hooked leech adds lift and weather helm (speed-killing if
overdone); open/flat leech has better L/D and less side force.

**Twist:** change in chord angle from foot to head. Illustrative gradient: about
5 degrees low, 10 mid, 20 at the head. Twist exists to match the sail to the wind,
which veers and strengthens with height. Add twist to depower (spill the top,
reduce heel); minimize twist for max power and pointing in moderate air and flat
water.

### 3.2 The controls

Mainsail:
- **Mainsheet:** primary control of angle of attack and leech tension/twist upwind.
  Trim hard -> boom down, leech tight, less twist. Target: top batten roughly
  parallel to boom.
- **Traveler:** angle of attack independent of leech tension. Car up = boom near
  centerline with softer sheet (keeps twist); car down = depower without changing
  twist much.
- **Boom vang:** primary twist control off the wind (when the sheet is eased and no
  longer pulls down). Enables "vang sheeting" upwind: preset vang, then ease/trim
  the sheet in puffs.
- **Outhaul:** camber/depth in the lower third. Ease for power, tighten to flatten.
- **Cunningham / halyard:** luff tension, sets draft position. Pull to drag draft
  forward to 40-45 percent as wind builds.
- **Backstay (mast bend):** master depower on a bendy rig. On = both sails flatter
  (bends mast, flattens main, tightens headstay); off = both fuller.

Headsail:
- **Jib sheet:** angle of attack, twist, depth. Target: mid-leech parallel to
  centerline.
- **Jib lead car (fore/aft):** balances leech vs foot load. Forward = less twist,
  deeper foot, more power (light air/chop). Aft = foot flattens, leech twists open,
  depower. Tune so windward luff telltales break evenly top-to-bottom; top breaks
  first -> too much twist, move lead forward; bottom first -> move aft.
- **Headstay sag (via backstay):** sag deepens/powers the jib; tight flattens it.
- **Furling:** cruising area reduction. Furled sails become fuller and the lead no
  longer matches; start rolling about 30 percent at about 18-20 kn.

### 3.3 Shape vs wind strength

As wind increases: flatten, twist open, move draft forward, then reduce area.

| Condition | Depth | Twist | Draft pos | Key moves |
|---|---|---|---|---|
| Very light | reduce slightly (avoid stall) | more | forward | ease outhaul a touch, soft sheet, traveler up, vang/cunningham off |
| Light-medium | full ~12-16% | moderate | ~40-45% | outhaul/backstay eased, top batten parallel to boom |
| Moderate, flat water | flatten | minimize | ~45-50% | trim hard, traveler up, draft aft for VMG |
| Overpowered | flatten toward 7-10% | twist open | forward | backstay on, outhaul max, cunningham on, drop traveler, vang-sheet |
| Heavy | flat, minimal | open top | forward | max outhaul/backstay/cunningham, traveler down, then reef |

Leech-telltale calibration: top leech telltale should stream about 50 percent
(50-75 percent) of the time in light-medium air. Always flowing = too little leech
load; never flowing = over-trimmed/hooked.

### 3.4 Shape vs point of sail

As you bear away, ease sheets to hold angle of attack to the broader apparent wind,
and twist control shifts from mainsheet to vang.
- Close-hauled (30-45 deg): trimmed in hard and flat, mainsheet controls twist.
- Close/beam reach: ease until luff just stops lifting, ease outhaul for power, vang
  sets twist.
- Broad reach: sheets well eased, vang critical to stop the boom skying.
- Running: sheets all the way out, maximize projected area, drag-driven.

General rule: fuller off the wind for power, flatter upwind for pointing.

### 3.5 Reefing

When: reduce before over-pressed ("if you think you need to reef, you already
should have").
- First reef: about 12-16 kn; many cruiser-racers near 18 kn apparent upwind.
- Second reef: about 18-25 kn.
- Signs: excessive heel, building weather helm, overpowered despite full depower.

How (slab/jiffy): ease sheet/vang, lower halyard, hook reef tack at gooseneck,
re-hoist tight, haul reef clew down and aft, tension hard. Reef the main first
(most directly cuts heel and rig load), then reduce headsail to keep balance.

Effect: reduces working area, lowers the center of effort, and so cuts heeling
moment -> less heel, less weather helm. A first reef typically reduces heel by
5-10 degrees.

---

## 4. Rig Geometry and Sail Proportions (with verdict)

### 4.1 The four rig dimensions

| Symbol | Name | Measures |
|---|---|---|
| P | Mainsail luff | up the aft face of the mast, boom top to top of hoist |
| E | Mainsail foot | along the boom, mast aft face to clew |
| I | Foretriangle height | deck to forestay/mast intersection |
| J | Foretriangle base | deck, front of mast to forestay/stem fitting |

Area formulas (right triangles):

```
Mainsail nominal area     = 0.5 * P * E
Foretriangle area         = 0.5 * I * J
```

Caveats:
- The mainsail's real area exceeds `0.5*P*E` because of the roach (convex curve aft
  of the luff-to-clew line, supported by battens): typically 10-25 percent more.
- The foretriangle `0.5*I*J` is NOT the genoa's area; it is a reference triangle. An
  overlapping genoa has more area than the foretriangle.

### 4.2 Masthead vs fractional (the key distinction)

- **Masthead:** forestay to the top of the mast. Tall foretriangle -> large
  headsail, comparatively small main. The genoa wins on area via overlap.
- **Fractional:** forestay attaches lower, about 7/8 to 3/4 of mast height (also
  19/20 near-masthead). Mast stepped further forward and rising above the forestay
  -> larger mainsail, smaller (often non-overlapping) headsail.

Modern production cruiser-racers are fractional. The current standard is a
near-masthead 19/20 fractional rig with large mainsails, swept spreaders, and
non-overlapping self-tacking or inside-the-shrouds jibs.

### 4.3 Genoa overlap (LP) and when the jib is smaller than the main

```
Overlap % = LP / J * 100
```

where LP (luff perpendicular) is the shortest distance from luff to clew.

| Headsail | Overlap (LP/J) |
|---|---|
| Non-overlapping jib | <= 100% (often 95-110%) |
| No.1 / light genoa | ~150% (historically up to 180%) |
| No.2 genoa | ~125-140% |
| Heavy-weather / No.3 | ~105-110% |

The jib is smaller than the main whenever it is non-overlapping (LP <= 100 percent
of J), the normal case on a modern fractional cruiser. A genoa only out-areas and
visually dominates the main with a 150 percent-plus genoa on a true masthead rig
(the old look).

### 4.4 Anchor data

Beneteau Oceanis 46.1 (Performance, ~14.6 m LOA, fractional):
I = 18.33 m, J = 6.30 m, P = 17.82 m, E = 5.50 m; mainsail 58 m2, genoa 62 m2
(a ~106-110 percent genoa). Note P (17.82) is almost as tall as I (18.33): a
19/20 near-masthead fractional. Main and headsail nearly equal because the
headsail is a modest overlap.

Jeanneau Sun Odyssey 440 (~13.4 m, fractional): main 42.5 m2, 125 percent genoa
48.5 m2.

Aspect-ratio sanity checks:
- Mainsail P/E about 2.8-3.5 (up to ~4.5 racers).
- Foretriangle I/J about 2.7-3.0.
- Fractional ratio (forestay height / mast) about 0.90-0.97.

### 4.5 VERDICT: proportions for our ~13.9 m cruising sloop

Model it as a **near-masthead fractional sloop (about 9/10 to 19/20)**:

```
Mast above deck  ~ 18.5 m
P (main luff)    = 17.0 m      E (boom) = 5.3 m     P/E  = 3.2
I (foretri ht)   = 17.7 m      J (base) = 6.0 m     I/J  = 2.95
Forestay height  = 0.96 * mast (about 9/10 fractional)
Mainsail (with roach) ~ 52 m2  |  Jib 105% ~ 40 m2  (or 135% genoa ~ 56 m2)
```

Rules this enforces:
1. Heights nearly equal: forestay top reaches 93-97 percent of mast height. In
   profile the main head and headsail head sit close; the main is not a stub.
2. Boom long enough for real main area: E about 5.3 m vs J 6.0 m (E ~ 0.88*J), keep
   P/E about 3.2.
3. Pick the headsail deliberately:
   - Modern default (working/self-tacking jib, 100-110 percent): jib clearly
     smaller than the main. Jib ~40 m2 vs main ~52-56 m2 (with roach). Safest
     choice against a dwarfing headsail.
   - 135 percent genoa: main and genoa roughly equal (~55 m2 each); the genoa
     overlaps the mast but its head still stops at the ~9/10 forestay, so it does
     not tower over the main.
   - Only a 150 percent-plus genoa on a true masthead rig makes the headsail
     dominate. Do not model that.

Red flags (all signs the rig is wrong):
- Forestay at the very masthead while the main luff stops far short.
- Boom shorter than about 0.8*J, or P/E above about 4 (spindly main).
- Headsail foot extending more than about 1.5*J (oversized genoa).

Resulting main:headsail area ratio is about 1.0:0.75 with a working jib (main
clearly bigger and taller), or about 1.0:1.0 with a 135 percent genoa. Either is
correct and modern; neither shows the jib dwarfing the main.

---

## 5. Heel and Stability (with implementable model)

### 5.1 The two opposing moments

A monohull settles where heeling moment equals righting moment about the roll axis.

Heeling moment from the rig:

```
M_heel = F_H * h
```

where `F_H` is the side force (component of total sail force normal to the
centerline plane) and `h` is the height of the center of effort above the roll
axis. The aerodynamic force itself:

```
F = C * 0.5 * rho_air * V_A^2 * A
```

so sail force scales with the square of apparent wind speed and linearly with area.

Righting moment from hull form plus ballast: when the boat heels by `phi`, the
center of gravity G stays put while the center of buoyancy B shifts to leeward. The
horizontal separation between buoyancy (up, through B) and weight (down, through G)
is the righting arm GZ:

```
RM(phi) = displacement_weight * GZ(phi)
```

Small angles: `GZ ~ GM * sin(phi)`, where GM is the metacentric height. Larger
angles (wall-sided): `GZ = sin(phi) * (GM + 0.5 * BM * tan^2(phi))`.

Equilibrium statement: `h * F_H = b * displacement` (heeling arm x heeling force =
righting arm x weight).

### 5.2 Equilibrium and qualitative behavior

The boat rolls to leeward until growing RM matches the heeling moment. Two
restoring mechanisms act at once: RM rises with `phi`, and the heeling moment falls
because the sail plane tilts away from the wind.

- More wind -> more heel (moment grows with `V_A^2`).
- More sail / more powered-up trim / higher CE -> more heel.
- Stiffer boat (larger RM at 15-30 deg) -> less heel.

### 5.3 GZ curve, form vs ballast, AVS

Plotting GZ (or RM) vs heel 0 to 180 deg gives the stability curve (S-shape with a
positive hump and a smaller negative hump for a monohull):
- Initial-stability slope near 0: steep = stiff, shallow = tender.
- Angle of Max Stability (AMS): peak of GZ.
- Angle of Vanishing Stability (AVS): GZ returns to zero and goes negative (becomes
  a capsizing arm). Many cruising yachts: AVS 110-130 deg.
- Area under the positive hump = energy to capsize; negative-hump area = energy to
  right from inverted.

Form stability (from beam) gives strong initial stability but often lower AVS;
ballast stability (deep heavy keel lowering G) dominates ultimate stability and
keeps GZ positive to large heel.

### 5.4 Point of sail, gusts, depowering, typical angles

- Heel is greatest close-hauled/close reaching (lift dominant, large lateral
  fraction); least dead downwind (drag dominant, force mostly forward).
- Gusts: wind rises with height by the power law; Hsu gust factor `G = 1 + 2p`. For
  p ~ 0.126, `G ~ 1.5`. Because heel scales with `V_A^2`, a 1.5x gust is about a
  2.25x heeling-moment spike.
- Depowering attacks F_H and h: reef/twist cut area AND lower CE; traveler down
  spills side force. First reef typically reduces heel 5-10 deg.
- Typical heel: cruisers sail best 10-20 deg; past 20 deg weather helm climbs;
  about 30 deg is "reduce sail now"; multihulls want under about 10 deg.

### 5.5 Concrete sim-usable heel model

Combine heeling and righting moments with two physical `cos(phi)` corrections (sail
plane tilts away; CE lever projects horizontally):

```
M_heel(phi) = k * A * h * V_A^2 * cos^2(phi)      (0.5*rho*C lumped into k)
RM(phi)     = displacement * GM * sin(phi)        (small/moderate-angle)
```

Set equal and solve for the equilibrium angle. For sub-30-deg work:

```
tan(phi_eq) ~ (k * A * h * V_A^2) / (displacement * GM)
phi_eq      ~ atan( H )      where H is the right-hand side ("heel number")
```

Define one tunable righting constant so designers drop in a single published
number:

```
RM30   = displacement * GM * sin(30 deg) = displacement * GM * 0.5
phi_eq ~ atan( (k * A * h * V_A^2) / (2 * RM30) )
```

Plausible coefficients for our ~13.9 m cruiser (displacement ~11,700 kg; upwind
area A ~90 m2; CE height h ~8 m above roll axis; GM ~1.25 m):

| symbol | meaning | value |
|---|---|---|
| k | lumped 0.5*rho_air*C_side heeling coefficient (tunable) | 0.40 conservative; 1.0-1.2 for full power |
| A | effective upwind sail area | 90 m2 (reefed: scale down) |
| h | CE height / lever | 8 m (reef/twist lowers it) |
| displacement | weight | 1.15e5 N (~11,700 kg * 9.81) |
| GM | metacentric height | 1.25 m |
| RM30 | righting moment at 30 deg | 1.15e5 * 1.25 * 0.5 ~ 7.2e4 N*m |
| V_A | apparent wind speed | m/s |

Calibration target table (tune `k` so this lands on documented angles):

| apparent wind | V_A (m/s) | regime |
|---|---|---|
| ~12 kn | 6.2 | gentle cruising ~10-13 deg full power |
| ~16 kn | 8.2 | comfortable cruising ~18-20 deg |
| ~22 kn | 11.3 | rail-down ~28-32 deg, reef now |
| gust 1.5x on 16 kn | 12.3 | heel spikes toward 30+ (responds as G^2) |

The shape (heel proportional to `V_A^2`, gust to `G^2`) is fixed physics; `k` is the
one knob to set the scale (k near 1.0-1.2 so 16 kn -> about 18-20 deg and 22 kn ->
about 30 deg).

Implementation recipe:
1. Compute `V_A` from true wind plus boat speed.
2. `pointFactor` in [0,1]: ~1.0 close-hauled/beam reach, ~0.4 broad reach, ~0.1
   dead run (lateral fraction of total force).
3. `trimFactor`: full sail 1.0; reef1 -> A *= 0.75, h *= 0.9; reef2 -> A *= 0.5,
   h *= 0.8; ease/twist/traveler-down -> reduce pointFactor or k by 10-30 percent.
4. `H = k * pointFactor * trimFactor * A * h * V_A^2 / (2 * RM30)`.
5. `phi_eq = clamp( atan(H) * 180/pi, 0, 75 )` degrees.
6. Gusts: multiply `V_A` by `G = 1 + 2p` (p ~ 0.13 -> G ~ 1.5); heel responds as
   `G^2`.
7. Optional dynamics: low-pass the target (first-order lag, time constant 2-4 s) so
   the boat eases into `phi_eq` and overshoots on gusts.

---

## 6. Steering, Helm Balance and Maneuvers

### 6.1 Rudder action

The rudder is a vertical hydrofoil aft. Deflected to an angle of attack, it makes a
side (lift) force at the stern, acting on a lever aft of the pivot -> a yaw moment
that swings the bow into the turn.

```
F_rud = 0.5 * rho_water * A_rud * Cl(alpha) * V^2
```

- Lift grows with angle of attack up to stall; drag rises then spikes at stall.
- Force scales with the square of water speed. Near zero boat speed the rudder has
  almost no authority (the basis of getting stuck in irons).
- Stall onset about 30-35 degrees of angle of attack at normal speed (some foils as
  low as 20 deg; for a small-craft foil ~30 deg at 2-8 m/s rising to ~35 deg near
  10 m/s). A stalled rudder loses steering force and gains drag.
- Sim: `Cl` linear in alpha to ~30-35 deg then dropping sharply. Cap useful helm at
  ~35 deg; beyond that deliver mostly drag (good for a crash-stop, useless for
  turning). Turn rate proportional to `F_rud * lever / yaw_inertia`. Over-deflecting
  past stall should reduce turn rate and brake the boat.

### 6.2 Helm balance: CE vs CLR

- **Center of Effort (CE):** effective center of the sails' driving force.
- **Center of Lateral Resistance (CLR):** effective center of the keel/hull side
  force.

Weather helm = boat turns up into the wind; arises when CE is aft of CLR. Lee helm
= boat bears off on its own; CE too far forward of CLR (dangerous).

Causes (all tunable):
1. **Heel** (the biggest dynamic driver): heeling pushes CE outboard to leeward and
   shifts CLR to windward, an unbalanced couple yawing the bow to windward. More
   heel -> more weather helm.
2. **Sail balance:** ease/drop the main (aft sail) -> CE forward -> less weather
   helm; more main / reefed jib -> CE aft -> more.
3. **Mast rake:** rake aft -> CE aft -> more weather helm; rake forward -> less.

A little weather helm is desirable: the boat self-corrects toward the wind in a gust
(feathers and spills power), it gives tiller feel, and the small held rudder angle
acts as a second lifting foil. Target 3-5 degrees of weather helm; beyond that the
rudder drags like a brake. Designers build a small "lead" (CE ahead of CLR at rest,
a few percent of waterline length) so that at sailing heel a light weather helm
results.

Sim: yaw moment `M_balance = F_drive * lead(heel, sailtrim, rake)`; drive `lead`
more positive (CE aft) with increasing heel and aft sail area; convert to the
corrective rudder angle, render as feel, and apply rudder drag as a speed penalty
that climbs steeply past about 5 deg.

### 6.3 Leeway

A close-hauled boat crabs to leeward; the angle between heading and actual track is
the leeway angle, which IS the keel's angle of attack. Self-balancing loop: side
force slips the boat to leeward -> the slip gives the keel an angle of attack ->
the keel makes windward lift -> leeway grows until keel lift balances rig side
force.

```
side_force_keel = 0.5 * rho_water * A_keel * Cl(leeway) * V^2
```

`Cl` roughly linear in leeway until keel stall. Typical leeway 3-5 degrees
close-hauled in moderate air, less in flat water/breeze, more when slow or in chop,
near 0 on a beam reach and run. Sim: solve each frame for the leeway where keel lift
equals the rig's lateral force; add that crab angle to heading for
course-over-water. Reduce achievable lift (raise leeway) at low speed and past keel
stall (produces the slide-to-leeward when pinching or after a botched tack).

### 6.4 Tacking, gybing, no-go zone

No-go zone: about 40-45 degrees either side of the true wind for a cruiser
(racers nearer 30-35 deg). Model a no-go half-angle of about 40-45 deg, a dead zone
roughly 80-90 deg wide.

Tacking (bow through the wind): zig-zag upwind, close-hauled on alternating tacks at
40-45 deg off the true wind. Rate of turn should start slow, speed up through the
eye, then slow onto the new close-hauled. Too fast = no time to trim, load kills
speed. Too slow = bow never makes it through, boat stalls "in irons." Sim: during a
tack apply the rudder yaw model while bleeding speed (drive ~0 through the eye); if
speed drops below threshold before passing head-to-wind, lock the boat in irons (no
drive, no steering, drifting back until the user backs the jib).

Gybing (stern through the wind): downwind turn, boom swings fast across under load.
No slow head-to-wind moment; the rig stays powered, so speed is kept but the
transition is violent if unmanaged. Sim: trigger the boom swing as the stern passes
dead-downwind; if the mainsheet is eased (boom far out) at that instant, apply a
hard impulse to the rig and a possible crew-hit/damage event. Reward pre-sheeting
(boom centered) with a controlled gybe.

### 6.5 Hull speed and polars

Hull speed: a displacement hull is trapped in its own bow-and-stern wave train near

```
hull_speed_kn = 1.34 * sqrt(LWL_ft) = 2.43 * sqrt(LWL_m)
```

(1.34 is not dimensionless; SLR commonly 1.34-1.51 kn*ft^-0.5). For LWL 12 m about
8.4 kn; 13 m about 8.8 kn. Wave-making resistance climbs steeply as Froude number
approaches 0.35 (SLR ~1.20) and further near Fr 0.40 (SLR ~1.35). Hull speed sits in
this knee. It is not a hard wall: light/planing hulls exceed it. Sim: model
wave-making drag rising moderately then steeply near `1.34*sqrt(LWL_ft)`,
asymptotically capping a displacement hull just past hull speed; allow planing types
a separate flatter high-speed regime.

VPP/polar: a Velocity Prediction Program balances aerodynamic and hydrodynamic
forces/moments and solves for boat speed, heel, and leeway at every (TWA, TWS),
choosing the trim that maximizes speed. The output is the polar diagram plus the
upwind/downwind VMG optima. For a sim, a polar is the cleanest data structure: a 2D
table `boatspeed = f(TWA, TWS)`, capped at hull speed and pinched to ~0 inside the
no-go zone. Mark the VMG peaks; they define optimal close-hauled (~40-45 deg) and
running angles.

---

## 7. Keel and Rudder Hydrodynamics and the Steady-State Force Balance

### 7.1 The two-foil machine

A close-hauled yacht is a coupled pair of hydrofoils in two fluids: the sail (in
air) and the keel-plus-rudder-plus-hull lateral area (in water). Each meets its
fluid at a small angle of attack and makes mostly lift with some drag. Steady motion
when the two total forces are equal, opposite, and collinear.

### 7.2 Keel as a lifting foil; side-force balance

Leeway angle `lambda` is the keel's angle of attack; the keel makes hydrodynamic
lift to windward. Steady athwartships balance:

```
Sail lateral (heeling) force = keel/hull hydrodynamic side force
P_LAT = 0.5 * rho_water * V_boat^2 * A_keel * C_L(lambda)
```

`C_L` rises roughly linearly with `lambda` until stall; drag rises faster (induced
term roughly quadratic). Design goal: make the required side force at the smallest
possible `lambda`. Typical upwind leeway 3-5 deg (workable 1-10 deg).

### 7.3 Why the boat goes forward upwind

Close-hauled, the sail works mostly by lift directed roughly across the apparent
wind. Because the heading is angled well off the wind, that lift has a forward
component (drive) and a large athwartships component (absorbed by keel lift). The
keel converts "shoved sideways" into "sideways lift, barely slip," leaving the
forward projection to accelerate the boat. Most displacement keelboats hold about
45 degrees to the true wind close-hauled.

### 7.4 The course theorem (pointing limit)

Define foil drag angles by their lift-to-drag ratios:

```
cot(epsilon_aero)  = L_aero / D_aero      (sail drag angle)
cot(epsilon_hydro) = P_LAT / R            (keel/hull drag angle)
```

The minimum angle between course and apparent wind is the sum:

```
beta_min = epsilon_aero + epsilon_hydro
```

The boat points higher only by making BOTH foils more efficient. The pointing limit
is set by the worst combination of rig and appendage L/D, not either alone.

### 7.5 Aspect ratio, induced drag, bulb keels, the rudder

- Higher-aspect (deep, narrow) keels make the side force with less induced drag
  (`induced ~ C_L^2 / (pi*AR*e)`); free surface and hull act as a partial end-plate,
  so effective AR can exceed twice geometric, falling as heel grows toward 30 deg.
- Practical camberless sections at C_L ~0.8 give section L/D about 16.
- A bulb deepens the keel and adds low ballast; winglets add effective span. Both
  cut induced drag for a given side force. Induced drag is minimized when the rudder
  carries almost no side load (the keel does the lateral work); one study found
  about 8 percent less induced drag moving the rudder's share from 20 percent to
  zero.
- The rudder is a second hydrofoil: it steers (yaw control) and adds some lateral
  resistance, but carrying side force on it is less efficient than on the deeper
  bulbed keel, so minimum-drag trim keeps rudder loading small. Rudder stall about
  30-35 deg deflection.

### 7.6 The four-force steady-state balance (sim encoding)

Let `phi_A` be the apparent-wind angle off the bow.

Aerodynamic total force F_A:
```
F_drive = F_A * sin(phi_A - epsilon_aero)
F_side  = F_A * cos(phi_A - epsilon_aero)
```

Hydrodynamic total force F_H:
```
R     = 0.5 * rho_water * V_boat^2 * A * C_D(lambda)   (hull + induced + appendage)
P_LAT = 0.5 * rho_water * V_boat^2 * A_keel * C_L(lambda)
```

Two scalar equilibrium equations (no acceleration):
```
1. Longitudinal:  F_drive = R          (drive balances total drag)
2. Lateral:       F_side  = P_LAT      (sail side force balances keel side force)
```

Plus the course-theorem closure:
```
3. beta_min = epsilon_aero + epsilon_hydro
```

A third (heel) equilibrium sets heel angle; heel reduces effective keel span and
raises `epsilon_hydro`, which is the mechanism by which over-heeling hurts pointing.

What limits the upwind pointing angle (for the "cannot point higher" rule):
- the sum of the two drag angles;
- sail stall/luffing below about 30 deg apparent;
- keel stall / runaway leeway when pinching (V_boat drops, keel needs larger lambda
  for the same side force);
- heel (shortens effective span, degrades both foils' L/D);
- rudder stall (~30-35 deg) bounds how hard the boat can be held while pinching.

Net behavior to encode: the boat accelerates while `F_drive > R` and slips while
`F_side > P_LAT`; it settles at the (V_boat, lambda, heel) satisfying equations 1
and 2; the tightest course it holds to apparent wind is `beta_min`.

---

## 8. Deck Hardware, Winches and Running Rigging

This section describes the deck gear, winches, and lines on a modern cruising sloop
in the 40 to 46 ft (12 to 14 m) range: how each piece physically works, the
mechanical advantage it provides, and the numbers a sailor actually sees.

### 8.1 Winches

A sheet winch is a rotating drum on a vertical axle that lets a sailor apply a large
pull to a loaded line with a removable handle. The drum turns one way only: inside,
spring-loaded pawls drop into a toothed ratchet ring, clicking freely in the
load-bearing direction and locking when load tries to spin the drum back, so the
line cannot run out and tension is held between handle strokes.

A winch multiplies force two ways at once: leverage (handle-arc radius vs drum
radius) and gearing (internal gears turn the drum slowly relative to the handle).
The combined figure is the power ratio:

```
power ratio = (handle length / drum radius) x gear ratio
```

Worked example: a 10 in handle, a 5 in drum (2.5 in radius), and a 6:1 gear give
(10 / 2.5) x 6 = 24:1. A 40:1 ratio means about 40 kg of line pull per 1 kg on the
handle (friction makes it a bit less). Cruising winches run about 8:1 on small
secondaries up to 40:1+ on primaries; 50:1+ appears on big offshore/racing boats
([Harken](https://www.harken.com/en/support/tech-articles/choosing-winch-power/),
[West Marine](https://www.westmarine.com/west-advisor/Selecting-Sailing-Winches.html)).

Speed configurations:
- Single-speed: one fixed gear, drum turns the same way as the handle. Simple, for
  halyards and light loads.
- Two-speed (the cruising workhorse): clockwise gives fast low-power direct drive
  (~1:1) to take up slack; the other way engages a gear train, drum keeps turning the
  same direction but slower for the powerful final trim. A Harken 40 two-speed runs
  about 13.5:1 and 39.9:1
  ([YBW](https://forums.ybw.com/threads/winch-power-ratios.619991/)).
- Three-speed: extra gears, heavier, mostly large or racing yachts.

Self-tailing winches add a sprung jaw ring on top of the drum plus a fixed stripper
arm: the tail is led into the jaws and over the stripper, so the drum grips and feeds
the line automatically and one person can grind and trim with no tailer
([Karver](https://www.karver-systems.com/en/choosing-your-winch-the-elements-of-understanding/)).

Wrapping and tailing: wraps always go on clockwise (every standard winch turns
clockwise); 3 turns for medium load, 4+ for a big genoa, strong wind, or hoisting;
grinding (turning the handle) and tailing (keeping the tail under tension) happen
together or the drum will not grip
([captnmike](https://captnmike.com/2010/04/22/how-to-use-a-winch-on-a-sailboat/)).

Safety: keep fingers/hair/clothing clear; a riding turn (override) is a wrap crossing
and jamming under another, impossible to release under load, prevented by neat stacking
and a slightly downward lead; ALWAYS take the load and ease under control before
uncleating, never the reverse
([Safe Skipper](https://www.safe-skipper.com/how-to-operate-a-winch-on-a-yacht/),
[PBO](https://www.pbo.co.uk/seamanship/how-to-deal-with-riding-turns-on-a-winch-20864)).

### 8.2 Running rigging (lines and their jobs)

- Main halyard: hoists the main; head to masthead sheave, down the mast to deck; sets
  luff tension (coarse).
- Jib/genoa halyard: hoists the headsail; on a furler it stays set and tensions the luff.
- Spinnaker/asymmetric halyard: hoists the downwind sail clear of the forestay.
- Mainsheet: primary main trim; via a tackle it sets boom angle and (with the traveler)
  leech tension and twist.
- Jib/genoa sheets: a port/starboard pair from the clew through a lead car to a primary
  winch; the leeward one trims, the windward one is lazy.
- Boom vang/kicker: mast/gooseneck to the underside of the boom, pulls the boom down to
  control leech tension and twist off the wind (tackle, rigid strut, or hydraulic).
- Outhaul: tensions the foot; tight flattens for heavy air, eased deepens the foot.
- Cunningham (luff downhaul): pulls the luff down, moves draft forward, depowers in gusts.
- Topping lift: holds the boom end up when the main is down or reefing.
- Traveler control lines: a pair that set the car's athwartships position.
- Reefing lines: shorten the main; two-line (one tack, one clew per reef) or single-line.
- Furling line: rotates the headsail furling drum.
- Preventer: boom end led forward to stop an accidental gybe downwind.
Material: synthetic rope (polyester, Dyneema), matte braided, often fleck-colored
([iNavX](https://inavx.com/2023/10/05/nautical-terminology-101-running-rigging),
[The Bosun](https://the-bosun.com/running-rigging-whats-what/)).

### 8.3 Purchases and mechanical advantage

A purchase (block and tackle) multiplies pull by the number of line parts on the moving
block; the trade-off is travel (a 4:1 needs 4 ft of tail per 1 ft of load movement).
Typical uses: mainsheet 4:1-6:1; boom vang 8:1-16:1 (short lever arm near the gooseneck);
outhaul/cunningham 2:1-4:1. Cascading (compound) purchases multiply in series, e.g. a
4:1 coarse x 3:1 fine = 12:1; use the least advantage that still trims by hand, since
each added part adds friction and line to handle
([SailZing](https://sailzing.com/mechanical-advantage-in-sailboats-block-and-tackle-systems/),
[Allen Brothers](https://www.allenbrothers.co.uk/2024/05/16/the-ultimate-guide-to-purchase-systems-and-mechanical-advantage/)).

### 8.4 Control hardware

- Cam cleats: spring-loaded toothed cams that pinch when pulled back, release on a flick
  up; for light/medium frequently adjusted lines (traveler, cunningham, vang tails).
- Rope clutches (jammers): a lever-operated cammed jaw that holds a line under high load
  while still letting it be ground in; lets one winch service many lines (a 40 ft cruiser
  often has banks of clutches feeding a coachroof winch).
- Horn cleats: classic two-horn metal cleat for dock lines, topping lift, belays.
- Traveler car and track: sets boom athwartships angle independent of sheet tension and
  twist; dropped to leeward in a puff to spill power while holding the leech.
- Genoa/jib lead cars: set where the sheet pulls the clew; forward tightens the leech and
  reduces twist, aft opens the top and flattens the foot; trim by the luff telltales.
- Fairleads, organizers, turning blocks: route lines, gather mast-base lines into
  clutches, and turn sheets/halyards aft to winches
  ([Yachting Monthly](https://www.yachtingmonthly.com/gear/cleats-clutches-and-jammers-which-to-use-and-when-88277),
  [MAURIPRO](https://www.mauripro.com/blogs/information/adjusting-genoa-lead-cars)).

### 8.5 Standing rigging and tuning

- Forestay (headstay): bow to masthead (masthead rig) or hounds (fractional); carries the
  headsail luff; tension controls luff sag.
- Backstay: masthead to stern, opposes the forestay; adjustable backstay bends the mast
  (flattens the main, opens the leech) and tightens the forestay at once: a primary
  upwind depower.
- Cap (upper) shrouds: masthead over the spreader tips to the chainplates; main
  athwartships support.
- Lower shrouds: below the spreaders to the deck; control the lower mast column.
- Intermediate shrouds: on double-spreader rigs, support the mast at the lower spreader.
- Spreaders: struts that push the shrouds outboard, improving the support angle; sweep aft
  adds fore-and-aft support.
- Chainplates: tie shroud/stay loads into the hull structure.
- Turnbuckles (bottlescrews): set tension by thread count, verified with a gauge.
Tuning logic: first a straight (in-column) mast athwartships via cap/lower shrouds,
checked under load on both tacks; then rake and pre-bend via forestay length and
backstay/lower balance; more backstay bends the mast (flattens the main, tightens the
forestay), easing powers it back up. Cap tension often starts ~15 percent of the wire's
breaking load
([Rigworks](https://rigworks.com/standing-rigging-or-name-that-stay/),
[PBO](https://www.pbo.co.uk/expert-advice/how-to-set-up-your-rig-67093)).

### 8.6 Typical cockpit layout (40 to 46 ft cruiser)

Laid out for short-handed/couple sailing, the lines cluster where the helm and one crew
reach them:
- Primary (headsail) winches: largest on the boat (size 40-50 self-tailing two-speed),
  one each side on the aft coaming within reach of the helm; genoa sheets lead aft through
  side-deck lead cars and turning blocks to them.
- Coachroof winches: one or two self-tailers just forward of the companionway, fed by a
  bank of clutches and an organizer; the main halyard, reefing lines, cunningham, vang and
  outhaul all lead aft from the mast base into these clutches so one or two winches service
  every control line in turn.
- Mainsheet: often a German mainsheet (boom to coachroof, aft to the coaming/coachroof
  winches), keeping the cockpit clear; others use a traveler on the sole, bridgedeck, or an
  arch.
- Helm and trimmer: helmsman at a wheel (often twin wheels on beamier 44-46 footers) aft
  with primaries and mainsheet in reach; trimmer works the primaries and coachroof winches
  just forward
  ([Morgans Cloud](https://www.morganscloud.com/2021/02/23/offshore-sailboat-winches-selection-and-positioning/),
  [Practical Sailor](https://www.practical-sailor.com/sails-rigging-deckgear/a-practical-look-at-sailboat-cockpit-design/)).

---

## 9. Boat Anatomy, Construction and Finish (glossary plus PBR reference)

Our target is a monohull cruising sloop: a single buoyant hull (the "canoe body")
with a fin keel and rudder hung below as streamlined appendages.

### 9.1 Hull anatomy

| Term | Definition |
|---|---|
| Bow | forward end |
| Stem | forward-most vertical edge of the bow profile |
| Stern | aft end |
| Transom | flat athwartships surface closing the hull aft |
| Topsides | hull above the waterline |
| Waterline (DWL/LWL) | where hull meets water; LWL = length along it |
| Bootstripe / boot top | narrow contrasting stripe just above the waterline |
| Cove stripe | decorative stripe higher up near the deck/hull joint |
| Sheer / sheerline | fore-and-aft curve of the top edge of the hull in profile |
| Freeboard | vertical distance from DWL to sheerline |
| Beam | max width |
| LOA | total length, foremost to aftermost hull point |
| LWL | hull length at the waterline (shorter than LOA with overhangs) |
| Forefoot | sharp bend in the stem profile near the waterline |
| Canoe body | the hull shell, shaped independently of the keel |

### 9.2 Deck layout

Foredeck, side decks (walkways flanked by toe rail), coachroof / cabin top (raised
cabin structure, lines led aft over it), cockpit (recessed self-draining working
area aft), coaming (raised lip around cockpit/hatches), companionway (entrance to
the cabin), hatches, portlights (windows), toe rail (low outboard rail),
stanchions (uprights carrying lifelines), lifelines (guard wires), pulpit (bow
guard rail), pushpit / stern rail, anchor/bow roller, handrails.

### 9.3 Underwater

Fin keel (short deep ballast fin), bulb (torpedo ballast mass at the keel foot,
lowering G for stability at shallower draft), rudder (spade = hung straight down on
a stock; or skeg-hung = behind a protecting skeg), draft (vertical depth the keel
extends below the waterline).

### 9.4 PBR material reference (what each part is made of and how it reads)

| Surface | Material | PBR target |
|---|---|---|
| GRP laminate (under gelcoat) | glass-fiber-reinforced polyester/epoxy | rarely visible; if exposed, dull fibrous off-white resin, semi-rough, near-zero specular, metalness 0 |
| Gelcoat (hull/deck finish) | pigmented polyester/epoxy, 0.5-0.8 mm | smooth glossy clear-coated dielectric; base color = hull color (default glossy white; also cream, light grey, dark flag-blue); roughness low when waxed (sharp reflections), rising as it chalks with UV; metalness 0; subtle clear-coat specular |
| Non-skid deck | same gelcoat, molded grit/diamond texture | markedly higher roughness, matte, metalness 0 |
| Natural teak deck | solid laid teak, caulked seams | warm golden-honey when oiled, silver-grey when bare; straight grain, satin-to-matte (never glossy), dark/black caulk lines; metalness 0, medium-high roughness |
| Synthetic teak | PVC plank-and-caulk | like teak but more uniform grain, consistent matte non-slip, contrasting caulk lines; very low specular, metalness 0 |
| Aluminum spars (mast/boom) | extruded 6000-series, anodized or powder-coated | brushed/satin metal; silver anodized = soft grey-silver, low-medium gloss (NOT a mirror), metalness 1, medium roughness, faint vertical extrusion striations; black anodized/powder-coat = dark grey-black semi-gloss, slightly softer (more dielectric clear-coat behavior) |
| Stainless fittings (pulpit, stanchions, lifelines, cleats, winch drums, chainplates, bow roller, rail) | stainless steel | bright polished metal, metalness 1, low roughness (sharp highlights/reflections), neutral-to-slightly-warm tint; satin parts at medium roughness |
| Antifouling (below waterline) | copper/biocide-loaded paint | flat chalky matte, high roughness, metalness 0, no meaningful specular; hard straight boundary against glossy topsides, boot stripe a crisp band just above |
| Windows/portlights | tinted (smoke-grey/bronze) acrylic or toughened glass | smooth transparent/translucent dielectric, low roughness, dark smoke tint, strong glossy reflection near-mirror at grazing angles, metalness 0 |
| Standing rigging | stainless 1x19 wire or rod | thin slightly satin metallic strands, metalness 1, low-medium roughness; bright stainless terminals/turnbuckles |
| Running rigging | synthetic rope (polyester, Dyneema) | matte braided/woven fiber, metalness 0, high roughness, often fleck-colored |

### 9.5 Layout summary (bow to stern)

Anchor roller and pulpit at the stem; forestay down to the stem; foredeck and fore
hatch; mast stepped near amidships with shrouds to side-deck chainplates; side
decks flanked by toe rail / stanchions / lifelines; coachroof with portlights and
handrails; halyards led aft to winches beside the companionway; self-draining
cockpit with coaming and lockers; backstay and pushpit at the transom. Below the
waterline: fin keel (with bulb) amidships, spade or skeg-hung rudder aft, all
coated in matte antifouling, with the bootstripe marking the waterline above.

---

## 10. Sources (deduplicated)

Aerodynamics, forces, apparent wind, slot, telltales:
- https://en.wikipedia.org/wiki/Forces_on_sails
- https://en.wikipedia.org/wiki/Apparent_wind
- https://en.wikipedia.org/wiki/Lift_(force)
- https://en.wikipedia.org/wiki/Genoa_(sail)
- https://en.wikipedia.org/wiki/Tell-tale_(sailing)
- https://gentrysailing.com/pdf-magazines/4-Another-Look-at-Slot-Effect.pdf
- https://www.sailingscuttlebutt.com/2021/10/06/taking-a-deep-dive-into-sail-slots/
- https://www.sailingworld.com/how-to/how-to-use-jib-telltales/
- https://www.ussailing.org/news/jib-and-mainsail-trim-how-telltales-work/
- https://www.sailnet.com/threads/main-backwinding-while-using-150.45834/

Sail shape and trim controls:
- https://sailzing.com/shaping-your-mainsail-part-2-camber/
- https://sailzing.com/shaping-your-mainsail-part-3-draft-shape-and-position/
- https://sailzing.com/shaping-your-sail-part-4-controlling-twist/
- https://sailmagazine.com/diy/mainsail-trim-101/
- https://www.northsails.com/blogs/north-sails-blog/how-to-trim-a-genoa-north-sails-how-to
- https://www.northsails.com/en-us/blogs/north-sails-blog/how-to-reef-a-mainsail
- https://www.northsails.com/en-us/blogs/north-sails-blog/downwind-sail-trim-how-to-north-sails
- https://www.speedandsmarts.com/toolbox/articles2/the-fast-course/jib-and-genoa-trim
- https://www.speedandsmarts.com/toolbox/articles2/the-fast-course/mainsail-trim
- https://www.quantumsails.com/getattachment/Resources-and-Expertise/Articles/Downloadable-Sail-Trim-Guides/QuantumSails_TrimGuide_Mainsail.pdf.aspx?lang=en-US
- https://www.onesails.com/mainsail-trimming/
- https://www.precisionsailloft.com/blog/reefing-101-how-to-reef-a-mainsail-and-when-to-do-it/
- https://www.uksailmakers.com/how-to-resources/proper-reefing-procedures/
- https://www.discoverboating.com/resources/points-of-sail-and-directions-of-sail-trim
- https://en.wikipedia.org/wiki/Reefing

Rig geometry and proportions:
- https://www.precisionsailloft.com/blog/rig-specification-diagram-for-sailboats-mainsail-headsail/
- https://www.uksailmakers.com/encyclopedia/rig-dimensions/
- https://www.uksailmakers.com/encyclopedia-4-2-genoas-and-other-jibs/
- https://www.harken.com/en/support/tech-articles/rig-dimensions/
- https://goodoldboat.com/saildata/calculator/
- https://www.cruisingworld.com/how/measuring-sail-area/
- https://en.wikipedia.org/wiki/Fractional_rig
- https://en.wikipedia.org/wiki/Masthead_rig
- https://sailmagazine.com/diy/know-how-modern-rigs-101/
- https://www.sailboat-cruising.com/Masthead-vs-Fractional-Rig.html
- https://mandurahyachtacademy.au/full-vs-fractional-rig/
- https://sailboatdata.com/sailboat/oceanis-461-beneteau-1/
- https://signature-yachts.com/wp-content/uploads/2023/03/46.1-specs.pdf
- https://canadianboating.ca/boat-reviews/jeanneau-sun-odyssey-440/
- https://www.rollytasker.com/en/about-sails/whats-in-a-jib/
- https://www.firgelliauto.com/blogs/mechanisms/sloop

Heel and stability:
- https://marine.marsh-design.com/content/understanding-monohull-sailboat-stability-curves
- https://wavetrain.net/2013/05/16/modern-sailboat-design-quantifying-stability/
- https://www.sailboat-cruising.com/righting-moment.html
- https://sailing-blog.nauticed.org/angle-of-heel-on-a-sailboat/
- https://en.wikipedia.org/wiki/Metacentric_height

Steering, helm, maneuvers:
- https://forums.ybw.com/threads/rudder-angle-control-surface.151059/
- https://usna.edu/NAOE/_files/documents/Courses/EN400/02.09%20Chapter%209.pdf
- http://www.oceansail.co.uk/articles/keelsandruddersarticle.html
- https://www.jordanyachts.com/4023
- https://usvmyg.org/helm-balance-with-simple-calculations-of-center-of-effort-and-center-of-lateral-resistance/
- https://www.diy-wood-boat.com/sail-balance.html
- https://www.morganscloud.com/2016/06/10/ten-tips-to-fix-weather-helm/
- https://www.syoa.co.uk/wp-content/uploads/2019/08/Safari-14-Aug-2019-at-1357.pdf
- https://sailties.net/blog/sailing-basics/how-a-sailboat-works
- https://www.seamagazine.com/points-of-sail-mastering-wind-angles-for-efficient-sailing
- https://learn.fleetfixer.io/points-of-sail
- https://harborsailboats.com/tacking-and-gybing-made-easy/
- https://sailingvirgins.com/resources/sailing-glossary/tacking
- https://sailboatzone.com/the-difference-between-tacking-and-jibing/
- https://naosyachts.com/sailing-tacking-and-jibing-guide
- https://en.wikipedia.org/wiki/Hull_speed
- https://www.boats.com/reviews/crunching-numbers-hull-speed-boat-length/
- https://en.wikipedia.org/wiki/Velocity_prediction_program
- https://orc.org/organization/velocity-prediction-program-vpp
- https://l-36.com/vpp.php
- https://48north.com/guest-dock/introduction-to-polar-diagrams-and-optimum-vmc/

Keel/rudder hydrodynamics:
- https://web.mit.edu/2.972/www/reports/sail_boat/sail_boat.html
- https://americansailing.com/articles/sailing-upwind/
- https://www.sailingschoolmalta.com/blog/the-physics-behind-a-sailing-boat
- https://www.sailnet.com/threads/how-does-keel-create-lift.142914/
- https://iopscience.iop.org/article/10.1088/1361-6404/aab982
- https://www.scribd.com/document/467646005/Aerohydrodynamics-of-Sailing-C-a-Marchaj
- https://www.researchgate.net/publication/237150728_Investigation_of_the_Effects_of_Different_Keel_Geometries_on_a_Sailing_Yacht
- https://www.researchgate.net/publication/264034657_Hydrodynamic_Forces_and_Flow_Characteristics_for_Three-Different_Types_of_Yacht_Keel
- https://www.researchgate.net/publication/295770701_The_influence_of_a_keel_bulb_on_the_hydrodynamic_performance_of_a_sailing_yacht_model
- https://www.academia.edu/33489664/Fluid_Mechanics_of_Yacht_Keels
- https://www.nationalacademies.org/read/5870/chapter/45
- https://www.mdpi.com/2504-3900/2/6/308
- https://www.sciencedirect.com/topics/engineering/rudder-angle
- https://oa.upm.es/3687/1/INVE_MEM_2008_56494.pdf

Anatomy, construction, finish:
- https://www.woodenboat.com/online-exclusives/yacht-design-terminology
- https://americansailing.com/articles/boat-anatomy/
- https://americansailing.com/articles/parts-of-a-sailboat-deck/
- https://www.boaterexam.com/boating-resources/boat-terminology/
- https://www.boats.com/on-the-water/sailing-101-sailboat-types-rigs-and-definitions/
- https://naosyachts.com/news/monohull-sailboat-guide
- https://improvesailing.com/guides/sailboat-keel-types
- https://www.jordanyachts.com/1554
- https://www.lifeofsailing.com/post/rudder-types-for-sailboats
- https://en.wikipedia.org/wiki/Skeg
- https://www.practical-sailor.com/sails-rigging-deckgear/a-practical-look-at-sailboat-cockpit-design/
- https://www.practical-sailor.com/boat-maintenance/painting-a-new-bootstripe-like-a-pro/
- https://boatingmag.com/how-to-apply-boot-stripe/
- https://en.wikipedia.org/wiki/Gelcoat
- https://marinabayharbor.com/understanding-gelcoat-on-fiberglass-boats/
- https://fiberglassflorida.com/fiberglass-resin/fiberglass-gel-coat-and-pigments.html
- https://www.yachtingworld.com/features/teak-alternatives-decking-options-126023
- https://gbr.sika.com/en/industry/marine/shipbuilding-andoffshore/decorative-floorsexternal/synthetic-teak-decks.html
- https://www.permateek.com/
- https://sail1design.com/aluminium-cocktail-goes-perfect-mast/
- https://www.practical-sailor.com/boat-maintenance/making-an-anodized-mast-look-like-new/
- https://www.totalboat.com/products/krypton-antifouling-bottom-paint
- https://en.wikipedia.org/wiki/Standing_rigging
- https://sailingellidah.com/standing-rigging/
- https://www.fawcettboat.com/blogs/articles/the-ultimate-guide-to-sailing-hardware-and-rigging
- https://pmrsailing.uk/sailing-lessons/sailing-terms-list/Standard-and-Running-Rigging.html
- https://www.sailboat-cruising.com/A-Z-of-sailboat-rigging.html

---

## 11. CORRECTIONS FOR OUR MODEL AND ENGINE

Prioritized, testable checklist. P0 = must fix (physically wrong or visually
broken), P1 = important for realism, P2 = polish.

### 11.a 3D Model Geometry Fixes (Blender)

**[P0] RESIZE THE JIB so the mainsail is the primary sail.**
Set the rig to a near-masthead fractional sloop and derive every sail edge from
these P/E/I/J for the 13.9 m hull:
```
Mast above deck = 18.5 m
P (main luff)   = 17.0 m
E (boom/foot)   = 5.3 m      -> P/E = 3.2
I (foretri ht)  = 17.7 m
J (foretri base)= 6.0 m      -> I/J = 2.95
Forestay top    = 0.96 * mast height  (about 9/10 fractional)
```
Geometry to build:
- Mainsail: luff 17.0 m up the mast, foot 5.3 m along the boom, head at top of
  hoist, clew at boom end. Add roach (convex leech) so cloth area is about
  52 m2 (nominal 0.5*17.0*5.3 = 45.05 m2, plus ~15 percent roach).
- Forestay: from deck at the stem (6.0 m forward of the mast front) up to
  0.96 * 18.5 = 17.76 m on the mast (i.e. NOT the masthead).
- Jib (working, 105 percent): LP = 1.05 * 6.0 = 6.3 m; luff along the forestay; area
  about 40 m2. The jib clew must NOT overlap past about 0.05*J behind the mast.
- (Alternative if a genoa look is wanted: 135 percent, LP = 8.1 m, area about
  56 m2, head still at the ~9/10 forestay, never above the main head.)

Tests:
- Measure in Blender: P/E within 3.0-3.4; I/J within 2.8-3.1; forestay top between
  0.93 and 0.97 of mast height. PASS/FAIL.
- Mainsail cloth area within 50-55 m2; jib area within 38-44 m2 (105 percent) so the
  main:jib area ratio is about 1.0:0.75. FAIL if jib >= main area with a working
  jib.
- In side-profile render, the jib head sits at or below the main head and the main
  is visibly the taller, larger sail. FAIL if the headsail towers over the main.
- Boom length E within 4.9-5.6 m and E >= 0.8*J = 4.8 m. FAIL if boom shorter.
- Headsail foot does not extend more than 1.5*J = 9.0 m. FAIL otherwise.

**[P0] Forestay must not attach at the masthead.** If the current model has a
masthead forestay with a short main luff, move the forestay attachment down to
0.96 of mast height and lengthen the main luff to 17.0 m. Test: forestay-to-mast
intersection is below the masthead by at least 3 percent of mast height.

**[P1] Bake sail shape (draft and twist) into shape keys.**
- Draft depth (camber): main about 15 percent at mid-height for the powered/cruise
  shape, with a flattened key at 8-10 percent for the depowered shape; jib about
  15 percent powered. Provide flat (7-10 percent) and full (15-17 percent) keys.
- Draft position: main max draft at 45 percent aft of luff (with jib set); jib max
  draft at 40-45 percent aft. Test: measure chordwise location of max camber per
  section.
- Twist gradient: about 5 degrees at the foot, 10 at mid, 20 at the head for the
  baseline upwind shape. Provide a "twisted/depowered" key with more head twist and
  a "minimal twist" key for moderate-air pointing. Test: chord-angle delta foot to
  head is 15-22 degrees in the twisted key, near 5-8 in the minimal-twist key.
- Top batten roughly parallel to the boom in the baseline upwind main key.

**[P1] Keel and rudder as proper foils.** Fin keel with a bulb at the foot (low
ballast); rudder a spade (or skeg-hung) with a foil section. Draft (keel depth below
waterline) consistent with a 45 ft cruiser (about 2.0-2.5 m). Test: keel has visible
streamlined foil cross-section and a torpedo bulb; rudder is a separate foil aft of
the keel.

**[P1] Hull proportions.** LWL shorter than LOA (overhangs), sheerline sweeping up
toward bow and stern, freeboard consistent. Mast stepped near amidships. Test:
measure LWL/LOA < 1.0; mast base within the middle third of LWL.

### 11.b Physics / Trim-Engine Corrections (V3)

**[P0] Use apparent wind everywhere, computed from true wind plus boat motion.**
```
V_A  = sqrt(W^2 + V^2 + 2*W*V*cos(alpha))
beta = arccos((W*cos(alpha) + V) / V_A)
```
Test: at alpha = 180 (dead downwind), V_A = W - V and boat speed cannot exceed W.
At close-hauled, V_A > W and beta < alpha.

**[P0] Total sail force scales with V_A^2 and area; split into drive and side.**
```
F_T   = C(alpha_sail, point_of_sail) * 0.5 * rho_air * V_A^2 * A
F_R   = F_T * cos(theta)      (drive, along heading)
F_LAT = F_T * sin(theta)      (side/heel)
```
where theta is the angle between F_T and the heading. Test: upwind drive fraction is
small and side fraction large; on a beam reach drive peaks; dead downwind force is
nearly all drive (verify F_LAT -> ~0).

**[P0] Heel model (from Section 5.5).**
```
RM30   = displacement * GM * 0.5                 (one tunable constant)
H      = k * pointFactor * trimFactor * A * h * V_A^2 / (2 * RM30)
phi_eq = clamp(atan(H) * 180/pi, 0, 75)
```
Coefficients: displacement 1.15e5 N, GM 1.25 m -> RM30 ~ 7.2e4 N*m; A 90 m2; h 8 m;
k tuned to about 1.0-1.2. pointFactor ~1.0 close-hauled/beam, 0.4 broad reach, 0.1
run. trimFactor: reef1 A*=0.75,h*=0.9; reef2 A*=0.5,h*=0.8. Low-pass phi toward
phi_eq with a 2-4 s time constant; gust multiplies V_A by G = 1 + 2p (~1.5), heel
responds as G^2.
Tests: at 16 kn full power phi about 18-20 deg; at 22 kn about 30 deg; first reef
drops heel 5-10 deg; dead downwind heel near 0; a 1.5x gust spikes the heeling
moment about 2.25x.

**[P0] Leeway and side-force balance.** Solve each frame for the leeway where keel
lift equals the rig side force:
```
P_LAT = 0.5 * rho_water * V_boat^2 * A_keel * C_L(lambda)   set equal to F_LAT
```
C_L linear in lambda to keel stall. Add lambda as a crab angle to heading to get
course-over-water. Tests: close-hauled leeway 3-5 deg in moderate air; near 0 on
beam reach and run; leeway grows (slide to leeward) at low speed and when pinching.

**[P0] No-go zone and pointing limit.** No-go half-angle 40-45 deg either side of
true wind (dead zone 80-90 deg). Inside it, drive -> 0 and sails luff. Closest
useful pointing per the course theorem `beta_min = epsilon_aero + epsilon_hydro`.
Tests: heading inside the no-go zone yields no drive; close-hauled settles near
40-45 deg to true wind; degrading rig or keel L/D widens the pointing angle.

**[P0] Hull speed cap.** Wave-making drag rises steeply near
`hull_speed_kn = 2.43 * sqrt(LWL_m)`; for our LWL (use about 12.5 m) the cap is
about 8.6 kn. Model drag rising moderately then near-vertically through the cap.
Test: in strong wind on a reach the boat asymptotes just above hull speed (about
8.4-8.8 kn), not to arbitrary high speed.

**[P1] Weather helm and rudder.**
```
M_balance = F_drive * lead(heel, sailtrim, rake)
F_rud     = 0.5 * rho_water * A_rud * Cl(delta) * V^2
```
lead grows more positive (CE aft) with heel and aft sail area; target held rudder
3-5 deg; rudder Cl linear to 30-35 deg then stalls; rudder force scales with V^2 so
authority vanishes near zero speed; apply rudder drag as a speed penalty climbing
steeply past 5 deg. Tests: weather helm increases with heel; at near-zero speed the
rudder cannot complete a tack (in-irons); over-deflecting past stall reduces turn
rate and brakes the boat.

**[P1] Slot / telltale logic for the coach/feedback layer.**
- Telltales report attached-or-separated per patch. Jib luff: windward lifts ->
  pinching/under-trimmed (bear away or sheet in); leeward stalls -> over-trimmed/too
  low (head up or ease); both stream -> correct.
- Main leech top telltale flowing 50-80 percent of the time = correct twist; always
  stalled = leech too tight (ease sheet/vang); always streaming = too open (trim
  on).
- Backwind in the forward main is a slot-too-closed signal (genoa over-trimmed),
  not a healthy slot.
Tests: when over-trimmed the leeward jib telltale stalls and the coach says ease;
when pinching the windward telltale lifts and the coach says bear away; chronic
backwind triggers an "open the slot" hint.

**[P1] Trim-to-shape coupling.** Wire the controls to the shape parameters:
mainsheet -> angle of attack and leech twist; traveler -> angle of attack at fixed
twist; vang -> twist off the wind; outhaul -> lower-third camber; cunningham -> draft
position; backstay -> overall flatness/mast bend. Increasing wind should call for
flatten, twist open, draft forward, then reef, reducing both F_LAT and weather helm.
Test: applying backstay/outhaul/cunningham reduces modeled heel and weather helm at
the same wind.

### 11.c Material / Finish Corrections (PBR)

**[P0] Hull gelcoat is glossy clear-coated dielectric, not metal.** Base color the
hull color (default glossy white; cream, light grey, or dark flag-blue acceptable),
metalness 0, low roughness when waxed (sharp reflections), subtle clear-coat
specular. Test: hull shows sharp environment reflections, metalness reads 0.

**[P0] Antifouling below the waterline is flat matte.** High roughness, metalness 0,
no meaningful specular, color blue/black/red/dark-green. Hard straight waterline
boundary against the glossy topsides; crisp bootstripe band just above. Test: a
sharp matte/gloss transition at the waterline; bootstripe present.

**[P1] Non-skid deck areas are matte textured gelcoat,** markedly rougher than the
smooth topsides, metalness 0. Test: deck walking areas are visibly less reflective
than the hull sides.

**[P1] Spars are satin anodized aluminum, not chrome.** Silver anodized = soft
grey-silver, low-medium gloss (NOT a mirror), metalness 1, medium roughness, faint
vertical extrusion striations; or black anodized/powder-coat = dark grey-black
semi-gloss. Test: mast/boom reflect softly, not mirror-like.

**[P1] Stainless fittings are bright polished metal.** Pulpit, pushpit, stanchions,
lifelines, cleats, winch drums, chainplates, bow roller: metalness 1, low roughness,
neutral tint. Test: these parts show sharp highlights distinct from the satin spars.

**[P1] Standing rigging stainless wire (metalness 1, low-medium roughness); running
rigging synthetic rope (metalness 0, high roughness, matte braided, often
fleck-colored).** Test: stays/shrouds reflect like thin metal; sheets/halyards read
as matte fiber.

**[P1] Windows/portlights are tinted smoke-grey acrylic/glass,** smooth
transparent/translucent dielectric, low roughness, strong glossy reflection
near-mirror at grazing angles, metalness 0. Test: ports reflect strongly at grazing
angle and tint the cabin behind them.

**[P2] Teak (natural or synthetic) decking** if used: warm golden-honey (or weathered
grey) straight-grain, satin-to-matte, with dark caulk lines; metalness 0, medium-high
roughness. Test: deck planks show grain and contrasting caulk seams, never glossy.
