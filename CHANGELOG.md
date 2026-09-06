## v50

- Lightened the global button palette to a soft neutral gray.
- Switched all button labels/icons to black for stronger readability.
- Applied the same control treatment to game-selection, live navigation, date controls, and Choose Another Game.
- Added a slightly darker gray hover/focus state while preserving black text.
- Bumped the stylesheet asset to `style.css?v=24`.

## v49

- Changed the game-selection controls to a soft medium gray with white text.
- Changed live-game navigation controls to the same gray treatment for a consistent control palette.
- Changed game-list matchup, time, and venue text to black while preserving the featured Astros-game accent treatment.
- Preserved the neutral at-bat card, black card/R-H-E text, matchup-aware team-color border/bases, and unified challenge styling from v48.
- Bumped the stylesheet cache key to `style.css?v=23`.

# Changelog

## v48

- Unified live-game typography to black on the Next Event/matchup card, R/H/E scoreboard, and revealed event cards for stronger readability.
- Changed the Next Event/matchup card to a neutral white background with a full batting-team-color border.
- Made base outlines and occupied-base fills automatically use the current batting team color; home plate follows the same accent.
- Kept ABS challenge ruling cards in the batting team color flow so they visually remain part of the same at-bat.
- Restyled Previous Event, Next At-Bat, Next Half-Inning, and Jump to Live controls to echo the neutral game-selection button treatment.
- Bumped browser assets to `script.js?v=48` and `style.css?v=22`.

## v47

- Placed each ABS challenge ruling label and its confirmed/corrected call in one inline text flow, such as `🔴 Call overturned: STRIKE` or `🟢 Call confirmed: BALL`.
- Preserved normal challenge-result font weight, the separate ruling event, reveal timing, challenge counts, and pitch counts.
- Left all other event-card layout and tracker behavior unchanged.
- Bumped browser assets to `script.js?v=47` and `style.css?v=21`.

## v46

- Applied a robust two-column grid to every normal event card: a fixed 28-pixel icon column and a flexible `minmax(0, 1fr)` text column.
- Ensured every wrapped line remains aligned beneath the first text line for results, numbered pitches, changes, substitutions, challenges, and other icon-led events.
- Kept Field View badges inside the text column on a separate contained row.
- Preserved card dimensions, typography, emphasis, icons, team-color rails, event chronology, and all tracker behavior.
- Bumped the style cache key to `style.css?v=20`; JavaScript remains v44 because no behavior changed.

## v45

- Fixed long Field View result cards so the event bullet and `RESULT` text begin on the same line instead of leaving the bullet stranded above the text.
- Placed the `FIELD VIEW` badge on a contained row beneath the result text.
- Preserved result text, event order, Field View behavior, event-card rails, and all tracker logic.
- Bumped the style cache key to `style.css?v=19`; JavaScript remains v44 because no behavior changed.

## v44

- Collapsed each ABS challenge request and its original pitch call into one chronological event card.
- Challenged pitch cards now read `🟡 Ball- Catcher Challenged` (or the available actor) and fall back to `🟡 Ball- Challenge Requested` when the feed does not identify the challenger.
- Preserved the separate overturned/confirmed ruling card, reveal-aware challenge totals, and exactly-once pitch counting.
- Left MLB-wide game access, event-card rails, matchup colors, dark-blue controls, navigation, bases, and Field View unchanged.
- Bumped the script cache key to `script.js?v=44`; CSS remains v18 because no styling changed.

## v43

- Expanded the date picker from an Astros-only lookup to the complete daily MLB slate.
- Pinned Houston's game in a featured Astros section when present, while showing the full slate normally on off days.
- Kept the picker spoiler-safe by rendering only matchup, scheduled time, and venue—not feed status, inning, scores, or results.
- Changed selection/persistence to a per-`gamePk` path so multiple games on the same date maintain independent reveal progress; existing Astros date saves remain readable.
- Generalized selected-game initialization for arbitrary away/home teams, broadcasts, lineups, matchup colors, events, Field View, and Game Complete.
- Added a three-step reveal-safe ABS hierarchy: Challenge requested, the original reviewed pitch, then Call overturned/confirmed with the corrected/confirmed call.
- Kept ABS ruling text at normal weight and challenge totals unchanged until the ruling event itself is revealed.
- Preserved pre-challenge dot initialization from explicit feed metadata or eligible 2026+ MLB game metadata without scanning future events.
- Preserved the v42 WPBL-style full left edge on the Next Event/matchup card, driven by the batting team's already-selected matchup color.
- Left event-card rails, dark-blue controls, base-state handling, field calibration, pitch-timer logic, and spoiler-safe navigation unchanged.
- Bumped browser assets to `script.js?v=43` and `style.css?v=18`.

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
### v50 hotfix
- Removed the unintended button-style outline/pill border around team names in the R/H/E scoreboard while preserving lineup-link behavior.

