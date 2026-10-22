# TerraGuard GIS diagrams

Six editable diagrams separate the **implemented local prototype** from the **proposed diploma system**. Read the status banner before using a figure in the report. All labels are English; vector SVGs and high-resolution PNGs use a fixed white/green/teal theme.

## Diagram inventory and report mapping

Each row links to the native source and both exports. Use SVG for scalable figures and PNG for Microsoft Word. Keep the title and status visible when inserting a figure.

| Diagram | Status and purpose | Report sections supported | Editable source | SVG | PNG |
| --- | --- | --- | --- | --- | --- |
| 01 — Current System Context | Implemented local prototype, application boundary, external OpenStreetMap, synthetic inputs | Current-state comparison for §7.1; plan §1.1 | [drawio](source/01-current-system-context.drawio) | [SVG](exports/01-current-system-context.svg) | [PNG](exports/01-current-system-context.png) |
| 02 — Current Component Architecture | Browser, Express modules, pg, PostGIS and local Docker packaging | Current-state comparison for §7.3; plan §§2.1, 3.1 | [drawio](source/02-current-components.drawio) | [SVG](exports/02-current-components.svg) | [PNG](exports/02-current-components.png) |
| 03 — Current Database ERD | Four domain tables after migrations 001 and 002; actual keys, columns and constraints | Current-state comparison for §7.4; plan §3.2 | [drawio](source/03-current-erd.drawio) | [SVG](exports/03-current-erd.svg) | [PNG](exports/03-current-erd.png) |
| 04 — Proposed Use Cases | Representative domain responsibilities; not an approved permission matrix | §§6.1, 7.2 | [drawio](source/04-proposed-use-cases.drawio) | [SVG](exports/04-proposed-use-cases.svg) | [PNG](exports/04-proposed-use-cases.png) |
| 05 — Proposed Topsoil Workflow | Source-to-restoration chain, validation branches and synthetic book balance | §§6.1, 7.4–7.7; plan §3 | [drawio](source/05-proposed-topsoil-workflow.drawio) | [SVG](exports/05-proposed-topsoil-workflow.svg) | [PNG](exports/05-proposed-topsoil-workflow.png) |
| 06 — Proposed Target Architecture | Planned modules on the existing baseline; dotted optional gateway | §§5, 7.1–7.7; plan §§2.1, 3.1 | [drawio](source/06-proposed-target-architecture.drawio) | [SVG](exports/06-proposed-target-architecture.svg) | [PNG](exports/06-proposed-target-architecture.png) |

Diagrams 01–03 document code and schema, rather than reproduce the report's proposed figures. Diagrams 04–06 describe intended requirements and design; they do not establish implementation or acceptance-test success.

## Evidence and scope

The repository baseline is `WhiteeRay/TerraGuard-GIS`, `main` commit `f1fa4484fc16f7b72e5649712ad98278a55b410a`, inspected on 23 October 2026. The supplied `TerraGuard GIS.zip` and extracted local project provide the complete prototype packaging. All 36 source, test and script files present in that GitHub baseline match their corresponding archive files byte for byte; the repository stores application files under `src/`, while the archive uses root-level `client/`, `server/` and `database/`.

Primary implementation references:

- [Client views](../src/client/views/), [API client](../src/client/lib/api.js), [Leaflet map](../src/client/lib/map.js), [charts](../src/client/lib/charts.js).
- [Express application](../src/server/app.js), [routes](../src/server/routes.js), [request validation](../src/server/validation.js), [repositories](../src/server/repositories/), [services](../src/server/services/), [pg pool](../src/server/db.js).
- [Migration 001](../src/database/migrations/001_initial.sql), [migration 002](../src/database/migrations/002_monitoring_attributes.sql), [migration runner](../src/database/run.js), [synthetic seed](../src/database/seeds/demo.sql), [tests](../tests/).
- Archive-only packaging inspected: `package.json`, `vite.config.js`, `Dockerfile`, `compose.yaml`, `client/index.html`, `server/index.js`, `server/config.js`, `server/errors.js`. These files are evidence for the local prototype; this documentation change does not add or repair runtime code.
- Supplied `TerraGuardGIS_Report.docx`, especially §§6–7, and `TerraGuard_Plan.docx`, especially §§1–3. Only relevant design content is used; original documents and respondent data are not copied here.

