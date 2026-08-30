# Astros Spoiler-Free Tracker v45

A static, deployable build of Julie's Astros-first, spoiler-free MLB game tracker.

The opening screen loads the complete MLB slate for the selected date. Houston is pinned first when it plays; every other game opens in the same reveal-controlled tracker without exposing live or final results in the picker.

## Deploy to GitHub Pages

1. Extract this ZIP.
2. Upload the extracted files to the root of the existing Astros tracker repository, replacing the previous application files.
3. Keep the filenames and directory structure unchanged.
4. Wait for GitHub Pages to finish deploying, then open the normal tracker URL.

No package installation or build command is required. The application runs directly from `index.html` and fetches MLB game data in the browser.

## Local launch

For a local smoke test, serve the extracted directory with any static HTTP server. For example:

```sh
python3 -m http.server 8080
```

Then open `http://localhost:8080/`.

Opening `index.html` directly as a local file is not recommended because browser security rules can block remote MLB feed requests.

## Calibration diagnostics

Normal users see no diagnostic controls. To enable location diagnostics, add `?locationDebug=1` to the tracker URL. Example:

```text
https://example.github.io/astros-spoiler-free-tracker/?locationDebug=1
```

Diagnostic mode can copy every in-play location for the selected game or show the raw and calibrated coordinates for an individual Field view.

## Verification

Run the included regression suite with Node.js:

```sh
node tests/regression.test.js
```

See `CHANGELOG.md` and `CALIBRATION_NOTES.md` for implementation details.
