# Bahrain dataset provenance

The bundled snapshot is generated from OpenF1's 2025 Bahrain Grand Prix race session **10014**, meeting **1257**, at Sakhir. The race ran on April 13, 2025. OpenF1 is the original source for all records bundled by the development utility. The JSON file records retrieval time, requested URLs, raw-response SHA-256 checksums, normalized-content checksum, normalizer version, and data-quality notes.

The acquisition utility requests `/sessions`, `/meetings`, `/drivers`, `/starting_grid`, `/session_result`, `/laps`, `/stints`, `/pit`, `/position`, `/race_control`, and `/weather`. It joins race observations by session and driver number; aligns pit entries to stint boundaries; carries lap/sector times and position observations; and maps race-control intervals onto each driver's lap timestamps. It does not bundle telemetry, team radio, images, or raw response dumps.

OpenF1's `/starting_grid?session_key=10014` returned 404 during generation. The normalized grid positions therefore come from the last `/position` observation for each driver before the scheduled race start. The resulting positions match the published starting grid, including the Mercedes grid penalties, but they retain a `GRID_FEED_UNAVAILABLE` quality note. Any future refresh should review this fallback instead of assuming the endpoint is permanently absent.

OpenF1's lap records do not always reconstruct the official final duration when summed because race timing and lap boundaries have separate source semantics. The workbook keeps the official `/session_result` duration as the historical truth. The strategy model displays its own raw total and a separate historical adjustment.

Race-control messages describing an incident involving a safety-car infringement are not treated as a safety-car deployment. The actual deployment and end messages define the safety-car interval. Deleted lap notices are linked to the indicated driver and lap so the clean pace mask can exclude them. Unclosed or ambiguous caution intervals are reported in JSON rather than silently ignored.

The normalizer sorts race-control events after converting their timestamps to UTC. Sainz has an incomplete, untimed lap 46 following his 45 completed laps; it is retained as a missing-time observation without inventing a tire stint or counting it as clean pace.

The calibration is calculated by spreadsheet formulas after runtime loading. The dataset does not contain average pace, medians, standard deviations, tire degradation, projected times, or scenario results. Formula defaults are educational estimates and have visible sample coverage or provisional labels.

The dataset's `permissionReference` records the project owner's September 28, 2026 confirmation that Bruno Godefroy at OpenF1 gave direct permission to use the data in videos, blogs, demos, and a public GitHub Pages demo with the data bundled in the application. This is a direct-permission basis for those uses, distinct from OpenF1's general public terms. The underlying communication should be retained with the publishing records; its exact wording and conditions are not stored in this repository. Public redistribution of the normalized JSON as a separate source-repository artifact was not specified and should be confirmed before that distribution. OpenF1's permission does not itself resolve any independent rights in Formula 1 marks or other third-party material.

Sources: [OpenF1 API reference](https://openf1.org/docs/), [OpenF1 usage statements](https://openf1.org/), [official 2025 race result](https://www.formula1.com/en/results/2025/races/1257/bahrain/race-result), and [official starting grid](https://www.formula1.com/en/results/2025/races/1257/bahrain/starting-grid).
