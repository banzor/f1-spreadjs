# Third-party notices and release status

The repository's [MIT license](LICENSE) covers its original application code and documentation only. It does not license the OpenF1-derived dataset or SpreadJS to downstream users. Each remains subject to its own terms and permissions.

## OpenF1 race observations

Source: [OpenF1](https://openf1.org/). The bundled `src/data/bahrain-race.json` is a normalized, trimmed adaptation of historical OpenF1 observations for the 2025 Bahrain Grand Prix. It was produced by the development utility in `scripts/`; the snapshot includes request and checksum provenance.

The project owner confirmed on September 28, 2026 that Bruno Godefroy at OpenF1 granted direct permission to use this data in videos, blogs, demos, and a public GitHub Pages demo with the data bundled in the application. Those uses are authorized by the reported direct grant; the sample does not rely on OpenF1's general public terms alone. The grant's exact wording and any conditions should be retained with the publishing records. Public redistribution of the bundled JSON as a separate source-repository artifact was not specified and should be confirmed before that distribution. OpenF1's general [site terms](https://openf1.org/) and [repository license](https://github.com/br-g/openf1/blob/main/LICENSE) remain available for reference.

Attribution shown in the application: “OpenF1 data used with permission · unofficial analysis.” The app is not affiliated with or endorsed by Formula 1, the FIA, or the participating teams. Direct data permission does not imply OpenF1 endorsement.

## SpreadJS

SpreadJS is a commercial MESCIUS component. Packages are pinned to version 19.2.3. The project includes no production license key. The publishing owner must configure a license for the intended host and distribution model before release.
