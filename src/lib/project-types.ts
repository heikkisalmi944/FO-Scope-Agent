import type { ParamId } from "@/data/types";

export type Visibility = "Sisäinen" | "Asiakkaalle näkyvä";
export const VISIBILITIES: Visibility[] = ["Sisäinen", "Asiakkaalle näkyvä"];

/** Pointer to any level of the process map (Microsoft sequence IDs). */
export interface Target { duplo?: string; lego?: string; epic?: string; func?: string }

export interface Customer {
  name: string; businessId: string; industry: string; address: string; website: string;
  opportunityName: string; phase: string; goDate: string; goDecider: string; expectedStart: string;
  sourceSystem: string; sourceAccountId: string; sourceOpportunityId: string; summary: string;
}
export interface Contact { id: string; name: string; role: string; org: "Asiakas" | "Fellowmind"; email: string; phone: string; sourceId: string }

export const MEMO_PHASES = ["Liidi", "Opportunity review", "Scope-työpaja", "Sopimusneuvottelu", "Handover", "Projekti / ohjausryhmä"] as const;
export const MEMO_TYPES = ["Palaveri", "Työpaja", "Puhelu", "Sähköposti", "Muistiinpano"] as const;
export interface Memo { id: string; date: string; title: string; phase: string; type: string; visibility: Visibility; participants: string; body: string; target: Target; source: string }

export const ATT_KINDS = ["Dokumentti", "Teams-tallenne", "Litterointi", "Sähköposti", "Linkki"] as const;
export type ParentType = "Muistio" | "Keskustelu" | "Muutos" | "RAID";
export interface Attachment { id: string; parentType: ParentType; parentId: string; name: string; kind: string; url: string; visibility: Visibility; addedAt: string }

export const DISC_STATUSES = ["Avoin", "Ratkaistu", "Aihio luotu", "Muutospyyntö luotu"] as const;
export interface Discussion { id: string; date: string; title: string; target: Target; body: string; author: string; status: string; visibility: Visibility; ticketId: string; changeId: string }

export const CHANGE_STATUSES = ["Luonnos", "Arvioitavana", "Asiakkaan hyväksyttävänä", "Hyväksytty", "Hylätty", "Siirretty"] as const;
export const CHANGE_TYPES = ["Lisäys", "Poisto", "Muutos"] as const;
export interface Change {
  id: string; createdAt: string; title: string; description: string; reason: string; type: string; target: Target;
  requester: string; status: string; htpInt: number; htpExt: number; scheduleImpact: string; baselineVersion: string;
  approverCustomer: string; approverFellowmind: string; approvedAt: string; discussionId: string; ticketId: string; visibility: Visibility;
}

export const RAID_TYPES = ["Riski", "Oletus", "Avoin kysymys", "Riippuvuus"] as const;
export const LEVELS = ["Matala", "Keskitaso", "Korkea"] as const;
export const RAID_STATUSES = ["Avoin", "Seurannassa", "Suljettu"] as const;
export interface RaidItem { id: string; type: string; title: string; description: string; target: Target; owner: string; probability: string; impact: string; status: string; dueDate: string; mitigation: string; inOffer: boolean; visibility: Visibility }

export const TICKET_STATUSES = ["Aihio", "Arvioitu", "Hyväksytty", "Siirretty Jiraan", "Seuraava vaihe"] as const;
export const TICKET_SOURCES = ["Scope", "Keskustelu", "Muutos", "RAID"] as const;
export interface Ticket {
  id: string; source: string; sourceId: string; issueType: "Epic" | "Story" | "Task"; summary: string; description: string; acceptance: string;
  target: Target; component: string; labels: string; htpInt: number; htpExt: number; priority: string; status: string; createdAt: string;
}

export interface Decision { choice: "valitaan" | "eivalita" | "avoin"; reason: string; owner: string; pros: string; cons: string }

export interface BaselineRow { epicId: string; scope: string; htpInt: number; htpExt: number }
export interface Baseline { id: string; version: string; lockedAt: string; lockedBy: string; note: string; totalInt: number; totalExt: number; rows: BaselineRow[] }

export type RateKey = "C" | "W" | "I" | "J" | "M" | "D" | "X";

export type FuncState = "S" | "O" | "E";
export type ModuleDriver = "kiinteä" | "yhtiöt" | "maat" | "määrä" | "prosentti";
export const MODULE_DRIVERS: ModuleDriver[] = ["kiinteä", "yhtiöt", "maat", "määrä", "prosentti"];
export const MODULE_PHASES = ["Käynnistys ja suunnittelu", "Toteutus", "Valmistelu ja käyttöönotto", "Käyttö ja jatkuvuus"] as const;
/** Cross-cutting work package priced alongside the process map. */
export interface ModuleDef {
  id: string; phase: string; name: string; desc: string; outputs: string;
  base: number; driver: ModuleDriver; unitLabel: string; unitRate: number; units: number | null; pct: number;
  scope: "S" | "O"; trigger: string; custom: boolean;
}

export interface OfferText { title: string; background: string; goals: string; validUntil: string; contactPerson: string; approach: string }

export interface CrmMapRow { source: string; target: string }

export interface Project {
  id: string; name: string; revision: number; updatedAt: string;
  customer: Customer; contacts: Contact[];
  params: Record<ParamId, string>; duplos: string[]; extraLegos: string[];
  scopeOverride: Record<string, FuncState>; approved: string[]; decisions: Record<string, Decision>; epicNotes: Record<string, string>;
  corrInt: Record<string, number>; corrExt: Record<string, number>;
  rates: Record<RateKey, number>; extFactor: number; sprintCap: number;
  baselines: Baseline[]; memos: Memo[]; attachments: Attachment[]; discussions: Discussion[]; changes: Change[]; raid: RaidItem[]; tickets: Ticket[];
  offer: OfferText; crmMap: CrmMapRow[]; modules: ModuleDef[];
  /** Function-level scope overrides: S = Sisältyy, O = Optio, E = Ei sisälly. */
  funcScope: Record<string, FuncState>;
  /** Reason for changing an Epic's default scope (shown in the offer's exclusions). */
  scopeReason: Record<string, string>;
  /** Prerequisite flags overriding the default list. */
  prereq: Record<string, boolean>;
  /** Customer proposals for Epic scope changes, awaiting seller approval. */
  scopeProposals: Record<string, ScopeProposal>;
  /** Last bulk action for open options per Duplo: in = mukaan, out = pois. No default. */
  bulkOpen: Record<string, "in" | "out">;
  /** Duplos handled by team "Talous"; the rest go to "Supply chain". */
  teamA?: string[];
}
export interface ScopeProposal { to: FuncState; reason: string; at: string; by: string }
