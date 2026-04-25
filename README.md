# ANALYST

<img width="1920" height="1080" alt="Dashboard" src="https://github.com/user-attachments/assets/2982b533-9af9-42cd-b7db-365452f7f588" />

**ANALYST** is an investigative analysis platform for structuring, mapping, and analyzing complex intelligence investigations.

It provides analysts with a system to:

- model entities and relationships
- track evidence and claims
- perform geospatial and network analysis
- maintain auditable investigative workflows
- produce structured intelligence assessments

The platform is designed to support investigative disciplines including:

- open-source intelligence (OSINT)
- financial investigations
- counter-proliferation analysis
- influence and network analysis
- investigative journalism
- regulatory and compliance investigations

ANALYST emphasizes **structured analysis over document chaos**.  
Instead of scattered notes and files, investigations are represented as **linked analytical objects**.

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

<img width="1920" height="1537" alt="Network" src="https://github.com/user-attachments/assets/77bb4383-d950-4e96-b2eb-bee9b4f9e31f" />
<img width="1920" height="1214" alt="Claims List" src="https://github.com/user-attachments/assets/e9dbf251-1a47-44a8-a14c-d5608b82b236" />
<img width="1920" height="1214" alt="Claims List" src="https://github.com/user-attachments/assets/78fee314-c8b4-46a6-9b38-ec56fc55eddb" />
<img width="1920" height="2096" alt="Add Links" src="https://github.com/user-attachments/assets/7fb51fd7-5204-46c7-b080-51ae27316484" />
<img width="1920" height="1131" alt="Links List" src="https://github.com/user-attachments/assets/99787b8c-0e5e-4c55-be83-e0ec374d7683" />
<img width="1920" height="1373" alt="Add Identifiers" src="https://github.com/user-attachments/assets/80b58805-049e-408f-be51-c4ea0b8de1a9" />
<img width="1920" height="1214" alt="Identifiers List" src="https://github.com/user-attachments/assets/35796415-db60-4434-852e-ec66bd1a2eb3" />
<img width="1920" height="1761" alt="Add Evidence" src="https://github.com/user-attachments/assets/bb3e174b-924e-4f3e-b865-aaf78ef9f23d" />
<img width="1920" height="1220" alt="Events List" src="https://github.com/user-attachments/assets/d1f288c2-d236-453a-88e4-a51f9feea205" />
<img width="1920" height="2745" alt="Add Target" src="https://github.com/user-attachments/assets/77c5b233-c59c-4d29-bcd0-0b1a2a72d7a9" />
<img width="1920" height="1127" alt="Timeline" src="https://github.com/user-attachments/assets/1fda9986-808f-41ac-ab52-81f6460f71c8" />
<img width="1920" height="1080" alt="Target List" src="https://github.com/user-attachments/assets/4fa4e1d2-499a-464f-ba22-ae24b9e79017" />


---

# License

MIT License
