# F1 Bahrain Race Strategy Workbook

A client-side [SpreadJS workbook](https://developer.mescius.com/spreadjs) for analyzing the completed 2025 Bahrain Grand Prix. The workbook uses historical data from [OpenF1](https://openf1.org/). It uses Vite, TypeScript, HTML, CSS, and SpreadJS. This sample app was built using Codex with the SpreadJS MCP Server integrated. 

The app demonstrates the use of What-if Analysis in spreadsheets to predict F1 lap times based on different variables.

## Run locally

Use Node 20.19 or later. Install dependencies with `npm ci`, then run `npm run dev`. Open the local Vite URL. Use `npm run build` and `npm run preview` to inspect the production bundle. The bundled race data is already present in `src/data/bahrain-race.json`; opening the app does not require an API key or internet connection once local assets are installed and served.

SpreadJS is a commercial component. Configure a valid MESCIUS license for the intended host before publishing or presenting a watermark-free demo. The repository does not contain a license key.

## Workbook tour

The **Race Dashboard** shows final classification, race gaps, best recorded laps, representative pace, pit count, and the selected driver's position. **Lap Analysis** shows every recorded lap and explains which laps contribute to representative pace. **Tire Strategy** shows the compound timeline, pit boundaries, stint summaries, and formula-derived calibration. **Strategy Simulator** exposes assumptions, both per-lap ledgers, projected time, a pit-lap/degradation Data Table, Goal Seek, and named scenarios. A hidden **Data** worksheet retains inspectable source observations and helper formulas.

The blue simulator cells are editable. Negative strategy deltas mean a faster modeled strategy. The projected race time is anchored to the driver's official result by comparing candidate and actual schedules under the same assumed tire and pit parameters. It assumes that other race effects remain unchanged; it does not model traffic, overtaking, penalty changes, or altered safety-car timing. Long hypothetical stints can extend beyond observed tire ages.

Choose a driver from the header. Full-distance classified drivers receive an official-time anchor. Drivers without a comparable completed result remain available for observed analysis and raw hypothetical modeling, but Goal Seek is disabled. A driver with more than two observed stops retains the full reference schedule while the candidate editor starts from a clearly labeled two-stop approximation. Use **Actual Strategy** or **Restore Approximation** to restore default assumptions. **Save Scenario** creates a named native SpreadJS scenario for the current workbook session; **Scenarios** opens the native Scenario Panel; **Compare** writes formula-output snapshots for up to eight current-driver scenarios. **Goal Seek** changes Base Pace to reach the target time, with a dialog to retain or restore the prior value. **Reset Workbook** discards session edits and rebuilds from the bundled observations.

## Data refresh

Run `npm run data:fetch` manually. The development-only TypeScript utility queries the fixed OpenF1 2025 Bahrain race session, normalizes observations, validates the result, and atomically replaces the bundled JSON. It is never part of the Vite runtime or production build. It uses the `curl` executable and small bounded retries because the utility must work in developer environments with managed HTTP proxies. A failed refresh leaves the previous JSON file intact.

The OpenF1 `starting_grid` endpoint currently returns no records for session 10014. The normalizer uses OpenF1 position samples recorded before the scheduled race start and records a quality note. It does not substitute qualifying order. The provenance file describes this and other source limitations.

## Design notes

The app stores observed times as seconds and retains all source precision. Workbook formulas calculate clean-lap masks, pace statistics, stint trends, calibration estimates, simulation totals, and What-If results. Default degradation and compound offsets are rough estimates from the selected driver's clean stints where available, with visible fallbacks. Fuel improvement is an illustrative assumption. Pit lane duration is displayed separately from estimated net pit loss.

The source modules are intentionally small: `scripts/` obtains and normalizes data, `src/types/` contains data contracts, `src/workbook/sheets/` assembles the five worksheets, and `src/workbook/what-if.ts` coordinates native SpreadJS analysis features. No framework or backend is used.

## GitHub Pages

The `.github/workflows/pages.yml` workflow builds and publishes `dist` when the `main` branch is pushed, and it can also be run manually. Vite's relative asset paths support the project URL `https://banzor.github.io/f1-spreadjs/` without a repository-specific build setting.

In [banzor/f1-spreadjs](https://github.com/banzor/f1-spreadjs), set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. Add the repository Actions secret `SPREADJS_DISTRIBUTION_KEY` with a SpreadJS 19.2 distribution key valid for the Pages hostname `banzor.github.io` (hostname only, without the scheme or `/f1-spreadjs/` path). The workflow intentionally fails before deployment if that key is absent. Push the project to `main`; the workflow's deployment step reports the resulting Pages URL.

The distribution key is embedded in the public browser bundle by design. The Actions secret keeps it out of source control, but does not make the deployed key confidential. The built JavaScript also contains the bundled OpenF1-derived race data. The project owner confirms that the OpenF1 permission covers this public GitHub Pages demo and its bundled data; separate publication of the JSON in a public source repository should be confirmed before that distribution.

## Publication

The project owner has confirmed direct permission from Bruno Godefroy at OpenF1 to use this data in videos, blogs, demos, and a public GitHub Pages demo with bundled data. Thanks, Bruno! The OpenF1 data in this sample is therefore used with permission for those purposes. The permission record is described in `_docs/data-provenance.md` and `THIRD_PARTY_NOTICES.md`. Public redistribution of the bundled JSON as a separate source-repository artifact was not specified and should be confirmed before that distribution. A SpreadJS deployment license is separately required for the intended host. No F1, team, or tire manufacturer logos are included.

## License

The [MIT license](LICENSE) applies to this project's original application code and documentation. It does not apply to SpreadJS or to the OpenF1-derived `src/data/bahrain-race.json`; those materials remain subject to their own licenses and permissions. See [third-party notices](THIRD_PARTY_NOTICES.md) for details. The repository does not grant rights to Formula 1 or team names, marks, or other third-party material.