The exact filenames `TerraGuard GIS(2).zip` and `README (1)(1).md` were not located in the inspected materials. The supplied archive, both existing READMEs and current GitHub tree were used instead. Input filenames and hashes are recorded in [provenance.json](provenance.json).

## Differences that must remain explicit

1. **Technology:** The academic report provisionally selects FastAPI and OpenLayers. Implemented code uses Express and Leaflet; the implementation plan continues this baseline. Diagram 06 preserves it and requires a documented architecture decision for a future migration.
2. **Repository completeness:** The baseline README describes a design-only package despite existing source and tests. GitHub lacks the local prototype's dependency definitions, Docker/Vite files, client entry page and several server runtime files. Tests retain root-level imports that do not match the repository's `src/` layout. Current diagrams describe the supplied prototype, not a newly verified runnable `main` release.
3. **Data model:** Current domain tables are `projects`, `zones`, `soil_measurements`, `activities`. The runner additionally creates the operational `schema_migrations` ledger. Users, memberships, sampling points, batches, batch operations, rule versions, alerts, audit entries and attachments are planned entities.
4. **Observations and rules:** Current records have moisture, temperature, pH, time and optional depth/recorder/notes. They do not implement the report's full property/unit/method/quality model. Current explainable demo rules are configured in code/environment, rather than persisted approved rule versions with historical input snapshots.
5. **Material accounting:** Current activity volumes describe individual operations. They do not establish batch provenance, transactional available quantities or equivalent in-situ and loose stockpile volume. Diagram 05's 100 − 40 = 60 m³ is a synthetic consistency fixture on one reporting basis; batch mixing remains excluded.
6. **Imports, exports and integrations:** The prototype has client-side CSV export for measurements and activities. CSV import, permission-scoped monitoring reports, protected laboratory evidence, RBAC/site membership and audit history are planned. The IoT gateway is optional; no live sensors are represented as operational.

## Open and edit in diagrams.net

1. Open [app.diagrams.net](https://app.diagrams.net/) in Chrome.
2. Choose **Device**, or **File → Open From → Device**, then select a file in `diagrams/source/`.
3. Select any shape or connector to move it or change its properties. Double-click a label to edit text. Each source contains native mxGraph vertices and edges; no diagram is a screenshot.
4. Save back to the same `.drawio` file. Keep current/proposed banners and border conventions accurate when changing scope.
5. Re-export SVG and PNG after editing. Both delivered formats also embed the native model, but `source/*.drawio` remains the editing master.

The editor may adapt colours to its dark theme. Delivered exports are explicitly rendered in light mode. Dense diagrams are best placed on a landscape report page; use their original-resolution PNGs instead of browser screenshots.

## Regenerate exports

In the web editor, use **File → Export As → SVG** and **PNG**. Keep a white background, enable **Include a copy of my diagram**, and export PNG at 200% with a 20-unit border. Keep SVG text as vector text.

For reproducible local exports, install the official [draw.io Desktop](https://github.com/jgraph/drawio-desktop/releases) and run from the repository root:

```bash
python3 diagrams/tools/export_diagrams.py --drawio /Applications/draw.io.app/Contents/MacOS/draw.io
python3 diagrams/tools/validate_diagrams.py > diagrams/validation.json
```

`--drawio` may point to another installed executable; alternatively set `DRAWIO_BIN` or put `drawio` on `PATH`. The export script reads the edited native files, uses light mode, embeds the native model, and writes 2× PNGs and SVGs with cell metadata. It does not regenerate or overwrite source layouts.

The delivered exports used official draw.io Desktop **32.5.5**. See [VALIDATION.md](VALIDATION.md) for editor checks, renderer round trips and their limits. Re-run visual review after any edit; XML validation alone cannot establish good layout.

## Review workflow

Changes are isolated on `docs/terraguard-system-diagrams` from the recorded baseline. Only this directory and a short root README section belong to the change. Review current-versus-proposed scope and preview exports before merging the pull request into `main`. No application code, migration, credential file or teammate history is changed.
