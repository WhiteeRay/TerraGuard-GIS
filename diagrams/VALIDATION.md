# Diagram validation record

Validated on **23 October 2026** against the baseline and supplied files described in [provenance.json](provenance.json). This is evidence about diagram files and their technical content, not application acceptance, field monitoring or environmental performance.

## Editor and export results

All six `.drawio` files were individually opened using **File → Open From → Device** in **Google Chrome / app.diagrams.net**. Each full canvas was inspected, native shapes/connectors were selectable, and each file was reopened in a second pass. No invalid-XML or import error was reported. Selecting all objects produced native selection handles rather than selecting one embedded picture.

Exports were generated with the **official draw.io Desktop 32.5.5 CLI**, rather than claimed as manual web-editor exports. The official ARM64 distribution archive SHA-256 was checked against its published release checksum: `df9313115c41f46ae8fad608857e390853edc8c81a938bdd19b759eb917cb11e`. The temporary renderer is outside the repository.

Every final PNG was visually inspected, and all six final SVGs were rendered and inspected in Chrome using a local preview gallery. The light exports have readable labels, clear statuses, landscape layouts and directed or UML association connectors. Review corrected a crowded use-case heading, an ERD connector orientation, long labels and workflow return paths. The editor's dark theme adapts displayed colours; the exports explicitly use light mode.

| Diagram | Native vertices | Connectors | PNG pixels | Web editor opened + reopened | Native model retained in SVG and PNG |
| --- | ---: | ---: | --- | --- | --- |
| 01 — Current context | 15 | 6 | 3285 × 2050 | Passed | Passed |
| 02 — Current components | 36 | 13 | 3447 × 2530 | Passed | Passed |
| 03 — Current ERD | 59 | 4 | 3607 × 2690 | Passed | Passed |
| 04 — Proposed use cases | 32 | 13 | 3342 × 2390 | Passed | Passed |
| 05 — Proposed lifecycle | 25 | 20 | 3926 × 3010 | Passed | Passed |
| 06 — Proposed architecture | 35 | 11 | 3730 × 2950 | Passed | Passed |

The machine-readable counts, dimensions and SHA-256 hashes in [validation.json](validation.json) are authoritative if this table is refreshed after editing.

## Automated file checks

`python3 diagrams/tools/validate_diagrams.py` passed for all six diagrams:

- Source XML parses; cell IDs are unique and connector endpoints resolve.
- All source vertices have positive dimensions and fit the declared page.
- No raster/image vertices or locked/non-editable cells occur in the sources.
- SVGs parse, use a fixed light colour scheme and contain vector shapes/text rather than raster `<image>` elements.
- PNG headers and dimensions are valid, with at least 3000 × 2000 pixels per export.
- The embedded native models in both SVG and PNG retain the exact source cell IDs, labels and relationship endpoints.

Each final source was also reopened by draw.io Desktop and exported as uncompressed XML. Comparing all six round trips with their originals found identical cell IDs, labels and connector endpoints. Temporary round-trip files are outside the repository.

`git diff --check` passed. Only diagrams and a short root README addition are part of the Git change. No application source, tests or SQL migration is modified.

## Content cross-checks

- **01–02:** Traced frontend API calls, Express `/api` mounting, routes, repositories, services, pg access, Leaflet tile URL and local Compose/Docker/Vite packaging. OpenStreetMap is external; Vite is a build/development tool; browser execution is distinguished from served assets.
- **03:** Cross-checked both SQL migrations, including nullable metadata, generated aliases, geometry SRID, value checks, one-to-many cardinalities and the project-consistent composite activity FK. The migration-runner ledger is explicitly separate from the four domain tables.
- **04:** Checked the thirteen requested use cases against report §§6.1 and 7.2. Associations are representative responsibilities, not an inference that job titles automatically grant permissions.
- **05:** Checked all twelve lifecycle stages, three rejection/clarification decisions, the layer-volume formula and the report's synthetic 100/40/60 m³ fixture. In-situ/loose volumes are distinguished and mixed batches remain excluded.
- **06:** Checked planned modules against report §7 and the implementation plan. Solid, dashed and dotted borders distinguish existing modules, planned modules and optional IoT. Express/Leaflet remain the technical baseline; migration requires a documented decision.

## Limits and review needs

Application tests and deployment were not rerun for this documentation-only change. The cloned `main` baseline is missing runtime/configuration files and retains test imports that do not match its `src/` layout. It cannot be called a newly verified runnable release. The supplied local project provides packaging evidence without those files being added here.

No user evaluation, real-sensor connection, laboratory integration, physical volume conservation, agronomic threshold validation or implementation of the proposed modules is established by these checks. Diagram content should be reviewed by the project team before merging into `main` and refreshed as implementation changes.
