# Ball-location calibration notes — v36 first pass

## v43 scope note

MLB-wide game access reuses this existing calibration whenever the selected game's feed supplies valid batted-ball coordinates. Version 43 does not change calibration constants, transforms, raw-coordinate retention, curved-boundary handling, or `?locationDebug=1` diagnostics. Plays without usable coordinates omit Field View rather than inventing a location.

## Approach

The tracker retains MLB's raw `coordX` and `coordY` values as `x` and `y`. Calibrated display values remain separate as `plotX` and `plotY`.

All tuning is centralized in `FIELD_CALIBRATION` and the small pure functions immediately following it in `script.js`.

## Regions

### Infield

The old transform strongly pulled every point toward a generic fielder-position anchor. That erased meaningful differences and could create lateral errors.

v36 identifies the infield primarily from the raw radius around home plate. Single-digit fielding-position codes are used only for gentle guidance when the raw point is already within the plausible infield region.

Named settings:

- Automatic infield radius: `70`
- Maximum guided infield radius: `90`
- Infield minimum Y: `130`
- Anchor weights: `0.16–0.45`, reduced from the previous `0.36–0.72`
- The second-base guide was moved from `(150,151)` to `(139,153)` to reduce first-base-side bias.

### Outfield lateral mapping

The center axis has an 18-unit dead zone. Lateral expansion fades in smoothly with both horizontal offset and depth, keeping deep/straightaway-center controls nearly unchanged.

- Full lateral effect at 58 units from center
- Deep-to-shallow blend from Y `72` to `135`
- Maximum left-field expansion: `1.22`
- Maximum right-field expansion: `1.13`

The stronger left-side correction reflects the repeated left-field centerward bias in the calibration set.

### Shallow outfield ground balls

Qualifying ground balls are shortened radially from home plate instead of receiving a simple Y offset. This prevents lateral expansion from cancelling the intended shallow-depth correction.

- Active radius band: `72–145`
- Center compression: `5%`
- Foul-line-side compression: up to `15%`
- The compression blends smoothly based on lateral offset.

Fly balls and line drives do not receive this radial shallow-ground correction.

### Curved boundary

The illustrated outfield wall is the SVG quadratic curve:

```text
M15 105 Q125 -15 235 105
```

v36 evaluates points against that curve and the two foul lines. A point outside the illustrated field is projected back along its ray from home plate, then inset by three SVG units. This replaces the prior rectangular X/Y clamp.

## Regression controls

The included tests verify that:

- A representative straightaway-center line drive remains unchanged.
- The Carlos Cortes second-base example is no longer pulled as far toward first.
- The Lawrence Butler left-field example receives additional lateral spread.
- The Tommy White shallow-right-field example moves materially closer to home than the old plotted point.
- An extreme outfield coordinate finishes inside the curved playable boundary.

## Known uncertainty

This is an evidence-based first pass, not a claim of pixel-perfect Statcast reproduction. The comparison images are visual ground truth rather than machine-annotated target coordinates, stadium diagrams vary, and MLB fielding-position codes sometimes describe the credited fielder rather than the ball's precise spatial region.

The most valuable second-pass examples are:

- Shallow ground balls across LF, left-center, center, right-center, and RF
- Mound, second-base, and shortstop plays with raw/debug data visible
- Balls close to either foul line
- Near-wall balls at multiple angles
- Additional straightaway-center controls to guard against regression

Capture future examples with `?locationDebug=1` so each screenshot can be matched to its raw and calibrated coordinates.
