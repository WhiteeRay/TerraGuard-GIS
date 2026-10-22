# TerraGuard GIS

**A map-based system for documenting topsoil monitoring, preservation and restoration during construction.**

TerraGuard GIS is a Software Engineering diploma project at Astana IT University. It proposes a connected record of where topsoil originated, where it was stored, which observations were collected and how the material was later reused.

> **Development stage:** Research, requirements analysis and system design. The features described below are planned capabilities, not a released application.

[Overview](#project-overview) | [Planned functionality](#planned-functionality) | [Architecture](#proposed-architecture) | [Documentation](#documentation-and-current-status) | [Team](#team) | [YouTrack](#project-tracking)

## Diagrams

[Editable diagrams and SVG/PNG exports](diagrams/README.md) distinguish the current local prototype (context, components and actual database schema) from proposed use cases, the topsoil lifecycle and target architecture. Start with the [component diagram](diagrams/source/02-current-components.drawio) or [ERD](diagrams/source/03-current-erd.drawio). The source baseline uses Express and Leaflet; the report's FastAPI/OpenLayers choices remain proposals. The [evidence notes](diagrams/README.md#differences-that-must-remain-explicit) explain differences between this repository, the supplied local prototype and the report; these diagrams do not establish a runnable `main` release.

## Project overview

**Working name:** TerraGuard GIS

**Diploma topic:** Development of an intelligent geoinformation system for monitoring, preserving, and restoring the fertile soil layer during construction.

| Academic information | Details |
| --- | --- |
| University | Astana IT University |
| Educational programme | Software Engineering |
| Supervisor | Nadirov Nurtas |
| Year | 2026 |

The project's main focus is traceability. A user should be able to follow a recorded soil batch from its source area through removal, storage and reuse, while retaining the measurements and decisions associated with those stages.

## Problem statement

Removing topsoil creates a record-keeping problem as well as a physical management task. A useful record needs to connect the original area, removal date, estimated quantity, storage location and subsequent use. Soil observations also need context: a value without its unit, sampling depth, method or date may not support a reliable comparison.

TerraGuard GIS will investigate whether these records can be managed more consistently in a shared map-based workflow. It will also examine whether users can retrieve the history of a location or soil batch more effectively than with a baseline consisting of separate maps, spreadsheets and measurement documents.

Fragmented records are a working hypothesis, not an established problem for every construction team. The intended users' actual processes and priorities still require focused follow-up research.

## Aim and expected outcomes

The aim is to design, develop and evaluate a web-based geographic information system that combines location-based soil records with explainable decision support.

The intended deliverables are a working web prototype, a spatial database and API, reviewed requirements, architectural documentation, interface materials, and a reproducible evaluation record. Evaluation will address software correctness and workflow performance. Environmental improvement is a separate outcome that would require field evidence.

## Target users

| Intended user | Proposed use of the system |
| --- | --- |
| Environmental specialists | Register observations, inspect monitoring history and prepare soil-management records. |
| Construction site managers | Record removal, storage, movement and reuse of topsoil. |
| Restoration and landscaping specialists | Document interventions and connect them with follow-up observations. |
| Soil specialists | Review measurement methods, interpret observations and assess the applicability of decision rules. |

These are proposed working roles. Access permissions will be defined separately rather than inferred from a job title.

## Core workflow

The first prototype is intended to support one complete, traceable sequence:

```text
Source area
    -> Topsoil removal record
    -> Identifiable soil batch
    -> Storage location and observations
    -> Reuse or restoration operation
    -> Follow-up observations
```

Each material operation will retain its date, quantity, declared volume basis and responsible user. Partial reuse will preserve the original batch identity and operation history. Mixing different batches is outside the initial scope.

## Planned functionality

The identifiers below correspond to the initial requirements in Section 6 of the academic report. **Must** requirements define the proposed core demonstration; **Should** requirements may be deferred with a documented reason. None is marked as implemented.

| Capability | Planned behaviour | Priority / requirement |
| --- | --- | --- |
| Site mapping | Create site boundaries and sampling points; open the records associated with a selected location. | Must: FR-02, FR-03 |
| Observation management | Record values with units, date/time, location, depth, method and source; preview and validate CSV imports. | Must: FR-04, FR-05 |
| Topsoil traceability | Connect removal, storage, movement and reuse records without losing the batch history. | Must: FR-07, FR-08 |
| Volume estimation | Estimate a topsoil layer's volume from area and average thickness, with unit and input checks. | Must: FR-09 |
| Measurement history | Filter observations by location, indicator and date without silently combining incompatible measurements. | Must: FR-10 |
| Explainable alerts | Apply reviewed rules and show the input, rule version and reason behind each result. | Must: FR-11 |
| Restoration records | Link restoration activities with relevant areas, batch operations and follow-up observations. | Must: FR-12 |
| Access control and audit history | Restrict actions by permission and preserve the actor, time and reason for record corrections. | Must: FR-01, FR-14 |
| Laboratory evidence | Attach laboratory evidence to the relevant sample or observation. | Should: FR-06 |
| Reporting | Export selected records with their units and provenance, within the user's permission scope. | Should: FR-13 |

### Volume calculation

The initial calculation is a layer estimate:

```text
Volume (m3) = Area (m2) x Average layer thickness (m)
```

For example, the planned arithmetic test uses an area of 1,000 m2 and a thickness of 0.20 m, giving 200 m3. This is a test fixture, not a site measurement. The calculation is not a stockpile-shape model, and in-situ and loose volumes must not be treated as interchangeable quantities.

## Intelligent decision support

The first intelligent component is a transparent, versioned rule system rather than a trained prediction model. A proposed rule records its indicator, permitted unit and measurement method, site context, comparison operator, threshold, evidence source and review status.

An alert should explain which observation triggered it and which rule version was applied. A data-quality warning should remain distinct from a soil-condition alert: missing measurement metadata does not, by itself, demonstrate poor soil quality.

The report does not establish universal environmental thresholds. Rules require review for their intended context, and missing or incompatible evidence must produce an explicit unresolved state rather than an unsupported recommendation.

## Scope and limitations

The initial version covers site mapping, manual entry and CSV import, observation histories, identifiable soil batches, storage and reuse records, layer-volume estimates, restoration records and rule-based alerts.

Live sensor integration is optional. It depends on access to equipment, suitable data and verification resources; it is not required for the first end-to-end demonstration.

The initial scope excludes physical excavation or soil treatment, sensor manufacture, automatic machinery control, regulatory certification, mixed-batch modelling, mandatory satellite processing and machine-learning model training. The system will not infer complete fertility from a small set of readings or guarantee ecological recovery.

TerraGuard GIS is intended to support professional judgement, not replace laboratory analysis or qualified environmental assessment.

## Proposed architecture

The design uses a browser interface, one backend application with separate internal modules, a spatial database and protected attachment storage.

```text
Browser interface
Map, forms, observation history and alerts
                    |
                 JSON API
                    |
Backend application
Authentication | Validation | Material operations
Rule evaluation | Exports | Audit history
                    |
          +---------+----------+
          |                    |
PostgreSQL + PostGIS     Protected attachment storage
```

The API will check permissions and validate incoming records before accepting them. Material operations will need transactional updates so that a failed operation cannot leave an inconsistent recorded balance. Attachments will be linked through metadata and accessed according to permissions.

### Proposed technology baseline

These choices come from the report's technology comparison. They remain proposals for team and supervisor review, not a claim that the stack has been approved, installed or benchmarked.

| Component | Proposed choice | Intended responsibility |
| --- | --- | --- |
| Backend | Python with FastAPI | API endpoints, input validation and application logic. |
| Spatial data storage | PostgreSQL with PostGIS | Related site, batch and observation records; spatial validation and calculations. |
| Web mapping | OpenLayers | Site boundaries, sampling locations and map-based interaction. |
| Component interaction | JSON API | Communication between the browser client and backend. |

The broader frontend framework, dependency versions, hosting environment and basemap provider have not been finalised. Microservices are not part of the initial architecture.

## Data and research evidence

Moisture, temperature, pH and electrical conductivity are initial candidate indicators. The proposed data model also accommodates laboratory and field results, such as organic matter, bulk density and layer thickness. The availability and suitability of each indicator still need confirmation.

Observations will retain their location, time, unit, depth, method and source. Measured observations, background estimates and synthetic test records must remain distinguishable. Records with different methods, units or depths must not be silently combined.

The research report includes a twelve-source literature review, a comparison of five existing systems and an exploratory questionnaire collected on 19-20 October 2026. The questionnaire contains 25 submissions, of which 24 include consent; only consenting submissions are used in the analysis. Respondents have varied experience, and some answers are inconsistent. The findings inform provisional requirements; they do not establish representative demand among verified construction professionals.

Identifiable respondent data, credentials and access tokens must not be included in public project materials. Synthetic datasets will be labelled and used to test software behaviour, not as evidence of field conditions.

## Verification and evaluation

The planned evaluation separates record correctness from user workflow performance.

| Area | Planned check |
| --- | --- |
| Geometry and calculations | Test valid and invalid boundaries, coordinate handling, units and known area/thickness examples. |
| Data import | Check missing metadata, invalid units, duplicate identifiers and accepted/rejected row counts. |
| Material history | Test partial transfers, insufficient available quantities and rollback after failed operations. |
| Rule behaviour | Test values below, at and above a configured limit, plus missing-context cases. |
| Permissions and auditability | Test permitted and denied actions, protected exports and the history of corrections. |
| Workflow evaluation | Compare equivalent tasks in the prototype and a baseline of separate maps, spreadsheets and measurement files. |

The user evaluation will examine task completion, elapsed time, errors and understanding of alert explanations. The report defines prospective test conditions and acceptance targets; no test results, performance benchmarks or field-validation results are claimed here.

## Documentation and current status

The main reference is the [TerraGuard GIS academic report](docs/TerraGuard_GIS_Report_v4.docx). It contains the proposal, research, initial requirements, architecture, low-fidelity interface layouts and evaluation plan.

| Work area | Status reflected in the report |
| --- | --- |
| Proposal, literature and existing-system comparison | Draft material prepared. |
| Exploratory questionnaire analysis | Included, with limitations; focused follow-up remains necessary. |
| Requirements and technology choices | Proposed baseline awaiting review. |
| Architecture and interface layouts | Draft design artefacts, not implemented screens. |
| Application code and live sensor integration | Planned; no runnable release is included. |
| Testing and evaluation | Plan prepared; execution and results pending. |

### Documentation package layout

```text
.
|-- README.md
`-- docs/
    `-- TerraGuard_GIS_Report_v4.docx
```

This is a documentation package, not an application directory. Source, test and configuration directories should reflect actual implementation work when it is added.

## Getting started

At this stage, start with the academic report rather than installation commands. There is no application release to install or run in this package.

When runnable code is available, this section will need verified prerequisites, dependency installation, configuration examples, database initialisation, sample-data loading, startup commands and test instructions.

## Team

| Team member | Role | Responsibility area |
| --- | --- | --- |
| Mazhitova Aknur | Backend Developer | Database, API, validation, calculation logic and technical tests. |
| Zholekesh Kyrmyzy | Frontend Developer | Map interface, forms, charts and user interaction testing. |
| Tukezhan Kausar | System Analyst | User research, literature analysis, requirements, comparisons and evaluation coordination. |

**Supervisor:** Nadirov Nurtas

Documentation, testing and review are shared responsibilities. The table describes the intended allocation of work, not a record of completed contributions.

## Project tracking

[YouTrack project board](https://242226.youtrack.cloud/agiles/204-1/current)

## Next development steps

Validate the proposed workflow with relevant representatives, review the requirements and technical baseline, and implement a complete source-to-storage-to-reuse record. Observation import, rule explanations and their tests can then be added before the planned baseline comparison.

Detailed assignments, dates and task status are left to the team in YouTrack.
