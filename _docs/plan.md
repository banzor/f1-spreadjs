# F1 Race Strategy Workbook — implementation plan

Planning date: September 22, 2026. Deliverable: a reviewable development specification only. All paths, interfaces, formulas, and workflows below describe future implementation; no application source or dataset is created by this plan.

## 1. Recommended application concept

Build a small race-engineering workbook in which a user moves from observed race results, through lap and tire analysis, to a transparent strategy model. The demonstration question is: **“What might this driver's Bahrain race have looked like under different strategy assumptions?”**

Use Vite's vanilla TypeScript setup, HTML, CSS, and SpreadJS. Use ordinary functions and small modules. SpreadJS occupies almost the entire viewport and owns the analytical experience. There is no backend, framework, authentication, live feed, telemetry viewer, or custom calculation service.

Deliver four visible standard worksheets: **Race Dashboard**, **Lap Analysis**, **Tire Strategy**, and **Strategy Simulator**. Add one hidden, inspectable **Data** worksheet for normalized observations. All significant analytics remain workbook formulas, including the per-lap simulation. TypeScript loads observations, creates the workbook, and coordinates native What-If features.

Use SpreadJS **19.2 or later**, with all SpreadJS packages pinned to the same tested patch version. Scenario Analysis and its runtime panel are documented v19.2 features. Verify the exact npm package exports and TypeScript declarations before workbook development; do not substitute a custom scenario engine if an older dependency lacks the feature. [MESCIUS release information](https://developer.mescius.com/spreadjs/releases)

Use the core `@mescius/spread-sheets` package and its matching charts package. Include only the runtime components needed for the native Scenario Panel and formula bar. The full Designer ribbon is unnecessary. Excel import/export is a later enhancement, not a first-release dependency. [SpreadJS installation and packages](https://developer.mescius.com/spreadjs/docs/getstarted)

## 2. Baseline race and verified facts

**Recommend the completed 2025 Bahrain Grand Prix, April 13, 2025, at Sakhir.** Pin this edition even if a newer race exists by implementation time: it provides a known historical fixture and a useful combination of multiple compounds, pit strategies, and a safety-car interruption. Describe it as “2025 historical race data,” never as a prediction or the current race. Publication scheduling must not silently change the dataset.

The planning-time OpenF1 session query returned **session key 10014**, **meeting key 1257**, race session, Bahrain, 2025. Its session window is 15:00–17:00 UTC; that window is metadata, not the measured race duration. [OpenF1 session query](https://api.openf1.org/v1/sessions?year=2025&country_name=Bahrain&session_name=Race)

Use Oscar Piastri, driver **81**, as the opening selection. These observations were checked directly against OpenF1 during planning:

| Observation | Verified baseline |
| --- | --- |
| Race distance and winner duration | 57 laps; 5,739.435 seconds, displayed as 1:35:39.435 |
| Stint 1 | Soft, laps 1–14, starting tire age 3 laps |
| Stint 2 | Medium, laps 15–32, starting tire age 0 |
| Stint 3 | Medium, laps 33–57, starting tire age 0 |
| Pit entries | End of laps 14 and 32 |
| Pit lane durations | 24.498 and 24.900 seconds |
| Stationary stop durations | 2.3 and 2.9 seconds |

Sources: [OpenF1 race results](https://api.openf1.org/v1/session_result?session_key=10014), [Piastri stints](https://api.openf1.org/v1/stints?session_key=10014&driver_number=81), [Piastri pit observations](https://api.openf1.org/v1/pit?session_key=10014&driver_number=81). The [official final race result](https://www.formula1.com/en/results/2025/races/1257/bahrain/race-result) independently confirms the winning time and classification.

The result response also demonstrates important real edge cases: Sainz has a DNF and null race duration; Hülkenberg has a DSQ and null classification fields. Do not replace either with zero or promote a provisional result into the final classification.

The 2025 race included a safety car. Obtain its actual time boundaries from race-control records during data preparation; do not hardcode guessed lap ranges. [Official race report](https://www.formula1.com/en/latest/article/piastri-storms-to-controlled-victory-in-bahrain-grand-prix-ahead-of-russell.47YQh0Ex2gkZcx58fRaRqJ)

Only the session and selected result/stint/pit/lap responses have been inspected during planning. Complete field coverage, all-driver joins, and race-control reconstruction are explicit implementation acceptance checks, not assumed complete.

## 3. User experience and visual direction

The dark shell contains the title **F1 Bahrain Race Strategy Dashboard**, a visible “2025 Bahrain GP” subtitle, a labeled driver selector, and **Reset Workbook**. The workbook fills the remaining viewport. Provide a compact formula bar so users can inspect how a result was calculated.

Open on Race Dashboard with Piastri selected. The intended demonstration sequence is:

1. Read the finishing order and compare representative pace.
2. Inspect why pit and safety-car laps are excluded from that pace.
3. Follow the selected driver's tire timeline and stint trends.
4. Open Strategy Simulator and change a pit lap or compound.
5. Explore the pit-lap/degradation heatmap.
6. Solve for a five-second improvement with Goal Seek.
7. Save the assumptions as a native scenario and compare named strategies.

Use light worksheet surfaces, charcoal section bands, clear system typography, restrained accent colors, and compact numeric columns. Avoid logos, car photographs, custom racing fonts, and decorative animation. Tire cells show both color and text: S/red, M/amber, H/light gray with dark border; unknown compounds use a question mark.

Apply a consistent legend: blue-tinted cells are editable assumptions; gray cells are observed data; neutral cells are formulas; teal result cards emphasize calculated outputs. A label accompanies every color distinction. Keep keyboard navigation, visible focus, and cell comments explaining units. Protect observations and formulas against accidental editing while leaving formulas inspectable.

Target a laptop demonstration at 1440×900 and a usable layout at 1280×720. Preserve readable cells and allow workbook scrolling on smaller screens. Open the native Scenario Panel only on demand beside the workbook; do not construct another dashboard around it.

Reset rebuilds the workbook from the bundled observations and default configuration, clears session-created scenarios and edits, and returns to Piastri. Its control text or nearby help states that unsaved session work is cleared. No accounts, automatic persistence, or browser storage are required. “Save scenario” means retained for the current workbook session.

## 4. Data architecture and ownership

Development data flow: **OpenF1 → development-only TypeScript utility → normalization and validation → one bundled JSON file**.

Runtime data flow: **bundled JSON → worksheet observation tables → spreadsheet formulas → charts and What-If Analysis**.

Commit the approved normalized file at `src/data/bahrain-race.json`. Import it through Vite so it is bundled with the application. Runtime code must not import the OpenF1 client or downloader. Neither the development server startup nor the production build triggers a refresh. A missing or incompatible dataset produces a clear local-data error, never an API fallback.

Bundle scripts, styles, and fonts locally. An offline demonstration means serving the already-built application from a local static server with internet disconnected. First-time access to a remotely hosted site still requires connectivity; a service worker/PWA and direct `file://` execution are outside scope.

| Responsibility | Owner | Examples |
| --- | --- | --- |
| Acquire source observations | Development TypeScript | HTTP requests, retries, session selection |
| Normalize and relate observations | Development TypeScript | Driver joins, stint membership, timestamp alignment, null handling |
| Populate workbook | Runtime TypeScript | Bulk cell writes, tables, sheet layout, names, chart setup |
| Calculate analytical metrics | Spreadsheet formulas | Pace, medians, dispersion, lap deltas, slope, positions gained |
| Calculate strategy | Spreadsheet formulas | Tire age, per-lap components, stint totals, pit losses, total time |
| Coordinate interactions | Runtime TypeScript | Driver changes, input transactions, reset, Goal Seek result handling |
| Execute What-If features | Native SpreadJS APIs and calculation engine | `SJS.TABLE`, Goal Seek, Scenario Manager |
| Present analysis | SpreadJS configuration | Charts, validation, conditional formatting, number formats |

Never ship precomputed pace summaries, degradation coefficients, simulation totals, scenario results, or sensitivity grids in the race JSON. Formula-derived defaults may be copied into editable input cells at initialization; their source formulas remain visible and this copying does not move calculation into TypeScript.

## 5. Required OpenF1 endpoints

Use the `https://api.openf1.org/v1` base URL and numeric session key. The following table states this sample's ingestion requirements. [OpenF1 API reference](https://openf1.org/docs/)

| Endpoint | Requirement and workbook purpose |
| --- | --- |
| `/sessions` | Required: discover and verify the pinned completed Bahrain race. |
| `/meetings` | Required: event name and location metadata; filtered by meeting key. |
| `/drivers` | Required: identity, abbreviation, team, and team color. |
| `/starting_grid` | Required: actual grid rather than qualifying order. |
| `/session_result` | Required: final classification, duration, gap, laps completed, result status. |
| `/laps` | Required: lap times, sector durations, timestamps, pit-out observations. |
| `/stints` | Required: compounds, stint boundaries, initial tire age. |
| `/pit` | Required: pit lap, timestamp, lane and stationary durations. |
| `/position` | Required: position timeline aligned with lap boundaries. |
| `/race_control` | Required: caution, safety-car, restart, and relevant timing events. |
| `/weather` | Required request; missing samples are tolerable: observed race conditions. |
| `/intervals` | Omit initially: final gaps already exist and traffic modeling is out of scope. |

Sector times come from `/laps`; do not invent separate sector, compound, or tire-age endpoints. Exclude car telemetry, location traces, overtakes, radio, and championship feeds. Query once per dataset/session rather than once per driver wherever possible.

## 6. Proposed TypeScript contracts

Define interfaces as simple data contracts, not classes. The following field specifications are the recommended future types, not implementation declarations. API fields retain snake_case; normalized fields use camelCase. Type external JSON as unknown until validated. IDs and laps are integers, durations are finite seconds, timestamps are ISO UTC strings. A nullable field means explicitly `null`; an optional API field can also be absent.

### OpenF1 response contracts

Every driver observation carries numeric `session_key`, `meeting_key`, and `driver_number`. Session/meeting records have the applicable keys. Adopt these narrow response interfaces:

| Interface | Fields to consume and proposed value types |
| --- | --- |
| `OpenF1Session` | Numeric year/circuit key; string session name/type, circuit, country, location, date_start/date_end, gmt_offset; optional boolean is_cancelled. |
| `OpenF1Meeting` | String meeting_name, meeting_official_name, location, country_name, date_start; numeric year. |
| `OpenF1Driver` | String full_name/name_acronym; nullable string team_name/team_colour. |
| `OpenF1GridEntry` | Nullable numeric position; no qualifying lap duration needed. |
| `OpenF1RaceResult` | Nullable numeric position/number_of_laps/duration; number, string, or null gap_to_leader; boolean dnf/dns/dsq. Reject qualifying-shaped duration arrays in this race-only contract. |
| `OpenF1Lap` | Numeric lap_number; nullable date_start; nullable numeric lap_duration and duration_sector_1/2/3; nullable boolean is_pit_out_lap. |
| `OpenF1Stint` | Numeric stint_number/lap_start; nullable numeric lap_end/tyre_age_at_start; nullable string compound. |
| `OpenF1Pit` | String date; numeric lap_number; optional nullable numeric lane_duration, stop_duration, pit_duration. |
| `OpenF1Position` | String date; nullable numeric position. |
| `OpenF1RaceControl` | String date/category/message; nullable flag/scope; optional nullable driver_number, lap_number, sector. |
| `OpenF1Weather` | String date; nullable numeric air_temperature, track_temperature, humidity, rainfall, wind_speed, wind_direction. |

The response shapes are deliberately tolerant of missing historical measurements. Verify them against all required 10014 responses before locking the fixture. Examples already inspected include [race result records](https://api.openf1.org/v1/session_result?session_key=10014), [lap records](https://api.openf1.org/v1/laps?session_key=10014&driver_number=81&lap_number%3C=2), and [pit records](https://api.openf1.org/v1/pit?session_key=10014&driver_number=81).

### Normalized static dataset

Recommend one `BahrainRaceDataset` object containing `schemaVersion`, `provenance`, `race`, `conditions`, `raceControlEvents`, `neutralizationPeriods`, `drivers`, and `qualityIssues`.

| Interface | Recommended fields and semantics |
| --- | --- |
| `DatasetProvenance` | Source name/URL, sessionKey, meetingKey, fetchedAtUtc, normalizerVersion, endpoint request list, raw-response checksums, normalized content checksum, attribution text, terms URL, permission-record reference if obtained. |
| `RaceMetadata` | Year, eventName, circuitName, country, scheduledStartUtc, sessionEndUtc, scheduledLaps = 57, completedLeaderLaps, winnerDriverNumber. Keep scheduled and observed distances distinct. |
| `RaceConditions` | Array of `WeatherObservation`, with timestamp, air/track temperature, humidity, rainfall flag, wind; nullable values. Include condition coverage notes, not calculated averages. |
| `RaceControlEvent` | Stable local ID, timestamp, category, message, flag, scope, driver/lap/sector when present. Retain only events relevant to displayed race context and data quality. |
| `NeutralizationPeriod` | Kind: SC, VSC, red flag, or relevant yellow; start/end timestamps, scope, source event IDs, boundary confidence. This is event normalization, not a pace estimate. |
| `DriverRace` | Driver number, name, abbreviation, team name/color, `GridObservation`, `RaceResult`, ordered laps, ordered stints, ordered pitStops. |
| `GridObservation` | Position or null, pitLaneStart boolean or unknown, source note. |
| `RaceResult` | Position, reportedCompletedLaps, officialDurationSeconds, `RaceGap`, status flags, classification provenance; numeric values can be null. |
| `RaceGap` | Discriminated value: seconds with seconds value; laps with laps value; unavailable. Retain original text when parsing fails. |
| `LapObservation` | Lap number, start/end UTC or null, timeSeconds, three nullable sector seconds, stintNumber, compound, positionAtEnd, positionSampleUtc, pitIn/pitOut flags, linked pit IDs, neutralization event IDs, restartAdjacent flag, timing-quality flags. |
| `StintObservation` | Stint number, compound, startLap/endLap, startingTireAgeLaps, linked pit-entry/exit IDs, boundary-quality flag. No length, average, best time, or slope stored. |
| `PitObservation` | ID, reportedLap, normalized end-of-lap pit boundary or null, timestamp, laneDurationSeconds, stationaryDurationSeconds, linked next stint, mapping-confidence note. |
| `DataQualityIssue` | Severity, code, driver/lap/entity reference, concise explanation. |

Use a compound union of Soft, Medium, Hard, Intermediate, Wet, and Unknown. Preserve unfamiliar source compound text in a quality note; never coerce it to Hard. Driver IDs are driver numbers within this one pinned race; no global driver identity service is needed.

Keep each driver's observations nested for convenient runtime population. Flatten them once into worksheet tables during initialization; do not join raw API feeds in the browser. Preserve source precision. Compute per-lap tire age with a workbook formula from the linked stint's initial age rather than duplicating a calculated series in JSON.

### Workbook and simulation types

| Type | Purpose |
| --- | --- |
| `WorkbookConfig` | Sheet names, layout addresses, table names, palette, input limits, pace-policy defaults, dataset schema version. |
| `WorkbookReferences` | Workbook, worksheet references, input/output cell addresses, chart ranges; a plain object. |
| `StrategyInputs` | Stops: one or two; first/second pit lap; three compounds and initial tire ages; baseline pace; three degradation rates; three offsets; pit loss; fuel effect; target improvement. |
| `CalibrationPolicy` | Minimum observations, slope-span requirement, fallback values, outlier threshold; separate from race observations. |
| `DriverSimulationEligibility` | Eligible boolean, reason, full-distance result availability, actual-strategy coverage. |
| `ScenarioMetadata` | Native scenario name, driver/session identity, protected built-in flag. Holds no replacement scenario values or calculation engine. |
| `GoalSeekOutcome` | Success, before/after pace, residual error, applied/cancelled state. |

## 7. Development-time acquisition and normalization

Implement `scripts/fetch-bahrain-data.ts` only after this plan is approved. Expose a manual developer command such as `data:fetch`, with default year 2025/session 10014 and explicit year/session overrides. A refresh for another edition is a reviewed dataset change, not an end-user feature.

1. Discover sessions using year, Bahrain, and race filters; verify the exact session, date, completion, cancellation state, and final result availability. Require explicit selection if results are ambiguous. Never use the moving `latest` key.
2. Fetch required datasets with a small sequential client, timeouts, and bounded retries. Space requests at approximately 2.2 seconds; honor `Retry-After` for 429 and back off for transient server errors. Do not retry invalid requests indefinitely. Historical access is available without runtime credentials. Current published limits include 30 requests/minute for the free tier; recheck when implementing. [OpenF1 access FAQ](https://openf1.org/)
3. Validate response containers and consumed fields. Reject wrong-session data, nonfinite numbers, and conflicting identities. Record endpoint counts and missing-field counts.
4. Join by session and driver number. Sort all records deterministically. Remove exact duplicates; reject conflicting duplicates unless a documented correction rule identifies the authoritative record.
5. Map laps to inclusive stint ranges. Flag overlapping/gapped ranges. Derive a pit-in flag from the normalized stop boundary and preserve the API pit-out flag. Distinguish tire changes from drive-throughs or visits without a new stint.
6. Match each lap's end time to the latest position observation at or before that boundary. Because positions are change events, a previous value may remain valid until replaced. Do not interpolate future samples or backfill before the first observation. Null lap timestamps produce unknown positions, not fabricated timing.
7. Construct caution intervals from timestamped race-control events, respecting driver/sector/track scope. Match intervals to each driver's lap time window, not the leader's lap number. Include deployment/ending transitions and the first full racing lap after restart in exclusion context. Unclosed or ambiguous intervals get a quality flag and a documented conservative boundary.
8. Preserve weather samples and attach no causal pace correction. Weather is contextual evidence, not a new simulation engine.
9. Normalize missing values to null, preserve DNF/DNS/DSQ independently, and distinguish a numeric time gap from a lap deficit. Prefer final result duration; do not replace it with the sum of available lap times.
10. Prefer `lane_duration`; accept legacy `pit_duration` only as a fallback. These describe lane transit, while `stop_duration` describes stationary time. Neither is automatically the net loss versus racing on track. [OpenF1 pit field definitions](https://openf1.org/docs/#pit)
11. Run structural validation and a small report: per-driver lap/stint coverage, result status, pit-boundary matches, caution coverage, warnings. Required core data failures block replacement; optional weather/sector measurements may remain null.
12. Write to a temporary output and replace the bundled JSON only after validation succeeds. Preserve the old fixture on errors. Produce stable ordering; keep retrieval time separate from the content checksum so unchanged observations are comparable across downloads.

Do not quietly supplement failed OpenF1 feeds with another API. Official results and Pirelli material are cross-checks. Any necessary manual data correction must identify the changed field, source, reason, and licensing basis, and remain reviewable with the dataset update.

## 8. Workbook architecture, units, and formula conventions

Use standard worksheets throughout. The hidden Data sheet contains structured tables: `Drivers`, `Laps`, `Stints`, `PitStops`, `RaceEvents`, and `Weather`. Observation columns are populated once; formula columns are added afterward. Permit developers to unhide Data from workbook controls for inspection.

Recommended formula dependency order: observations → lap quality/pace helpers → stint and driver summaries → calibration → simulator ledger → results → What-If tables/charts. No circular references, custom JavaScript calculation functions, asynchronous formulas, or volatile `INDIRECT`/`OFFSET` dependencies are necessary.

Use named ranges for selected driver and simulation inputs, and table references for observations. Keep the small simulator input/output coordinate map in one configuration module. Build ranges to actual table size; avoid whole-column array scans repeated inside sensitivity cells.

**Units:** all calculation values use decimal seconds. Degradation is added seconds per lap of tire age; fuel effect is seconds of lap-time improvement per successive race lap. Convert seconds to spreadsheet day fractions only in display-helper cells when applying `m:ss.000` or `[h]:mm:ss.000`. Signed deltas remain numeric seconds with an explicit plus/minus format. Never apply a clock formatter directly to seconds.

Keep unavailable observations blank with a separate status; use `NA()` for chart gaps and invalid numeric analyses where useful. Do not put “N/A” text into an otherwise numeric calculation column or treat blanks as zero. Use guarded formulas so empty filters and insufficient sample counts show “insufficient data,” not misleading zero pace.

## 9. Race Dashboard worksheet

Recommended layout: A1:N4 title/metadata/legend; A6:N28 driver overview; A31:G48 pace chart; H31:N48 selected-driver position chart. Adapt table height to the actual field size.

The overview shows driver, team, start, finish/status, positions gained, best valid lap, recorded-lap average, representative pace, included-lap count, pit visits, compound sequence, and winner gap. Allow filtering by team/status and sorting on calculated pace. Driver identity must remain attached to each row after sorting.

Recommended calculations:

| Metric | Formula responsibility |
| --- | --- |
| Positions gained | Starting position minus finishing position, only when both are meaningful numeric classifications. |
| Best lap | Minimum positive valid nondeleted lap duration; race-control exclusions for pace do not redefine official fastest lap. Label this “best recorded valid lap” unless official validation is available. |
| Recorded-lap average | Average positive measured completed laps, including disruptions; label explicitly. |
| Representative pace | Average of the clean-lap mask defined below, with sample count. |
| Pit visits | Count matching pit observations; distinguish tire-change stop count if different. |
| Tire summary | Ordered compound initials joined from the driver's stint records. |
| Gap | Show sourced seconds/laps/status without reinterpreting lap deficits. |

Use a horizontal representative-pace bar chart for classified drivers with sufficient data. Use a position-by-lap chart for the selected driver plus up to three comparison drivers, with position 1 at the top. All-driver data remains available in cells; avoid an unreadable 20-line chart. The grid already communicates start versus finish, so omit a redundant chart for that metric.

Display race conditions as formula-derived min/max or median temperatures from observations, with missing-coverage text. Include small links or in-workbook navigation to Lap Analysis and Strategy Simulator.

## 10. Lap Analysis worksheet and representative pace rules

Use rows for laps 1–57 and one compact lap-time column per driver, with fixed driver order. Freeze the lap column and heading rows. Below the matrix, show per-driver best, mean, median, sample standard deviation, representative pace, and included/excluded counts. Put a selected-driver detail table below the summaries with sectors, compound, tire age, position, pace inclusion, and exclusion reasons.

Calculated detail includes delta to the fastest comparable driver on that lap and delta to the driver's own best valid lap. A per-lap race-relative delta is unavailable when no comparable lap exists; it does not imply that cars crossed the timing line simultaneously. A selected-driver lap-time line chart uses gaps for absent laps and visibly distinguishes excluded observations.

### Fixed, explainable clean-lap policy

Keep every observed lap visible. Calculate inclusion using helper columns and these rules:

1. Exclude missing, nonpositive, incomplete, conflicting, or explicitly invalidated timing measurements.
2. Exclude lap 1 for the standing-start effect.
3. Exclude pit-in and pit-out laps, plus the first subsequent lap for a conservative tire warm-up buffer.
4. Exclude laps overlapping SC, VSC, red-flag, or applicable local-yellow intervals, and the first full lap after a restart. If event timing cannot be aligned reliably, expose that limitation rather than claiming a clean sample.
5. Identify slow outliers within each driver/stint among the remaining candidate laps. Compute candidate median and median absolute deviation (MAD). Exclude a lap above median plus the larger of 3 seconds and three scaled MADs (scale 1.4826). This is an initial configurable policy, not a motorsport truth.
6. Require five candidate laps before applying the outlier filter. Require five final clean laps for published representative pace and standard deviation; best recorded lap remains available independently. No recursive re-filtering.

Store structural flags in JSON; calculate candidate mask, median, MAD, final mask, counts, and statistics in SpreadJS. A long or degrading stint can be affected by the cutoff, so expose the threshold and excluded counts and label the result as a representative sample rather than an unbiased estimate.

Use `AVERAGE`, `MEDIAN`, `STDEV.S`, `MIN`, `FILTER`, `COUNTIFS`, `IF`, `IFERROR`, `AND`, and table lookups as appropriate. Empty filtered arrays and one-item samples must be handled explicitly.

### Conditional formatting priorities

Missing/invalid timing appears neutral with a status marker. Pit and caution flags get a border or symbol before pace coloring. Highlight the overall fastest valid lap in purple and each personal best in green without losing event labels. Apply the heatmap to clean lap deltas within a driver, using a labeled scale; this reveals consistency without confusing driver pace differences with within-stint variation. Selected-driver emphasis uses borders so it does not overwrite heatmaps.

## 11. Tire Strategy worksheet

Place the tire timeline first: one driver per row, laps 1–57 across columns, fixed name column, frozen headings. Cells contain S/M/H and compound colors; a pit boundary receives a strong vertical line and a pit marker. Use gray gaps for unavailable data or post-retirement laps. Mark safety-car periods in a separate header band using leader-lap context, while detailed exclusions still use each driver's timestamps.

Below the timeline, use a filterable stint table with driver, stint, compound, start/end laps, formula-derived length, initial tire age, clean sample count, mean, best, observed slope, adjusted degradation estimate, pit lane duration, and stationary stop time. Do not merge cells inside the table. Display the pit associated with the end of each stint, leaving the final stint's exit stop blank.

Stint length is end minus start plus one. Per-lap tire age is starting age plus lap minus stint start, so Piastri's first race lap starts with an age of 3. Average/best stint pace uses the clean mask, with insufficient-data handling. Add compact clean-lap sparklines per stint when at least five observations exist; missing laps should remain gaps.

Estimate an observed trend with `SLOPE` of clean lap seconds against tire age. Label it **observed lap-time slope**, since fuel, traffic, and changing conditions also affect it. The corrected estimate used for defaults is described next. Keep both values visible to teach why a negative observed slope need not mean the tire improves with age.

## 12. Bahrain-specific calibration and assumptions

Recommend a dry-race, linear tire-age model over Bahrain's 57 laps. It is intentionally transparent. It does not simulate overtaking, traffic queues, undercut track position, tire allocation inventories, nonlinear tire failure, driver adaptation, future safety cars, or weather-dependent grip.

Bahrain strategy should not assume a universal ordering in which Hard is always best for a long stint. Use this race's observations for compound offsets and slopes. Contemporary Pirelli commentary identified multiple viable compounds and two-stop windows around laps 14–20 and 34–40; these are useful starting search windows, not validation rules or proof of the optimal strategy. [Official qualifying report with Pirelli strategy commentary](https://www.formula1.com/en/latest/article/what-the-teams-said-qualifying-in-bahrain-2026.506QYDWHVvdEAXzrAjuaol)

Use a visible calibration block on Tire Strategy, with formulas referencing clean observations:

| Assumption | Recommendation and confidence handling |
| --- | --- |
| Fuel improvement | Begin with an explicitly illustrative 0.04 seconds per successive lap, editable from 0 to 0.10. Race lap times alone cannot independently identify fuel burn, tire degradation, and track evolution. This is a modeling assumption, not a measured Bahrain fact. |
| Corrected stint slope | Add fuel improvement × (race lap minus 1) to each clean lap time, then regress against tire age. Require at least 6 clean observations spanning at least 8 race laps. Exclude stints with unresolved boundaries. |
| Compound degradation defaults | Median qualifying corrected stint slope per compound, preferably selected driver; fall back to the field's qualifying stint estimates. Show source level and sample count. Negative estimates remain visible; use a nonnegative input floor with an explicit adjustment note. |
| Last-resort degradation | If a compound has no usable sample, use a clearly labeled provisional 0.05 seconds per tire-age lap for that compound. Do not describe fallback values as fitted race data. Make weak calibration a visible badge. |
| Compound pace offsets | For drivers with both Medium and another compound, compare median lap times corrected for assumed fuel and estimated tire age. Pool within-driver differences with a median. Set Medium = 0 as the reference; use zero with an “unestimated” note if comparisons are unavailable. These offsets remain confounded by stint timing and race conditions. |
| Selected-driver reference pace | Median of clean lap times after adding back fuel improvement and subtracting estimated degradation and compound offset. This is a full-fuel, fresh-Medium reference, not the unadjusted race average. |
| Net green-flag pit loss | Estimate the excess of a driver's pit-in/out pair over expected clean times at those race laps, using adjacent stint trends. Pool only well-covered green-flag stops without documented penalties or major incidents; use a median and show sample count. Exclude safety-car stops. |
| Pit-loss fallback | If fewer than three trustworthy pairs exist, use an explicitly provisional 23-second net loss with a visible 18–30-second exploration range. It is not the observed pit lane duration. Replace the fallback if the data supports a credible estimate. |
| Track evolution | No separate fitted coefficient in version one. Its effect is confounded with fuel and race time; discuss it in the model note rather than adding an unidentifiable parameter. |

Perform these calculations in workbook helper columns and formulas. Do not compute regressions in the download utility. Fit once from observed data and calibration-policy cells; copy suggested values to simulator inputs when initializing/restoring a driver. Editing a scenario must not silently refit its own reference pace.

Record the default-input snapshot and calibration basis for each selected driver. Reapplying “Actual Strategy” restores that snapshot. All numerical fallback values above are initial product-design assumptions to validate during implementation, not findings from a completed data study.

## 13. Strategy Simulator worksheet and calculation model

The first viewport contains actual driver context, editable assumptions, headline outputs, and What-If controls. Suggested layout: A1:L5 driver/actual summary; A7:D28 inputs; F7:L20 results; F22:L29 Goal Seek; A32:J39 primary sensitivity table. Below it, place scenario comparison, the per-lap ledger, and an expandable calibration/reference area. Keep all What-If changing cells on this worksheet.

### Inputs and validation

| Input | Recommendation |
| --- | --- |
| Stop count | List validation: 1 or 2. Actual strategies with more stops remain visible in reference calculations but are not editable candidates. |
| Pit laps | Whole numbers; end-of-lap convention. One stop: 1 ≤ P1 < 57. Two stops: 1 ≤ P1 < P2 < 57. Disable the second pit/third stint inputs for one-stop cases. |
| Compounds | Starting, second, third stint lists: Soft, Medium, Hard. Require at least two distinct dry compounds as this model's dry-race validity rule. |
| Starting tire ages | Nonnegative whole laps per active stint. Actual strategy restores observed ages; hypothetical new sets default to zero. |
| Base pace | Positive seconds, initially reference pace; accept a broad guardrail such as 70–130 seconds, clearly a UI sanity range. |
| Degradation | Three independent nonnegative rates, with a broad 0–0.30 seconds/tire-age-lap guardrail. |
| Compound offsets | Seconds relative to Medium. Medium's reference offset is zero; Soft and Hard remain editable, allowing either sign. |
| Pit loss | Net seconds per green-flag stop, editable with a 0–60-second sanity range. |
| Fuel effect | Positive per-lap improvement; use the calibration range above. |
| Target improvement | Seconds faster than official race duration, default 5. |

Reject invalid edits and display the reason near the result. Formula-level validity checks remain necessary because scenario application and pasted cells can bypass a simple dropdown interaction. A pit lap inside a historical safety-car window is allowed for hypothetical analysis but receives a model-limit note; this model assigns a constant green-flag pit loss.

### Transparent per-lap ledger

Use one row per simulated lap. Define these mathematical relationships in worksheet formulas:

| Component | Formula specification |
| --- | --- |
| Stint identity | Stint 1 through P1; stint 2 through P2 when active; otherwise final stint through lap 57. |
| Tire age at start of lap | Initial age for that stint + current lap − stint start lap. |
| Compound component | Lookup offset for the active compound. |
| Tire degradation component | Compound degradation rate × tire age at lap start. |
| Fuel component | − fuel improvement × (race lap − 1). |
| Racing lap estimate | Base pace + compound component + degradation component + fuel component. |
| Pit component | Net pit loss on each end-of-lap stop row, exactly once. |
| Estimated lap total | Racing lap estimate + pit component. |
| Stint total | Sum of corresponding lap totals; also expose degradation and pit components separately. |
| Model race total | Sum of all 57 lap totals. |

Show cumulative time and cumulative delta to the modeled actual strategy in adjacent columns and a small line chart. No TypeScript loop calculates lap pace or totals; it only writes the repeated formula structure.

The per-stint arithmetic check is: for length n and starting age a, degradation total equals rate × [n×a + n×(n−1)/2]. Fuel is summed over global race-lap numbers, not restarted after a pit. Use this independent relationship for testing, not as a second runtime simulation implementation.

### Honest comparison with the observed race

The actual race includes safety-car delays, start effects, traffic, penalties, and other effects this small model cannot reconstruct. A raw green-flag total must not be presented as a direct counterfactual official result.

Maintain a second formula ledger for the selected driver's **actual stint schedule**, supporting its observed number of stints. Evaluate that schedule with the same current degradation, compound offsets, fuel effect, and pit-loss assumptions as the candidate, but with the fixed calibrated **reference base pace**. Evaluate the candidate with its editable base pace.

Define:

- **Modeled actual-strategy time:** reference ledger total under current physical assumptions and fixed reference pace.
- **Modeled candidate time:** editable candidate ledger total.
- **Strategy delta:** modeled candidate minus modeled actual-strategy time. Negative is faster.
- **Historical adjustment:** official race duration minus modeled actual-strategy time.
- **Anchored projected race time:** modeled candidate plus historical adjustment, equivalently official race duration plus strategy delta.
- **Alternative delta:** candidate anchored projected time minus another saved candidate's anchored projected time. With identical physical assumptions this also equals the difference in raw model totals. If scenarios change degradation or other assumptions, display those differences alongside the comparison so the user can distinguish a strategy change from an assumption change.

The headline result is labeled **“Projected race time, anchored to the observed result.”** Show the raw model total and historical adjustment nearby, with a note that unmodeled race effects are assumed unchanged. An exact actual schedule with reference pace must have zero strategy delta, even when the common tire assumptions change. This anchoring is an accounting convention, not evidence that safety-car pit advantages or traffic would remain identical in a different strategy.

Reference pace must not follow the candidate's editable Base Pace cell. Otherwise Goal Seek would change both ledgers and lose its effect. The historical adjustment can depend on shared physical assumptions, but never on the candidate base pace or candidate pit/compound selection.

For identical 57-lap distances, the linear fuel term is common to both schedules and cancels from strategy delta. Show its contribution in raw model totals and calibration; do not suggest that varying this term alone creates a strategic advantage. A long one-stop may exceed observed tire-age coverage: flag extrapolation and avoid claims of practical optimality.

## 14. What-If Analysis design

### Data Table: first pit lap versus starting-compound degradation

Make this the primary sensitivity view. Column headers are first pit laps 14–22, one lap apart. Row headers are six degradation rates, initially 0.03–0.08 in steps of 0.01. If the current fitted starting-compound rate lies outside that band, center a documented six-row band around it instead of showing an irrelevant scale.

The row variable always targets the currently selected starting compound's degradation input cell; update the table reference and label together when that compound changes. Because the degradation assumption is shared, all candidate and reference stints using that compound receive it. Hold stop count, second pit lap, other compounds, offsets, base pace, and pit loss fixed.

Specify `SJS.TABLE` with five arguments: the local strategy-delta output reference; horizontal pit-lap headers; the First Pit Lap input reference; vertical degradation headers; the selected compound's degradation input reference. It returns a 6×9 grid. Enable dynamic arrays and reserve the complete spill region outside worksheet tables and merged cells. The function evaluates substituted inputs without permanently overwriting their current values. Wait for calculation completion before reading results. [SJS.TABLE reference](https://developer.mescius.com/spreadjs/docs/features/what-if-analysis/data-table/sjs-table-function)

Display signed seconds, a zero-centered favorable/unfavorable color scale, and the minimum valid combination. Invalid pit ordering must yield unavailable/error cells excluded from minimum calculations, not a false “best” time. Limit formatting to valid numeric outputs. Show the fixed second pit lap above the grid.

Keep 54 evaluations small enough for automatic recalculation. On Goal Seek and scenario comparisons, coalesce input events and avoid rebuilding the table during transient changes. Performance-test actual recalculation before adding workers or manual calculation modes.

### Optional second Data Table

After the primary workflow is complete, add first pit lap 14–22 against second pit lap 30–40 in two-lap steps for two-stop scenarios. Disable it for one-stop scenarios. It answers whether changing both windows improves the current compound plan, which the first table cannot show. Keep it collapsed below the primary grid and defer it if responsiveness or scope suffers.

### Goal Seek: “How fast do we need to be?”

Provide a compact workbook action and lightweight result dialog:

| Goal Seek concept | Workbook mapping |
| --- | --- |
| Target | Official race duration minus target-improvement seconds. |
| Goal formula cell | Anchored projected race time. |
| Changing value cell | Candidate Base Pace only. |
| Default question | Finish 5 seconds faster than the driver's observed race result. |

Call `GC.Spread.Sheets.CalcEngine.goalSeek` using changing sheet/row/column first, goal sheet/row/column next, then numeric target. Handle its documented synchronous or Promise result in the selected version. [Goal Seek API](https://developer.mescius.com/spreadjs/api/modules/GC.Spread.Sheets.CalcEngine)

Before solving, validate the strategy, stop scenario recording, save the current pace, and temporarily prevent conflicting driver/input actions. Await pending calculations. After solving, verify finite pace, allowed range, and target residual within 0.01 seconds. Show previous pace, required pace, improvement per lap, and achieved target. “Keep” retains the result; “Cancel” restores the saved value. Failure or an unacceptable solution restores the previous pace and explains why.

Generate the explanatory sentence from actual results; do not hardcode 0.18 seconds. For an otherwise identical actual strategy across 57 laps, a five-second target requires approximately 0.0877 seconds per lap. A different pit strategy can require a larger or smaller change. Test that relationship to detect an incorrectly moving reference baseline.

### Native Scenario Analysis

Use `spread.scenarioManager` as the sole scenario store and the native Scenario Panel as the management UI. The native manager supports capture with `setActiveScenario`, retrieval/listing, application, restoration, and removal. Base-value restoration is not equivalent to restoring the observed race's assumptions. [Scenario Manager documentation](https://developer.mescius.com/spreadjs/docs/features/what-if-analysis/scenario-manager)

Seed these scenarios for eligible drivers, keeping calibration inputs identical initially so the first comparison isolates pit/compound strategy:

| Scenario | Initial assumptions |
| --- | --- |
| Actual Strategy | Observed stops, compounds, tire ages, calibrated reference pace, and common default physical assumptions. |
| Aggressive One-Stop | Soft → Hard, stop after lap 22, new sets unless specifically edited; label long-stint extrapolation. |
| Conservative One-Stop | Medium → Hard, stop after lap 28; same reference pace and physical assumptions. |
| Two-Stop Attack | Soft → Medium → Medium, stops after laps 14 and 36; same reference pace and physical assumptions. |

These are educational candidate schedules, not claimed race-optimal choices. Actual Strategy is Piastri's observed 14/32 schedule; do not replace it with a generic two-stop preset.

Record the complete candidate input block, including inactive pit/compound/age cells with consistent harmless values, base pace, degradation, offsets, fuel effect, and pit loss. Limit the block to fewer than 32 changing cells to preserve an approachable layout and potential Excel portability. Exclude formula outputs, official results, reference calibration, target improvement, and sensitivity headers.

Use a driver/session prefix in each native name, such as “2025 PIA — Actual Strategy,” to avoid identity collisions. Seed scenarios by activating native capture, assigning the intended input values, and deactivating capture. When saving current assumptions, use native capture for the complete input block, including unchanged inputs; verify this behavior in the compatibility spike. Do not create a parallel JSON scenario engine.

Applying another scenario first restores any previously applied scenario state, then applies the chosen native scenario as one update. Disable capture during driver loading and Goal Seek. Provide **Restore Actual Strategy** as a dedicated action that reapplies the protected default snapshot/native scenario, rather than relying on generic native restore.

Users create a named scenario, record edits, stop recording, and switch between saved names through native functionality. “Save Current Strategy” uses the same native store. Check the pinned panel's available commands and use a small adapter action only for any missing convenience operation.

For comparison, apply each native scenario in a controlled transaction, recalculate, and read the formula outputs into a visible comparison table containing scenario name, stops/compounds, base pace, projected time, delta, and calibration warnings. Label these cells **comparison snapshots**. TypeScript orchestrates and copies results; it never computes them. Restore the original user inputs/applied-state afterward, even on failure. Rebuild snapshots after scenario edits or a calibration change and visibly mark stale snapshots until refreshed.

Retain all saved scenarios in the native manager for the workbook session. Only current-driver scenarios may be applied or activated for capture. Use the cancellable `ScenarioChanging` event to reject foreign-driver application/activation and protect built-in scenarios against modification/removal; update comparison snapshots after `ScenarioChanged`. The native panel may display other drivers' prefixed names; a short message explains that the user must select that driver first. This avoids another scenario store and preserves saved work when the user switches away and returns. Confirm event action names and protection behavior in phase 1. [Native scenario events and protection](https://developer.mescius.com/spreadjs/docs/features/what-if-analysis/scenario-manager)

### Excel-compatible behavior

Demonstrate formulas, references, validation, tables, and familiar What-If workflows without promising perfect Excel round-tripping. Keep Data Table output, headers, and input references on the simulator sheet and use two variables. SpreadJS documents best-effort conversion of `SJS.TABLE` to Excel data tables, with structural restrictions; `SJS.TABLE` is not itself a standard Excel formula. Native scenarios also have scope differences between SpreadJS and Excel. [What-If Excel compatibility](https://developer.mescius.com/spreadjs/docs/features/what-if-analysis/excel-compatibility)

If export is later added, require an actual Excel open/recalculate/reimport check for tables and scenarios and include the appropriate licensed I/O package. Do not imply that this has been tested in the initial sample.

## 15. Driver-selection behavior

Use the shell dropdown as the single editable driver selector. Reflect it in a named selected-driver cell and show the name in each relevant sheet. Dropdown labels combine abbreviation, full name, and result status.

On change, commit or cancel any active cell edit, stop scenario capture, suspend visual updates, load the driver's reference context and default inputs, update named selection/chart ranges, seed/activate that driver's scenarios, recalculate once, and resume rendering. Keep the currently active worksheet. The original observation tables are not rebuilt or refetched.

Show actual time/status, start/finish, compound sequence, pit laps, representative pace and sample count, initial tire ages, and calibration confidence. The read-only sheets remain available for every driver.

Enable full-distance historical anchoring and Goal Seek only when the driver has a valid full-distance classified duration and sufficient actual stint coverage. For DNF, DNS, DSQ, lapped finishers, or incomplete baselines, show “No comparable 57-lap official baseline”; retain observed analysis and optionally raw hypothetical totals, but disable the anchored target and actual-time claims. Drivers with more than two observed stops can have a reference ledger, but display that their actual strategy cannot be restored into the simplified one/two-stop input editor; choose another default demonstration driver.

## 16. SpreadJS features tied to the workflow

| Feature | Concrete analytical use |
| --- | --- |
| Formulas and named ranges | Inspectable pace metrics and simulation dependencies. |
| Structured tables and filters | Driver, lap, and stint observations with calculated columns. |
| Charts | Representative pace, selected race position, cumulative strategy delta. |
| Conditional formatting | Clean-lap consistency, pit/caution markers, tire compounds, sensitivity outcomes. |
| Number formats | Lap/race elapsed times, signed deltas, rates, sample counts. |
| Validation and dropdowns | Compound choice, stop count, pit ordering, numeric assumptions. |
| Frozen rows/columns | Maintain driver/lap context in wide matrices. |
| Styles and protection | Distinguish editable inputs, observations, and formulas. |
| Sparklines | Compact within-stint pace trends where sample coverage supports them. |
| Dynamic arrays and Data Tables | Recalculate pit/degradation combinations using the same model. |
| Goal Seek | Solve required pace for a target race-time improvement. |
| Scenario Manager and Panel | Capture, apply, restore, and compare named assumptions. |

## 17. Proposed files and module boundaries

The following is a file plan, not a request to create these files now.

| Future path | Responsibility |
| --- | --- |
| `index.html` | Minimal shell, controls, workbook/panel hosts. |
| `package.json` and lockfile | Pinned dependencies; dev, build, preview, typecheck, data-fetch, and focused verification tasks. |
| `tsconfig.json`, `tsconfig.scripts.json`, `vite.config.ts` | Strict browser/script boundaries and simple Vite configuration. |
| `scripts/fetch-bahrain-data.ts` | Developer command orchestration and atomic dataset output. |
| `scripts/openf1-client.ts` | Development-only fetch, pacing, retries, errors. |
| `scripts/normalize-bahrain.ts` | Joins, null normalization, timestamps, validation/report. |
| `scripts/types/openf1.ts` | Narrow source-response interfaces. |
| `src/types/race.ts` | Normalized dataset contracts. |
| `src/types/strategy.ts` | Inputs, eligibility, and calibration contracts. |
| `src/data/bahrain-race.json` | Approved, generated observations and provenance. |
| `src/data/load-race.ts` | Static import and schema/version sanity checks. |
| `src/main.ts` | Bootstrap, shell event wiring, reset, teardown. |
| `src/styles.css` | Shell and native panel sizing, accessible control styles. |
| `src/workbook/create-workbook.ts` | Initialize SpreadJS, assemble sheets, bulk loading order. |
| `src/workbook/config.ts` | Typed names, addresses, ranges, validation limits. |
| `src/workbook/styles.ts` | Small formatting, compound colors, legend helpers. |
| `src/workbook/sheets/data.ts` | Observation tables and shared helper formula columns. |
| `src/workbook/sheets/dashboard.ts` | Overview formulas and charts. |
| `src/workbook/sheets/lap-analysis.ts` | Lap matrix, statistics, detail view, formatting. |
| `src/workbook/sheets/tire-strategy.ts` | Timeline, stint summaries, calibration formulas. |
| `src/workbook/sheets/strategy-simulator.ts` | Inputs, both formula ledgers, outputs, sensitivity layout. |
| `src/workbook/driver-selection.ts` | Atomic selection updates, context, scenario coordination. |
| `src/workbook/what-if.ts` | Native Data Table setup, Goal Seek lifecycle, scenario adapter and comparison orchestration. |
| `tests/normalization.test.ts` | Small transformation fixtures for meaningful edge cases. |
| `tests/workbook.spec.ts` | Browser checks of actual SpreadJS formulas and interactions. |
| `README.md` | Run/refresh instructions, model explanation, demo walkthrough. |
| `_docs/data-provenance.md` | Dataset review, acquisition details, unresolved coverage/corrections. |
| `THIRD_PARTY_NOTICES.md` | Approved attribution and redistribution terms. |

Use plain functions receiving a workbook/reference object and typed data. Avoid repositories, services, factories, dependency injection, application state frameworks, and a generic workbook DSL. Add a helper only after a real repeated operation warrants it. Keep all formula text close to the worksheet it explains.

Use a small TypeScript runner for developer utilities and a supported Node/Vite combination pinned during setup. Vite's vanilla TypeScript template is sufficient. [Vite setup guide](https://vite.dev/guide/)

## 18. Implementation phases and completion checks

| Phase | Deliverable | Completion criterion |
| --- | --- | --- |
| 1. Compatibility and data audit | Pin SpreadJS; small disposable validation fixture for native scenarios, `SJS.TABLE`, and Goal Seek; inspect every required data feed. | All three native What-If APIs work together; scenario-save/switch semantics settled; dataset coverage known; commercial publication permission request assigned. |
| 2. Data pipeline | Typed client, normalizer, bundled JSON, provenance report. | Session 10014 identity verified; structural invariants pass; no analytical results precomputed; refresh failure preserves prior fixture. |
| 3. Workbook foundation | Minimal shell, Data sheet, units/styles/names, dashboard and static tables. | Runs with internet disabled from local static hosting; zero OpenF1 runtime requests; final classification/status matches source. |
| 4. Lap and tire analysis | Clean-lap policy, statistics, timeline, slopes, calibration. | Exclusions traceable per lap; missing observations handled; fitted/default assumptions labeled; summaries are formulas. |
| 5. Strategy model | Input validation, per-lap/reference ledgers, anchored outputs, driver switch. | Hand-calculable cases match; actual schedule gives zero delta; unsupported baselines do not show misleading targets. |
| 6. What-If workflows | Primary Data Table, Goal Seek, four native presets, scenario capture/comparison. | Grid agrees with direct substitutions; target solver works/cancels; scenario comparison restores state; no custom simulation/scenario engine. |
| 7. Demo polish and release | Charts, formatting, documentation, performance/offline checks, notices. | All acceptance checks pass and data/product redistribution permission is documented before publication. |

Only consider the second sensitivity table after phase 6 passes. Exclude export, persistent scenario storage, extra race selection, and a more complex tire model from the first release.

### Focused validation

- **Data invariants:** unique driver/lap keys; monotonic laps; stint coverage and no overlap; valid pit boundaries; positive durations or null; sorted events; result status preserved. Compare Piastri's 14/32 pit schedule and 5,739.435-second final time to the verified observations.
- **Normalization cases:** null timing, deleted/duplicate lap, used tires, retirement, DSQ, lap-deficit gap, pit-out numbering, driver-specific yellow flag, caution overlapping only part of a lap, unclosed caution interval.
- **Formula cases:** missing samples never become zero; no `STDEV.S` on one item; slope requires adequate span; both cumulative and stint totals agree with the per-lap ledger.
- **Model invariants:** with zero offsets/degradation/fuel, raw time is 57 × base pace + stops × pit loss; changing candidate base pace by 0.1 seconds changes total by 5.7 seconds; increasing stop loss by 1 second changes raw candidate time by candidate stop count; changing pit boundaries preserves 57 covered laps.
- **Anchoring checks:** actual schedule/reference pace gives zero delta; shared fuel changes cancel from delta; candidate pace changes do not alter reference pace; one-versus-two-stop delta responds to common pit loss by the stop-count difference.
- **What-If checks:** corners and middle of the sensitivity table match temporary direct input substitution within 0.001 seconds; invalid combinations cannot win; table evaluation preserves original inputs; Goal Seek reaches a five-second target within 0.01 seconds and Cancel restores inputs; scenario apply/save/restore and comparison cleanup preserve state.
- **UX and deployment:** keyboard input, readable heatmaps, resizing, reset, all eligible driver switches, local assets only, clean startup error for invalid fixture, no API access during build or browser load.
- **Performance:** measure on the designated demo laptop; target a usable workbook within about 3 seconds after local assets load and ordinary input/sensitivity updates within about 500 ms. These are acceptance targets to measure, not current benchmarks. Keep data ranges bounded and batch workbook writes before considering workers.

Use transformation tests for data semantics and browser tests for SpreadJS calculations. Do not build a second production simulator just to test the first one; use small independent mathematical fixtures.

## 19. Risks and explicit decisions

| Risk or edge case | Decision |
| --- | --- |
| API field drift, historical nulls, missing endpoint | Version contracts and fail the refresh visibly; keep the previous valid JSON. |
| Final penalties/DSQ differ from on-track order | Use final classification for finish and raw position events for the race chart; label their distinct meanings. |
| Official duration differs from sum of recorded laps | Preserve official duration; show coverage and use the reference-model adjustment, not fabricated missing laps. |
| Sector totals differ slightly from lap time | Keep source values; tolerate documented timing precision, flag larger disagreements. |
| Pit lane transit mistaken for net race loss | Store lane and stationary observations separately; estimate net loss in formulas. |
| SC affected actual second stop | Show the limitation of constant green-flag pit loss; do not claim to reproduce the counterfactual safety-car advantage. |
| Fuel/degradation/compound confounding | Use conditional, labeled estimates and field fallbacks; never describe slopes as measured tire physics. |
| Long one-stop outside observed data | Mark tire-age extrapolation; keep it demonstrable but not asserted feasible. |
| Tire sets reused or unavailable | Support observed starting age; hypothetical tire inventory is not modeled and is disclosed. |
| Null finish time, lapped driver, DNF/DNS/DSQ | Keep observed analysis, disable unsupported full-distance anchoring and Goal Seek. |
| Actual driver has more than two stops | Reference ledger supports all stints; candidate editor remains one/two-stop and clearly cannot replay that actual schedule. |
| Scenario capture accidentally includes programmatic loading | Stop capture before loads/solves and restrict editable changing ranges. |
| Native restore does not restore race defaults | Dedicated Restore Actual Strategy action uses the baseline snapshot. |
| Dynamic-array spill conflict | Reserve sensitivity result areas and prevent typing/merges inside them. |
| Workbook and scenario recalculation race | Await calculation completion and serialize user operations. |
| Hidden data undermines the educational value | Allow unhiding and provide formula bar plus a concise model explanation. |
| Excel behavior overclaimed | State verified compatibility boundaries; export remains deferred. |

## 20. Data licensing, attribution, and publication requirements

**Permission status update, September 28, 2026:** the project owner reports that Bruno Godefroy at OpenF1 gave direct permission to use the data in videos, blogs, demos, and a public GitHub Pages demo with the data bundled in the application. The implemented sample records this permission in its dataset provenance and notices. OpenF1's public homepage still describes general educational, research, and non-commercial uses and directs other users to contact the project; the direct grant, rather than those general terms alone, is the basis for the stated uses. [OpenF1 usage statements and FAQ](https://openf1.org/)

The linked repository license is CC BY-NC-SA 4.0; it does not replace the reported direct grant or establish the scope of other rights. [OpenF1 repository license](https://github.com/br-g/openf1/blob/main/LICENSE)

The publishing owner should retain the underlying permission communication and confirm any conditions that apply to the stated videos, blogs, and demos. Public source-repository redistribution of the bundled JSON was not specified in the reported grant and should be confirmed before that separate distribution. No contact or publication action was part of the original planning deliverable.

The implemented provenance record and third-party notices include source links, race/session identity, retrieval date, normalization description, and the reported direct-permission reference. The workbook attribution links to OpenF1. Avoid F1/team logos and Pirelli graphics; descriptive names and custom compound cells suffice. Do not claim affiliation or endorsement.

The OpenF1 grant authorizes the uses reported above; it does not by itself authorize public distribution of the JSON as a separate source artifact. Separately confirm the appropriate SpreadJS runtime/chart licenses and distribution configuration for the demo domain; no license acquisition is implied by this plan.

## 21. Finished-sample demonstration

The finished sample will let a user explain a real Bahrain race, inspect the laps behind a pace estimate, see how tire strategies differed, and test a driver's alternative strategy through visible spreadsheet formulas. A sensitivity heatmap, a target-driven Goal Seek operation, and named native scenarios will show why an Excel-compatible JavaScript spreadsheet is useful as an analytical application platform. The race observations will be bundled and deterministic, while the analysis remains interactive and inspectable inside SpreadJS.
