// src/config/taxonomy.ts
// Single source of truth for UI labels + dropdown options.
// Storage keys remain stable; UI labels are fully written out.

export type EntityTypeKey =
  | "PERSON"
  | "ORG"
  | "INFRA"
  | "ASSET"
  | "EVENT"
  | "FIN_INSTRUMENT"
  | "GOV";

export type ConfidenceBucket = "HIGH" | "MODERATE" | "LOW";

export type EvidenceTypeKey = "DOCUMENT" | "IMAGE";

export type LinkTypeKey =
  | "OWNS"
  | "CONTROLS"
  | "PAID"
  | "REGISTERED"
  | "EMPLOYS"
  | "EMPLOYED_BY"
  | "HOSTED_BY"
  | "COMMUNICATED_WITH"
  | "AFFILIATED_WITH"
  | "SUBSIDIARY_OF"
  | "PARTNER_OF"
  | "FUNDED_BY"
  | "OPERATES"
  | "MEMBER_OF"
  | "KNOWS"
  | "RELATED_TO"
  | "CUSTOM";

export type LinkSourceKey = "EVIDENCE" | "ANALYST";

export type IdentifierFacetKey =
  | "INTERNET_INFRA"
  | "BUSINESS_ECONOMY"
  | "SOCIAL_MESSAGING"
  | "PEOPLE_GROUPS"
  | "CRITICAL_INFRA"
  | "CRYPTO"
  | "FINANCE"
  | "FORENSIC_ID"
  | "LOCATION_GEO"
  | "EQUIPMENT_TRANSPORT_WEAPONS"
  | "MEDIA_FILES"
  | "GENERIC_OTHER";

// Canonical identifier types already supported (do not change schema)
export type CanonicalIdentifierType =
  | "ALIAS"
  | "DOMAIN"
  | "IP"
  | "EMAIL"
  | "WALLET"
  | "HANDLE"
  | "ASN";

// Everything else is stored as CUSTOM:<SLUG> (schema-safe)
export type IdentifierStorageType = CanonicalIdentifierType | `CUSTOM:${string}`;

export type RiskFlag = {
  key: string; // tag_key
  label: string; // display_label (no underscores)
  category: string;
};

export type IdentifierTypeOption = {
  storageType: IdentifierStorageType; // canonical or CUSTOM:SLUG
  label: string; // fully written out (no underscores)
  facet: IdentifierFacetKey; // deterministic from Labels.md category
  targetTypeHint?: EntityTypeKey; // optional guidance only
};

export type IdentifierFacetGroup = {
  facet: IdentifierFacetKey;
  heading: string; // UI heading (fully written out)
  options: IdentifierTypeOption[];
};

