# Changelog

## v37

- Refined the two-color team pip into a slimmer, understated vertical marker.
- Reduced the secondary-color ring from a heavy border to a thin stroke.
- Reduced the marker width, height, shadow, and reserved card padding.
- Preserved all 30 team color pairs and all v36 behavior and calibration.

## v36

- Removed the Astros-only pale-blue event-card background.
- Replaced single-color event accents with standardized two-color pips for all 30 MLB clubs.
- Preserved the Athletics green identity and added a contrasting gold ring.
- Added `Pitcher Step Off` to the hidden event-card list while retaining state processing.
- Hardened pitch-timer violation detection so automatic-ball and automatic-strike edge cases never count as actual pitches.
- Deferred runner movements without a source play index until the result boundary, preventing future base-state leakage.
- Preserved simultaneous runner advances and verified representative hit, walk, steal, wild-pitch, pinch-runner, caught-stealing, force, and out transitions.
- Replaced the aggressive fielding-position calibration with a centralized, region-aware first-pass transform.
- Added gentle infield guidance, depth-aware lateral outfield spread, radial shallow-ground-ball correction, and curved playable-field boundary projection.
- Preserved raw coordinates and the hidden v35 location diagnostic mode.
- Bumped browser assets to `script.js?v=36` and `style.css?v=11`.
