# Changelog

## v42

- Corrected the team-at-bat visual treatment to match the WPBL tracker: the full six-pixel left edge of the Next Event/matchup button now uses the batting team's selected matchup color.
- Removed the mistakenly added individual accents beside the pitcher and batter names.
- Kept the event-card side markers and their matchup-aware selection logic unchanged.
- Preserved the ABS result typography, starting challenge-dot initialization, dark-blue navigation controls, and all tracker behavior from v41.
- Bumped browser assets to `script.js?v=42` and `style.css?v=17`.

## v41

- Matched the WPBL tracker's full-height six-pixel player-card side-accent treatment for the current pitcher and batter areas.
- Kept separate pitcher and batter accents so each player displays the matchup-aware color of that player's own team.
- Reused the Astros tracker's existing selected matchup colors; no second color-selection system was introduced.
- Preserved the v40 ABS result typography and pre-challenge dot initialization.
- Left the event-card rail styling/selection logic and dark-blue navigation controls unchanged.
- Bumped browser assets to `script.js?v=41` and `style.css?v=16`.

## v40

- Changed ABS confirmed/overturned ruling cards to normal text weight while preserving the two-event challenge sequence and all count/pitch behavior.
- Added team-colored side accents to the current pitcher and batter labels using the exact matchup colors already selected for event-card team identity.
- Initialized both teams' starting ABS challenge dots from explicit feed capability metadata or 2026+ MLB championship-game metadata, without scanning future plays.
- Kept non-ABS games free of challenge dots and preserved reveal-aware challenge-count updates.
- Left the matchup-aware full-height event-card rails and dark-blue navigation/action controls unchanged.
- Bumped browser assets to `script.js?v=40` and `style.css?v=15`.

## v39

- Restored all primary navigation/action controls to the tracker's fixed dark-blue treatment.
- Preserved the v38 matchup-aware, full-height event-card side rails without visual or selection-logic changes.
- Reconciled completed-play bases from each runner's terminal MLB destination, eliminating ghost runners left at intermediate bases during multi-base advances.
- Cleared the revealed base state at half-inning transitions, including the between-innings next-batter preview.
- Added reveal-aware MLB ABS challenge dots beside each team name when the feed reports ABS support.
- Split each ABS review into the original pitch call and a separate confirmed/overturned ruling event.
- Ensured a reviewed pitch counts exactly once and its ruling counts zero times.
- Reconstructed challenge use from revealed rulings rather than MLB's final game totals, preventing future challenge outcomes from leaking.
- Added regression coverage for terminal runner destinations, stranded-runner rollover, overturned and confirmed challenges, challenge retention/loss, pitch counts, and spoiler safety.
- Bumped browser assets to `script.js?v=39` and `style.css?v=14`.

## v38

- Restored the original full-height, five-pixel solid team-color rail on the left edge of every event card.
- Removed the capsule, outline, and simultaneous two-color marker treatment.
- Retained two identity-color candidates for every MLB club and now selects one solid color per team for each matchup.
- Scores all four candidate pairings deterministically for perceptual contrast, with safeguards against red/orange ambiguity, dark-on-dark pairings, and nearly white rails on white cards.
- Preserved neutral event-card backgrounds and all v36/v37 tracker behavior, diagnostics, and calibration.
- Bumped browser assets to `script.js?v=38` and `style.css?v=13`.

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