export const TAXONOMY = {
  brand: "ANALYST",

  colors: {
    bg: "#2D3741",
    panel: "#3C4855",
    border: "#5A7291",
    blue: "#29A9E0",
    green: "#03B791",
    text: "#E8EDF5",
  },

  confidence: [
    { key: "HIGH" as const, label: "High" },
    { key: "MODERATE" as const, label: "Medium" },
    { key: "LOW" as const, label: "Low" },
  ],

  entityTypes: [
    { key: "PERSON" as const, label: "Person" },
    { key: "ORG" as const, label: "Organization" },
    { key: "INFRA" as const, label: "Infrastructure" },
    { key: "ASSET" as const, label: "Asset" },
    { key: "EVENT" as const, label: "Event" },
    { key: "FIN_INSTRUMENT" as const, label: "Financial Instrument" },
    { key: "GOV" as const, label: "Government" },
  ],

  evidenceTypes: [
    { key: "DOCUMENT" as const, label: "Document" },
    { key: "IMAGE" as const, label: "Image" },
  ],

  evidenceSourceTypes: [
    { key: "SEC" as const, label: "SEC Filing" },
    { key: "WEBSITE" as const, label: "Company Website" },
    { key: "SOCIAL" as const, label: "Social Media" },
    { key: "FOIA" as const, label: "FOIA" },
    { key: "COURT" as const, label: "Court" },
    { key: "NEWS" as const, label: "News" },
    { key: "PRESS_RELEASE" as const, label: "Press Release" },
    { key: "REGULATORY" as const, label: "Regulatory" },
    { key: "DATA_BROKER" as const, label: "Data Broker" },
    { key: "PATENT" as const, label: "Patent" },
    { key: "INTERVIEW" as const, label: "Interview" },
    { key: "LEAK" as const, label: "Leaked Document" },
    { key: "SATELLITE" as const, label: "Satellite / Aerial" },
    { key: "OTHER" as const, label: "Other" },
  ],

  linkTypes: [
    { key: "OWNS" as const, label: "Owns" },
    { key: "CONTROLS" as const, label: "Controls" },
    { key: "PAID" as const, label: "Paid" },
    { key: "REGISTERED" as const, label: "Registered" },
    { key: "EMPLOYS" as const, label: "Employs" },
    { key: "EMPLOYED_BY" as const, label: "Employed by" },
    { key: "HOSTED_BY" as const, label: "Hosted by" },
    { key: "COMMUNICATED_WITH" as const, label: "Communicated with" },
    { key: "AFFILIATED_WITH" as const, label: "Affiliated with" },
    { key: "SUBSIDIARY_OF" as const, label: "Subsidiary of" },
    { key: "PARTNER_OF" as const, label: "Partner of" },
    { key: "FUNDED_BY" as const, label: "Funded by" },
    { key: "OPERATES" as const, label: "Operates" },
    { key: "MEMBER_OF" as const, label: "Member of" },
    { key: "KNOWS" as const, label: "Knows" },
    { key: "RELATED_TO" as const, label: "Related to" },
    { key: "CUSTOM" as const, label: "Custom" },
  ],

  linkSources: [
    { key: "EVIDENCE" as const, label: "Evidence" },
    { key: "ANALYST" as const, label: "Analyst" },
  ],

  eventTypes: [
    { key: "CORPORATE" as const, label: "Corporate" },
    { key: "FINANCIAL" as const, label: "Financial" },
    { key: "REGULATORY" as const, label: "Regulatory" },
    { key: "TECHNICAL" as const, label: "Technical" },
    { key: "PERSONAL" as const, label: "Personal" },
    { key: "INTELLIGENCE_RELEVANT" as const, label: "Intelligence Relevant" },
  ],

  // Risk flags copied from Labels.md verbatim (display labels are already written out)
  riskFlags: [
    { key: "ai-relevant", label: "AI Relevant", category: "Cyber / Technology" },
    { key: "advanced-manufacturing", label: "Advanced Manufacturing", category: "Proliferation / Export Control" },
    { key: "beneficial-ownership-unknown", label: "Beneficial Ownership Unknown", category: "Financial / Illicit" },
    { key: "chemical-biological-risk", label: "Chemical / Biological Risk", category: "Proliferation" },
    { key: "compliance-risk", label: "Compliance Risk", category: "Legal / Regulatory" },
    { key: "compute-infrastructure", label: "Compute Infrastructure", category: "Cyber / Technology" },
    { key: "critical-infrastructure", label: "Critical Infrastructure", category: "National Security" },
    { key: "ccp-linked", label: "State-Linked (PRC)", category: "National Security" },
    { key: "cyber-enabled-activity", label: "Cyber-Enabled Activity", category: "Cyber / Technology" },
    { key: "cyber-operations", label: "Cyber Operations", category: "Cyber / Technology" },

    { key: "data-access-risk", label: "Data Access Risk", category: "Cyber / Technology" },
    { key: "designation-pending", label: "Designation Pending", category: "Legal / Regulatory" },
    { key: "dual-use-technology", label: "Dual-Use Technology", category: "National Security" },
    { key: "encryption-relevant", label: "Encryption Relevant", category: "Cyber / Technology" },
    { key: "enforcement-interest", label: "Enforcement Interest", category: "Legal / Regulatory" },
    { key: "export-control-sensitive", label: "Export Control Sensitive", category: "Legal / Regulatory" },
    { key: "export-controlled-entity", label: "Export Controlled Entity", category: "Legal / Regulatory" },
    { key: "financial-facilitator", label: "Financial Facilitator", category: "Financial / Illicit" },
    { key: "foreign-adversary-linked", label: "Foreign Adversary Linked", category: "National Security" },

    { key: "government-access", label: "Government Access", category: "Governance / Influence" },
    { key: "high-priority", label: "High Priority", category: "Operational / Analytic" },
    { key: "high-risk-jurisdiction", label: "High-Risk Jurisdiction", category: "Financial / Illicit" },
    { key: "influence-operations", label: "Influence Operations", category: "Governance / Influence" },
    { key: "intelligence-linked", label: "Intelligence Service Linked", category: "National Security" },
    { key: "law-enforcement-interest", label: "Law Enforcement Interest", category: "Investigation / Case" },
    { key: "licensing-required", label: "Licensing Required", category: "Legal / Regulatory" },
    { key: "military-affiliated", label: "Military Affiliated", category: "National Security" },
    { key: "money-laundering-risk", label: "Money Laundering Risk", category: "Financial / Illicit" },

    { key: "monitoring-required", label: "Monitoring Required", category: "Operational / Analytic" },
    { key: "network-hub", label: "Network Hub", category: "Operational / Analytic" },
    { key: "nuclear-related", label: "Nuclear Related", category: "Proliferation" },
    { key: "offshore-structure", label: "Offshore Structure", category: "Financial / Illicit" },
    { key: "opaque-ownership", label: "Opaque Ownership", category: "Financial / Illicit" },
    { key: "parallel-investigation", label: "Parallel Investigation", category: "Investigation / Case" },
    { key: "politically-exposed-person", label: "Politically Exposed Person", category: "Governance / Influence" },
    { key: "policy-influence", label: "Policy Influence", category: "Governance / Influence" },
    { key: "proliferation-risk", label: "Proliferation Risk", category: "Proliferation" },

    { key: "reassessment-needed", label: "Reassessment Needed", category: "Operational / Analytic" },
    { key: "regulatory-review", label: "Regulatory Review", category: "Legal / Regulatory" },
    { key: "restricted-party", label: "Restricted Party", category: "Legal / Regulatory" },
    { key: "sanctions", label: "Sanctions Exposure", category: "Legal / Regulatory" },
    { key: "sanctions-evasion", label: "Sanctions Evasion", category: "Financial / Illicit" },
    { key: "semiconductor-relevant", label: "Semiconductor Relevant", category: "Cyber / Technology" },
    { key: "shell-company", label: "Shell Company", category: "Financial / Illicit" },
    { key: "state-affiliated", label: "State Affiliated", category: "National Security" },
    { key: "state-owned", label: "State Owned", category: "National Security" },
    { key: "strategic-technology", label: "Strategic Technology", category: "National Security" },
    { key: "supply-chain-risk", label: "Supply Chain Risk", category: "Cyber / Technology" },

    { key: "terrorist-financing-risk", label: "Terrorist Financing Risk", category: "Financial / Illicit" },
    { key: "time-sensitive", label: "Time Sensitive", category: "Operational / Analytic" },
    { key: "under-investigation", label: "Under Investigation", category: "Investigation / Case" },
    { key: "weapons-related", label: "Weapons Related", category: "Proliferation" },
  ] satisfies RiskFlag[],

  // Identifier dropdown taxonomy: every option explicitly declared (Cursor-proof)
  identifierFacets: [
    {
      facet: "INTERNET_INFRA",
      heading: "Internet and Infrastructure",
      options: [
        { storageType: "CUSTOM:BACKLINK", label: "Backlink", facet: "INTERNET_INFRA" },
        { storageType: "CUSTOM:DNS_RECORD", label: "DNS Record", facet: "INTERNET_INFRA" },
        { storageType: "DOMAIN", label: "Domain", facet: "INTERNET_INFRA" },
        { storageType: "CUSTOM:FAVICON", label: "Favicon", facet: "INTERNET_INFRA" },
        { storageType: "CUSTOM:GOOGLE_RESOURCE", label: "Google Resource", facet: "INTERNET_INFRA" },
        { storageType: "CUSTOM:INTERNET_ARCHIVE", label: "Internet Archive", facet: "INTERNET_INFRA" },
        { storageType: "IP", label: "IP Address", facet: "INTERNET_INFRA" },
        { storageType: "CUSTOM:NETWORK", label: "Network", facet: "INTERNET_INFRA" },
        { storageType: "CUSTOM:PORT", label: "Port", facet: "INTERNET_INFRA" },
        { storageType: "CUSTOM:PUBLIC_ARCHIVE", label: "Public Archive", facet: "INTERNET_INFRA" },
        { storageType: "CUSTOM:SOURCE_CODE", label: "Source Code", facet: "INTERNET_INFRA" },
        { storageType: "CUSTOM:URL", label: "URL", facet: "INTERNET_INFRA" },
      ],
    },

    {
      facet: "BUSINESS_ECONOMY",
      heading: "Business and Economy",
      options: [
        { storageType: "CUSTOM:BANK", label: "Bank", facet: "BUSINESS_ECONOMY", targetTypeHint: "ORG" },
        { storageType: "CUSTOM:BRAND", label: "Brand", facet: "BUSINESS_ECONOMY", targetTypeHint: "ORG" },
        { storageType: "CUSTOM:COMMERCE", label: "Commerce", facet: "BUSINESS_ECONOMY" },
        { storageType: "CUSTOM:COMPANY", label: "Company", facet: "BUSINESS_ECONOMY", targetTypeHint: "ORG" },
        { storageType: "CUSTOM:FEE", label: "Fee", facet: "BUSINESS_ECONOMY" },
        { storageType: "CUSTOM:FINANCE", label: "Finance", facet: "BUSINESS_ECONOMY" },
        { storageType: "CUSTOM:PATENT", label: "Patent", facet: "BUSINESS_ECONOMY" },
        { storageType: "CUSTOM:PROPERTY_TITLE", label: "Property Title", facet: "BUSINESS_ECONOMY" },
        { storageType: "CUSTOM:REGISTRAR", label: "Registrar", facet: "BUSINESS_ECONOMY" },
      ],
    },

    {
      facet: "SOCIAL_MESSAGING",
      heading: "Social Networks and Messaging",
      options: [
        { storageType: "CUSTOM:DISCORD", label: "Discord", facet: "SOCIAL_MESSAGING" },
        { storageType: "CUSTOM:FACEBOOK", label: "Facebook", facet: "SOCIAL_MESSAGING" },
        { storageType: "CUSTOM:FORUM", label: "Forum", facet: "SOCIAL_MESSAGING" },
        { storageType: "CUSTOM:GITHUB", label: "Github", facet: "SOCIAL_MESSAGING" },
        { storageType: "CUSTOM:INSTAGRAM", label: "Instagram", facet: "SOCIAL_MESSAGING" },
        { storageType: "CUSTOM:LINKEDIN", label: "LinkedIn", facet: "SOCIAL_MESSAGING" },
        { storageType: "CUSTOM:MASTODON", label: "Mastodon", facet: "SOCIAL_MESSAGING" },
        { storageType: "CUSTOM:OTHER_SOCIAL", label: "Other Social", facet: "SOCIAL_MESSAGING" },
        { storageType: "CUSTOM:PINTEREST", label: "Pinterest", facet: "SOCIAL_MESSAGING" },
        { storageType: "CUSTOM:ROCKET_CHAT", label: "Rocket.Chat", facet: "SOCIAL_MESSAGING" },
        { storageType: "CUSTOM:SIGNAL", label: "Signal", facet: "SOCIAL_MESSAGING" },
        { storageType: "CUSTOM:SNAPCHAT", label: "Snapchat", facet: "SOCIAL_MESSAGING" },
        { storageType: "CUSTOM:TELEGRAM", label: "Telegram", facet: "SOCIAL_MESSAGING" },
        { storageType: "CUSTOM:TIKTOK", label: "TikTok", facet: "SOCIAL_MESSAGING" },
        { storageType: "CUSTOM:VK", label: "VK", facet: "SOCIAL_MESSAGING" },
        { storageType: "CUSTOM:WEIBO", label: "Weibo", facet: "SOCIAL_MESSAGING" },
        { storageType: "CUSTOM:WHATSAPP", label: "WhatsApp", facet: "SOCIAL_MESSAGING" },
        { storageType: "CUSTOM:X", label: "X", facet: "SOCIAL_MESSAGING" },
        { storageType: "CUSTOM:YOUTUBE", label: "YouTube", facet: "SOCIAL_MESSAGING" },
      ],
    },

    {
      facet: "PEOPLE_GROUPS",
      heading: "People and Groups",
      options: [
        { storageType: "CUSTOM:ASSOCIATION", label: "Association", facet: "PEOPLE_GROUPS" },
        { storageType: "ALIAS", label: "Alias", facet: "PEOPLE_GROUPS", targetTypeHint: "PERSON" },
        { storageType: "CUSTOM:CRIMINAL", label: "Criminal", facet: "PEOPLE_GROUPS", targetTypeHint: "PERSON" },
        { storageType: "CUSTOM:MILITARY_UNIT", label: "Military Unit", facet: "PEOPLE_GROUPS" },
        { storageType: "CUSTOM:NGO", label: "NGO", facet: "PEOPLE_GROUPS", targetTypeHint: "ORG" },
        { storageType: "CUSTOM:OTHER_GROUP", label: "Other Group", facet: "PEOPLE_GROUPS" },
        { storageType: "CUSTOM:PERSON", label: "Person", facet: "PEOPLE_GROUPS", targetTypeHint: "PERSON" },
        { storageType: "CUSTOM:POLITICAL_FIGURE", label: "Political Figure", facet: "PEOPLE_GROUPS", targetTypeHint: "PERSON" },
        { storageType: "CUSTOM:RELIGIOUS_FIGURE", label: "Religious Figure", facet: "PEOPLE_GROUPS", targetTypeHint: "PERSON" },
        { storageType: "CUSTOM:TERRORIST", label: "Terrorist", facet: "PEOPLE_GROUPS", targetTypeHint: "PERSON" },
        { storageType: "CUSTOM:THREAT_ACTOR", label: "Threat Actor", facet: "PEOPLE_GROUPS" },
      ],
    },

    {
      facet: "CRITICAL_INFRA",
      heading: "Critical Infrastructure",
      options: [
        { storageType: "ASN", label: "ASN", facet: "CRITICAL_INFRA" },
        { storageType: "CUSTOM:NUCLEAR_SITE", label: "Nuclear Site", facet: "CRITICAL_INFRA", targetTypeHint: "INFRA" },
        { storageType: "CUSTOM:OIL_AND_GAS", label: "Oil and Gas", facet: "CRITICAL_INFRA", targetTypeHint: "INFRA" },
        { storageType: "CUSTOM:POWER_PLANT", label: "Power Plant", facet: "CRITICAL_INFRA", targetTypeHint: "INFRA" },
      ],
    },

    {
      facet: "CRYPTO",
      heading: "Cryptocurrency",
      options: [
        { storageType: "CUSTOM:CRYPTO_MIXER", label: "Crypto Mixer", facet: "CRYPTO" },
        { storageType: "CUSTOM:CRYPTOCURRENCY_WALLET", label: "Cryptocurrency Wallet", facet: "CRYPTO" },
        { storageType: "CUSTOM:OTHER_CRYPTO_ASSET", label: "Other Crypto Asset", facet: "CRYPTO" },
        { storageType: "WALLET", label: "Wallet", facet: "CRYPTO" },
      ],
    },

    {
      facet: "FINANCE",
      heading: "Finance",
      options: [
        { storageType: "CUSTOM:BANK_ACCOUNT", label: "Bank Account", facet: "FINANCE" },
        { storageType: "CUSTOM:BUSINESS_TRANSACTION", label: "Business Transaction", facet: "FINANCE" },
        { storageType: "CUSTOM:CRYPTO_TRANSACTION", label: "Crypto Transaction", facet: "FINANCE" },
      ],
    },

    {
      facet: "FORENSIC_ID",
      heading: "Forensic and Identification",
      options: [
        { storageType: "CUSTOM:APK", label: "APK", facet: "FORENSIC_ID" },
        { storageType: "CUSTOM:AUDIO", label: "Audio", facet: "FORENSIC_ID" },
        { storageType: "CUSTOM:CERTIFICATE", label: "Certificate", facet: "FORENSIC_ID" },
        { storageType: "CUSTOM:CREDENTIALS", label: "Credentials", facet: "FORENSIC_ID" },
        { storageType: "CUSTOM:DOCUMENT", label: "Document", facet: "FORENSIC_ID" },
        { storageType: "EMAIL", label: "Email", facet: "FORENSIC_ID" },
        { storageType: "CUSTOM:EXECUTABLE", label: "Executable", facet: "FORENSIC_ID" },
        { storageType: "CUSTOM:FILE", label: "File", facet: "FORENSIC_ID" },
        { storageType: "CUSTOM:HASH", label: "Hash", facet: "FORENSIC_ID" },
        { storageType: "CUSTOM:IDENTIFIER", label: "Identifier", facet: "FORENSIC_ID" },
        { storageType: "CUSTOM:IMEI", label: "IMEI", facet: "FORENSIC_ID" },
        { storageType: "CUSTOM:IMSI", label: "IMSI", facet: "FORENSIC_ID" },
        { storageType: "CUSTOM:MAC_ADDRESS", label: "MAC Address", facet: "FORENSIC_ID" },
        { storageType: "CUSTOM:PASSWORD", label: "Password", facet: "FORENSIC_ID" },
        { storageType: "CUSTOM:PHONE_NUMBER", label: "Phone Number", facet: "FORENSIC_ID" },
        { storageType: "CUSTOM:TEXT", label: "Text", facet: "FORENSIC_ID" },
        { storageType: "CUSTOM:TRACKING_CODE", label: "Tracking Code", facet: "FORENSIC_ID" },
        { storageType: "CUSTOM:VIDEO", label: "Video", facet: "FORENSIC_ID" },
      ],
    },

    {
      facet: "GENERIC_OTHER",
      heading: "Generic and Other",
      options: [
        { storageType: "CUSTOM:ANIMAL", label: "Animal", facet: "GENERIC_OTHER" },
        { storageType: "CUSTOM:EVENT", label: "Event", facet: "GENERIC_OTHER", targetTypeHint: "EVENT" },
        { storageType: "CUSTOM:GENERIC_ENTITY", label: "Generic Entity", facet: "GENERIC_OTHER" },
        { storageType: "CUSTOM:LOGO", label: "Logo", facet: "GENERIC_OTHER" },
        { storageType: "CUSTOM:TEXT_MESSAGE", label: "Text Message", facet: "GENERIC_OTHER" },
      ],
    },

    {
      facet: "LOCATION_GEO",
      heading: "Location and Geography",
      options: [
        { storageType: "CUSTOM:LOCATION", label: "Location", facet: "LOCATION_GEO" },
        { storageType: "CUSTOM:SATELLITE_IMAGE", label: "Satellite Image", facet: "LOCATION_GEO" },
      ],
    },

    {
      facet: "EQUIPMENT_TRANSPORT_WEAPONS",
      heading: "Equipment, Transport, and Weapons",
      options: [
        { storageType: "CUSTOM:AIRCRAFT", label: "Aircraft", facet: "EQUIPMENT_TRANSPORT_WEAPONS", targetTypeHint: "ASSET" },
        { storageType: "CUSTOM:AMMUNITION", label: "Ammunition", facet: "EQUIPMENT_TRANSPORT_WEAPONS" },
        { storageType: "CUSTOM:BOAT", label: "Boat", facet: "EQUIPMENT_TRANSPORT_WEAPONS", targetTypeHint: "ASSET" },
        { storageType: "CUSTOM:CAMERA", label: "Camera", facet: "EQUIPMENT_TRANSPORT_WEAPONS", targetTypeHint: "ASSET" },
        { storageType: "CUSTOM:DEVICE", label: "Device", facet: "EQUIPMENT_TRANSPORT_WEAPONS", targetTypeHint: "ASSET" },
        { storageType: "CUSTOM:DRONE", label: "Drone", facet: "EQUIPMENT_TRANSPORT_WEAPONS", targetTypeHint: "ASSET" },
        { storageType: "CUSTOM:EXPLOSIVE", label: "Explosive", facet: "EQUIPMENT_TRANSPORT_WEAPONS" },
        { storageType: "CUSTOM:HEAVY_WEAPON", label: "Heavy Weapon", facet: "EQUIPMENT_TRANSPORT_WEAPONS" },
        { storageType: "CUSTOM:LIGHT_WEAPON", label: "Light Weapon", facet: "EQUIPMENT_TRANSPORT_WEAPONS" },
        { storageType: "CUSTOM:MILITARY_VEHICLE", label: "Military Vehicle", facet: "EQUIPMENT_TRANSPORT_WEAPONS", targetTypeHint: "ASSET" },
        { storageType: "CUSTOM:OTHER_EQUIPMENT", label: "Other Equipment", facet: "EQUIPMENT_TRANSPORT_WEAPONS" },
        { storageType: "CUSTOM:TELECOM_EQUIPMENT", label: "Telecom Equipment", facet: "EQUIPMENT_TRANSPORT_WEAPONS", targetTypeHint: "ASSET" },
        { storageType: "CUSTOM:TRAIN", label: "Train", facet: "EQUIPMENT_TRANSPORT_WEAPONS", targetTypeHint: "ASSET" },
        { storageType: "CUSTOM:VEHICLE", label: "Vehicle", facet: "EQUIPMENT_TRANSPORT_WEAPONS", targetTypeHint: "ASSET" },
      ],
    },

    {
      facet: "MEDIA_FILES",
      heading: "Media and Files",
      options: [{ storageType: "CUSTOM:IMAGE", label: "Image", facet: "MEDIA_FILES" }],
    },
  ] satisfies IdentifierFacetGroup[],

  // Canonical identifiers list (used where you need "core only")
  coreIdentifierTypes: [
    { storageType: "ALIAS", label: "Alias", facet: "PEOPLE_GROUPS" },
    { storageType: "DOMAIN", label: "Domain", facet: "INTERNET_INFRA" },
    { storageType: "EMAIL", label: "Email", facet: "SOCIAL_MESSAGING" },
    { storageType: "WALLET", label: "Wallet", facet: "CRYPTO" },
    { storageType: "HANDLE", label: "Handle", facet: "SOCIAL_MESSAGING" },
    { storageType: "ASN", label: "ASN", facet: "CRITICAL_INFRA" },
    { storageType: "IP", label: "IP Address", facet: "INTERNET_INFRA" },
  ] satisfies IdentifierTypeOption[],
} as const;
