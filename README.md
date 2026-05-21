# ANALYST

<img width="1920" height="1537" alt="Network" src="https://github.com/user-attachments/assets/77bb4383-d950-4e96-b2eb-bee9b4f9e31f" />

**ANALYST** is an investigative analysis platform for structuring, mapping, and analyzing complex intelligence investigations.

It provides analysts with a system to:

- model entities and relationships
- track evidence and claims
- perform geospatial and network analysis
- maintain auditable investigative workflows
- produce structured intelligence assessments

<img width="1920" height="2745" alt="Add Target" src="https://github.com/user-attachments/assets/77c5b233-c59c-4d29-bcd0-0b1a2a72d7a9" />

The platform is designed to support investigative disciplines including:

- open-source intelligence (OSINT)
- financial investigations
- counter-proliferation analysis
- influence and network analysis
- investigative journalism
- regulatory and compliance investigations

ANALYST emphasizes **structured analysis over document chaos**.  
Instead of scattered notes and files, investigations are represented as **linked analytical objects**.

<img width="1920" height="1373" alt="Add Identifiers" src="https://github.com/user-attachments/assets/80b58805-049e-408f-be51-c4ea0b8de1a9" />

---

# Core Principles

### Structured Intelligence

All investigative artifacts are structured into a coherent model:

- entities
- relationships
- locations
- evidence
- claims
- assessments

This enables machine-assisted analysis, visualization, and export.

---

### Analyst-First Design

ANALYST is built around how real analysts work:

1. identify targets
2. collect evidence
3. establish relationships
4. test hypotheses
5. generate assessments

The platform supports this workflow rather than forcing analysts into rigid reporting templates.

---

### Local-First Architecture

Cases are **file-authoritative** and portable.

Each investigation exists as a case folder containing:

case.json
attachments/
exports/


The entire case can be copied, archived, or transferred without dependence on cloud infrastructure.

---

### Investigative Integrity

Evidence handling prioritizes forensic integrity:

- original files preserved
- cryptographic hashes recorded
- acquisition source documented
- chain-of-custody fields maintained

---

# Platform Capabilities

Current and planned analytical capabilities include:

### Entity Modeling

Representation of investigative targets such as:

- individuals
- companies
- infrastructure
- organizations
- digital assets

Entities become the core objects around which investigations are built.

---

### Relationship Graphing

Relationships between entities are first-class objects.

Examples:

- ownership
- employment
- partnerships
- communications
- financial transactions

Graph analysis enables discovery of hidden networks.

---

### Geospatial Analysis

Entities and events can be tied to geographic coordinates, enabling:

- facility mapping
- infrastructure analysis
- location clustering
- regional threat assessment

---

### Investigative Workflow

The platform supports the full lifecycle of an investigation:

1. target identification
2. evidence collection
3. claim construction
4. confidence scoring
5. analytical assessment
6. export and briefing

---

# Installation

npm install
npm run dev

PDF export uses Playwright and downloads Chromium on `npm install`. If PDF export fails, run `npm run setup:pdf` and restart the dev server.

Then open:
http://localhost:3000

---

# Case Structure

Each investigation is stored in a case folder.

Example:
case-folder/
case.json
attachments/
exports/


`case.json` contains the structured representation of the entire investigation.


---

# License

MIT License
