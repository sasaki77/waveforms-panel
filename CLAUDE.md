# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a Grafana panel plugin ("Waveforms Panel", id `sasaki77-waveforms-panel`) that visualizes array/waveform data retrieved from the Archiver Appliance datasource. It's built with the standard [Grafana plugin scaffolding](https://grafana.com/developers/plugin-tools/) — most tooling config (webpack, jest, eslint, prettier, tsconfig) lives in `.config/` and is extended, not overridden, by the root-level config files (e.g. root `tsconfig.json` just does `{"extends": "./.config/tsconfig.json"}`). Avoid editing `.config/` unless intentionally changing the scaffolding itself.

The panel expects a specific table-shaped `DataFrame`, not a generic time series: the first field/column is the array index, and each subsequent field is one waveform's values at a given timestamp (column name = timestamp). This shape is normally produced by the [Archiver Appliance datasource](https://github.com/sasaki77/archiverappliance-datasource) with `arrayFormat`/`index` set. See the README's "Supported data format" section for the full example table.

## Commands

```bash
npm ci                # install dependencies (Node >=22; .nvmrc pins the LTS version)
npm run dev            # webpack watch build (development mode)
npm run build           # production build
npm run typecheck       # tsc --noEmit
npm run lint             # eslint
npm run lint:fix          # eslint --fix, then prettier --write
npm test                  # jest --watch --onlyChanged
npm run test:ci            # jest, non-watch, for CI (maxWorkers 4, passWithNoTests)
npm run server               # docker compose up --build — runs a real Grafana instance for manual/e2e testing
npm run e2e                    # playwright tests (tests/*.spec.ts) — requires the server above to be running
```

To run a single Jest test file: `npx jest path/to/file.test.ts` (drop `--watch --onlyChanged` from the npm script).

There is currently one source file under `src/` and no unit tests colocated with it; `tests/panel.spec.ts` is a Playwright e2e test that drives a real Grafana instance (started via `npm run server`) using `@grafana/plugin-e2e` and the dashboard/datasource fixtures in `provisioning/`.

## Architecture

The entire plugin logic is small and concentrated in three files under `src/`:

- **`src/module.ts`** — registers the `PanelPlugin` and declares the panel options schema (display mode, line width, point size, axis label, legend options via `commonOptionsBuilder`). This is what drives the options UI in Grafana's panel editor.
- **`src/types.ts`** — `WaveformsOptions` interface, matching the fields registered in `module.ts`.
- **`src/components/WaveformsPanel.tsx`** — the panel component and all rendering/data-transform logic:
  - `makeChartData` transforms Grafana `DataFrame[]` (one frame per query/series) into a Chart.js `ChartData` at a given waveform `index` (i.e. a given timestamp column), applying color, per-series hidden state, and display-mode-driven line/point styling. Each dataset carries a `custom.key` (derived from `refId`/`name`) used to correlate legend clicks back to a series.
  - `makeChartJSOption` builds the Chart.js options object: linear x/y axes, drag-zoom via `chartjs-plugin-zoom` (click resets zoom), animations disabled for responsiveness.
  - `makeLegendItems` / `updateHiddenSeries` implement custom legend click behavior (click to isolate a series, ctrl/cmd-click to toggle) rather than using Chart.js's or Grafana's built-in legend interactivity directly — `VizLegend` is used for rendering but click handling is custom.
  - `makeMarks` builds slider tick marks for the first/last waveform (timestamp) using the field names from the first series.
  - The panel renders a Chart.js `<Line>` chart plus a `Slider` (from `@grafana/ui`) below it that lets the user scrub through the timestamp columns (`index` state) to pick which waveform is displayed. Slider width/marks adapt based on panel width (`sliderWidthBorder`).

Data flow in one sentence: Grafana passes `data.series: DataFrame[]` for the current query results → `index` (slider state) selects which timestamp column to show → `makeChartData` extracts that column across all series into Chart.js datasets → rendered via `react-chartjs-2`.

## Git commit messages

Prefix commit subject lines with a NumPy-style acronym indicating the kind of change, followed by a colon and a short imperative summary (e.g. `ENH: allow to hide plot from legend`, `MNT: adding defensive access for clickedKey`, `DOC: update README.md`). Common acronyms:

- `API` — an (incompatible) API change
- `BLD` — change related to building
- `BUG` — bug fix
- `DEP` — deprecate something, or remove a deprecated object
- `DEV` — development tool or utility
- `DOC` — documentation
- `ENH` — enhancement
- `MNT` — maintenance commit (refactoring, typos, etc.)
- `REV` — revert an earlier commit
- `STY` — style fix (whitespace, formatting)
- `TST` — addition or modification of tests
- `TYP` — static typing
- `REL` — related to releasing

## Release process

Two GitHub Actions workflows (`.github/workflows/`) build and zip the plugin and publish it as a GitHub Release: `publish-release.yml` on `v*.*.*` tags (versioned prerelease), and `punlish-main-snapthot.yml` (note: filename has typos, kept as-is) on push to `main` (force-updates a rolling `main-snapshot` tag/release). Both run `npm run build` then zip the repo excluding paths in `exclude.txt`. The plugin is unsigned, so consumers must allowlist its ID in `grafana.ini`.
