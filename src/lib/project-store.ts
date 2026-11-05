import { create } from "zustand";
import type { Project, Memo, Attachment, Discussion, Change, RaidItem, Ticket, Contact, Baseline } from "@/lib/project-types";
import { DEFAULT_PARAMS, DEFAULT_RATES, MODULE_DEFAULTS, computeModel, snapshotRows } from "@/lib/scope-model";

export type ListKey = "contacts" | "memos" | "attachments" | "discussions" | "changes" | "raid" | "tickets" | "baselines";
type ListItem<K extends ListKey> = Project[K][number];
type Updater<T> = T | ((prev: T) => T);

export const DYNAMICS_MAP = [
  { source: "account.name", target: "customer.name" }, { source: "account.accountnumber", target: "customer.businessId" },
  { source: "account.industrycode", target: "customer.industry" }, { source: "account.address1_composite", target: "customer.address" },
  { source: "account.websiteurl", target: "customer.website" }, { source: "account.accountid", target: "customer.sourceAccountId" },
  { source: "opportunity.name", target: "customer.opportunityName" }, { source: "opportunity.opportunityid", target: "customer.sourceOpportunityId" },
  { source: "opportunity.estimatedclosedate", target: "customer.expectedStart" }, { source: "opportunity.description", target: "customer.summary" },
  { source: "contact.fullname", target: "contact.name" }, { source: "contact.jobtitle", target: "contact.role" },
  { source: "contact.emailaddress1", target: "contact.email" }, { source: "contact.telephone1", target: "contact.phone" }, { source: "contact.contactid", target: "contact.sourceId" },
];

export function emptyProject(id: string, name: string): Project {
  return {
    id, name, revision: 0, updatedAt: new Date().toISOString(),
    customer: { name: "", businessId: "", industry: "", address: "", website: "", opportunityName: "", phase: "Opportunity review", goDate: "", goDecider: "", expectedStart: "", sourceSystem: "Dynamics 365 Sales", sourceAccountId: "", sourceOpportunityId: "", summary: "" },
    contacts: [], params: { ...DEFAULT_PARAMS }, duplos: ["90", "75", "65", "60"], extraLegos: [],
    scopeOverride: {}, approved: [], decisions: {}, epicNotes: {}, corrInt: {}, corrExt: {},
    rates: { ...DEFAULT_RATES }, extFactor: 1, sprintCap: 40,
    baselines: [], memos: [], attachments: [], discussions: [], changes: [], raid: [], tickets: [],
    offer: { title: "Dynamics 365 Finance & Operations – toteutustarjous", background: "", goals: "", validUntil: "", contactPerson: "", approach: "" },
    crmMap: DYNAMICS_MAP.map((r) => ({ ...r })),
    modules: MODULE_DEFAULTS.map((m) => ({ ...m })),
    funcScope: {},
    scopeReason: {}, prereq: {}, scopeProposals: {}, bulkOpen: {}, teamA: ["90", "10", "80", "55", "75.50.000.000", "65.30.000.000", "65.50.000.000"],
  };
}

function demoProject(): Project {
  const p = emptyProject("demo", "Demo");
  p.duplos = ["90", "75", "65", "60"];
  p.customer = {
    name: "Pohjolan Teollisuus Oy", businessId: "3198472-6", industry: "Koneenvalmistus", address: "Teollisuustie 14, 33720 Tampere", website: "pohjolanteollisuus.example",
    opportunityName: "ERP-uudistus 2027 – Finance & Supply Chain", phase: "Scope-työpaja", goDate: "2026-10-06", goDecider: "Business Line Director",
    expectedStart: "2027-01-11", sourceSystem: "Dynamics 365 Sales", sourceAccountId: "a7c1e2f4-0b3d-4e61-9a52-6f0d1c8e2b19", sourceOpportunityId: "5e2d9b70-31aa-4c8f-b6e2-8d14f07a3c55",
    summary: "Neljä yhtiötä (FI, SE, NO, EE). Nykyinen ERP tulee elinkaarensa päähän 2027. Tavoitteena yhtenäinen talous- ja hankintaprosessi sekä EDI-kumppanien siirto.",
  };
  p.contacts = [
    { id: "YHT-001", name: "Marja Lehtonen", role: "Talousjohtaja, projektin omistaja", org: "Asiakas", email: "marja.lehtonen@pohjolanteollisuus.example", phone: "+358 40 555 0141", sourceId: "c-1041" },
    { id: "YHT-002", name: "Juha Peltonen", role: "Hankintapäällikkö", org: "Asiakas", email: "juha.peltonen@pohjolanteollisuus.example", phone: "+358 40 555 0177", sourceId: "c-1042" },
    { id: "YHT-003", name: "Sanna Virtanen", role: "IT-päällikkö", org: "Asiakas", email: "sanna.virtanen@pohjolanteollisuus.example", phone: "+358 50 555 0193", sourceId: "c-1043" },
    { id: "YHT-004", name: "Heikki Salmi", role: "Solution Lead", org: "Fellowmind", email: "heikki.salmi@fellowmind.fi", phone: "", sourceId: "" },
    { id: "YHT-005", name: "Account Manager", role: "Asiakkuusvastaava", org: "Fellowmind", email: "", phone: "", sourceId: "" },
  ];
  p.decisions = {
    "90.60.080.000": { choice: "valitaan", reason: "Konsernilla neljä yhtiötä, konsolidointi tehdään nyt Excelissä.", owner: "Marja Lehtonen", pros: "Konsernin luvut samasta järjestelmästä\nEliminoinnit sääntöpohjaisesti", cons: "Vaatii yhtenäisen tilikartan" },
    "90.50.043.000": { choice: "valitaan", reason: "Sisäinen kauppa FI–SE–EE kuukausittain.", owner: "Marja Lehtonen", pros: "Automaattiset vastakirjaukset", cons: "" },
    M08: { choice: "valitaan", reason: "Konsernin kuukausiraportointi Power BI:hin.", owner: "Marja Lehtonen", pros: "Johdon raportit samasta datasta", cons: "Raporttien ylläpito asiakkaalle" },
    M12: { choice: "eivalita", reason: "Go-päätös tehty, PoC:lle ei tarvetta.", owner: "Heikki Salmi", pros: "", cons: "Pidentää aikataulua" },
    M13: { choice: "avoin", reason: "", owner: "Sanna Virtanen", pros: "Copilot talouden täsmäytyksiin\nAgentit ostotilausten seurantaan", cons: "AI Act -arvio ja lisensointi selvitettävä" },
    "75.80.010.000": { choice: "eivalita", reason: "Hankinta-analytiikka toteutetaan konsernin Power BI -ohjelmassa.", owner: "Juha Peltonen", pros: "", cons: "Päällekkäinen nykyisen raportoinnin kanssa" },
  };
  p.epicNotes = { "75.40.030.000": "Asiakas mainitsi n. 40 EDI-toimittajaa – tarkista volyymi ennen tarjousta." };
  p.funcScope = { "75.40.030.500": "E", "75.40.030.550": "E", "65.20.025.500": "O" };
  p.scopeOverride = { "75.10.005.000": "E" };
  p.scopeReason = { "75.10.005.000": "Asiakkaalla ei sisäisiä hankintaluetteloita – ostot tehdään sopimustoimittajilta suoraan." };
  p.scopeProposals = { "75.35.010.000": { to: "E", reason: "RFI-prosessia ei käytetä, kilpailutus tehdään suoraan tarjouspyynnöillä.", at: "2026-10-27", by: "Juha Peltonen" } };
  p.corrInt = { "75.40.030.000": 3 }; p.corrExt = { "75.40.030.000": 2 };
  p.modules = p.modules.map((m) => (m.id === "M07" ? { ...m, units: 5 } : m.id === "M08" ? { ...m, units: 6 } : m));
  p.approved = ["90.10.010.000", "90.10.035.000", "90.10.040.000", "90.10.050.000"];
  p.memos = [
    { id: "MUI-001", date: "2026-09-02", title: "Ensitapaaminen – ERP-uudistuksen tarve", phase: "Liidi", type: "Palaveri", visibility: "Sisäinen", participants: "Marja Lehtonen, Account Manager", body: "Nykyisen ERP:n tuki päättyy 2027. Kiinnostus F&O:hon, kilpailijana kaksi muuta toimittajaa. Päätös Q4.", target: {}, source: "Dynamics 365 Sales" },
    { id: "MUI-002", date: "2026-10-06", title: "Opportunity review – Go", phase: "Opportunity review", type: "Palaveri", visibility: "Sisäinen", participants: "Business Line Director, Heikki Salmi, Account Manager", body: "Go-päätös. Painopisteet: talous, hankinta, EDI. Varasto perustasolla, WMS myöhemmin.", target: {}, source: "Käsin" },
    { id: "MUI-003", date: "2026-10-13", title: "Scope-työpaja 1: Taloushallinto", phase: "Scope-työpaja", type: "Työpaja", visibility: "Asiakkaalle näkyvä", participants: "Marja Lehtonen, Sanna Virtanen, Heikki Salmi", body: "Käytiin läpi Record to report. Konsolidointi ja sisäinen kauppa valittiin. Budjetointi jää nykyiseen työkaluun.", target: { duplo: "90" }, source: "Teams" },
    { id: "MUI-004", date: "2026-10-15", title: "Scope-työpaja 2: Hankinta ja EDI", phase: "Scope-työpaja", type: "Työpaja", visibility: "Asiakkaalle näkyvä", participants: "Juha Peltonen, Sanna Virtanen, Heikki Salmi", body: "EDI-toimittajia n. 40, joista 12 suurta. Ostolaskut osin PDF:nä – Invoice Capture kiinnostaa.", target: { duplo: "75" }, source: "Teams" },
    { id: "MUI-005", date: "2026-10-19", title: "Hinnoittelu ja neuvottelurajat", phase: "Sopimusneuvottelu", type: "Muistiinpano", visibility: "Sisäinen", participants: "Heikki Salmi, Account Manager", body: "Asiakas odottaa kiinteähintaista osuutta talouteen. Varaus EDI-työmäärään.", target: {}, source: "Käsin" },
  ];
  p.attachments = [
    { id: "LII-001", parentType: "Muistio", parentId: "MUI-001", name: "Asiakkaan RFI-vastaus.pdf", kind: "Dokumentti", url: "https://example.sharepoint.com/sites/myynti/RFI.pdf", visibility: "Sisäinen", addedAt: "2026-09-02" },
    { id: "LII-002", parentType: "Muistio", parentId: "MUI-003", name: "Scope-työpaja 1 – tallenne", kind: "Teams-tallenne", url: "https://example-my.sharepoint.com/recordings/tyopaja1.mp4", visibility: "Asiakkaalle näkyvä", addedAt: "2026-10-13" },
    { id: "LII-003", parentType: "Muistio", parentId: "MUI-003", name: "Scope-työpaja 1 – litterointi", kind: "Litterointi", url: "https://example-my.sharepoint.com/recordings/tyopaja1.vtt", visibility: "Sisäinen", addedAt: "2026-10-13" },
    { id: "LII-004", parentType: "Muistio", parentId: "MUI-004", name: "EDI-kumppanilista.xlsx", kind: "Dokumentti", url: "https://example.sharepoint.com/sites/asiakas/EDI.xlsx", visibility: "Asiakkaalle näkyvä", addedAt: "2026-10-15" },
    { id: "LII-005", parentType: "Muutos", parentId: "MUU-001", name: "Konsernin raportointivaatimukset.docx", kind: "Dokumentti", url: "https://example.sharepoint.com/sites/asiakas/raportointi.docx", visibility: "Asiakkaalle näkyvä", addedAt: "2026-10-20" },
  ];
  p.discussions = [
    { id: "KES-001", date: "2026-10-15", title: "EDI-sanomat: tarvitaanko ORDRSP kaikille?", target: { lego: "75.40.000.000", epic: "75.40.030.000" }, body: "12 suurta toimittajaa lähettää tilausvahvistuksen EDI:llä, muut sähköpostilla. Selvitettävä tarvitaanko vahvistuksen automaattinen käsittely kaikille.", author: "Juha Peltonen", status: "Aihio luotu", visibility: "Asiakkaalle näkyvä", ticketId: "TIK-002", changeId: "" },
    { id: "KES-002", date: "2026-10-13", title: "Tilikartan yhtenäistäminen ennen konsolidointia", target: { lego: "90.10.000.000", epic: "90.10.040.000" }, body: "Ruotsin ja Norjan yhtiöillä omat tilikartat. Ehdotus: yhteinen konsernitilikartta + paikalliset tilit dimensiona.", author: "Marja Lehtonen", status: "Avoin", visibility: "Asiakkaalle näkyvä", ticketId: "", changeId: "" },
    { id: "KES-003", date: "2026-10-16", title: "Invoice Capture vai operaattorin skannaus?", target: { lego: "75.50.000.000", epic: "75.50.020.000" }, body: "Nykyinen operaattori tarjoaa skannauspalvelun. Vertailu kustannuksista ennen päätöstä.", author: "Heikki Salmi", status: "Avoin", visibility: "Sisäinen", ticketId: "", changeId: "" },
    { id: "KES-004", date: "2026-10-20", title: "Konsernin kuukausiraportointi Power BI:hin", target: { lego: "90.70.000.000" }, body: "Asiakas haluaa konsernin tuloslaskelman Power BI:hin jo ensimmäisessä vaiheessa.", author: "Marja Lehtonen", status: "Muutospyyntö luotu", visibility: "Asiakkaalle näkyvä", ticketId: "", changeId: "MUU-001" },
  ];
  p.changes = [
    { id: "MUU-001", createdAt: "2026-10-20", title: "Konsernin kuukausiraportointi Power BI:hin", description: "Konsernin tuloslaskelma ja tase Power BI -raporttina yhtiöittäin ja konsolidoituna.", reason: "Johtoryhmän kuukausiraportointi siirtyy pois Excelistä jo ensimmäisessä vaiheessa.", type: "Lisäys", target: { lego: "90.70.000.000", epic: "90.70.110.000" }, requester: "Marja Lehtonen", status: "Asiakkaan hyväksyttävänä", htpInt: 8, htpExt: 7, scheduleImpact: "Ei vaikutusta kriittiseen polkuun", baselineVersion: "v1.0", approverCustomer: "Marja Lehtonen", approverFellowmind: "Heikki Salmi", approvedAt: "", discussionId: "KES-004", ticketId: "", visibility: "Asiakkaalle näkyvä" },
    { id: "MUU-002", createdAt: "2026-10-20", title: "Toimittajaportaali 12 suurelle toimittajalle", description: "Vendor collaboration -portaali niille toimittajille, joilla ei ole EDI-valmiutta.", reason: "Vähentää tilausvahvistusten sähköpostiliikennettä.", type: "Lisäys", target: { lego: "75.30.000.000" }, requester: "Juha Peltonen", status: "Luonnos", htpInt: 12, htpExt: 10, scheduleImpact: "+2 viikkoa hankinnan sprinttiin", baselineVersion: "v1.0", approverCustomer: "", approverFellowmind: "", approvedAt: "", discussionId: "", ticketId: "", visibility: "Asiakkaalle näkyvä" },
    { id: "MUU-003", createdAt: "2026-10-20", title: "Budjettivalvonta pois ensimmäisestä vaiheesta", description: "Budjettien tarkistus ostotilauksilla siirretään vaiheeseen 2.", reason: "Budjetointi jää nykyiseen työkaluun 2027.", type: "Poisto", target: { lego: "90.30.000.000" }, requester: "Marja Lehtonen", status: "Hyväksytty", htpInt: -4, htpExt: -4, scheduleImpact: "Ei vaikutusta", baselineVersion: "v1.0", approverCustomer: "Marja Lehtonen", approverFellowmind: "Heikki Salmi", approvedAt: "2026-10-20", discussionId: "", ticketId: "TIK-003", visibility: "Asiakkaalle näkyvä" },
  ];
  p.raid = [
    { id: "RAID-001", type: "Oletus", title: "Asiakas toimittaa siirrettävän datan siivottuna", description: "Master data (asiakkaat, toimittajat, nimikkeet) toimitetaan sovitussa Excel-muodossa ja siivottuna.", target: {}, owner: "Sanna Virtanen", probability: "", impact: "Korkea", status: "Avoin", dueDate: "", mitigation: "", inOffer: true, visibility: "Asiakkaalle näkyvä" },
    { id: "RAID-002", type: "Oletus", title: "Yhteinen konsernitilikartta päätetään ennen toteutusta", description: "", target: { lego: "90.10.000.000" }, owner: "Marja Lehtonen", probability: "", impact: "Korkea", status: "Avoin", dueDate: "2026-12-15", mitigation: "", inOffer: true, visibility: "Asiakkaalle näkyvä" },
    { id: "RAID-003", type: "Riippuvuus", title: "EDI-operaattorin testiympäristö käytettävissä", description: "Operaattorin testiympäristö ja yhteyshenkilö viimeistään sprintissä 3.", target: { lego: "75.40.000.000" }, owner: "Juha Peltonen", probability: "", impact: "Keskitaso", status: "Avoin", dueDate: "2027-02-01", mitigation: "", inOffer: true, visibility: "Asiakkaalle näkyvä" },
    { id: "RAID-004", type: "Riski", title: "EDI-kumppanien testausaikataulu venyy", description: "40 kumppanin testaus vaatii kumppaneiden resursseja.", target: { epic: "75.40.030.000" }, owner: "Heikki Salmi", probability: "Keskitaso", impact: "Korkea", status: "Seurannassa", dueDate: "", mitigation: "Aaltoaikataulu: 12 suurta ensin, muut go-liven jälkeen.", inOffer: false, visibility: "Sisäinen" },
    { id: "RAID-005", type: "Riski", title: "Avainkäyttäjien saatavuus tilinpäätöksen aikaan", description: "Talouden avainkäyttäjät sidottuja tammi–helmikuussa.", target: { duplo: "90" }, owner: "Marja Lehtonen", probability: "Korkea", impact: "Keskitaso", status: "Avoin", dueDate: "", mitigation: "Talouden työpajat ennen joulua ja maaliskuussa.", inOffer: false, visibility: "Sisäinen" },
    { id: "RAID-006", type: "Avoin kysymys", title: "Norjan yhtiön SAF-T-raportointi", description: "Tarvitaanko SAF-T Norway ensimmäisessä vaiheessa?", target: { lego: "90.10.000.000" }, owner: "Marja Lehtonen", probability: "", impact: "Keskitaso", status: "Avoin", dueDate: "2026-11-05", mitigation: "", inOffer: true, visibility: "Asiakkaalle näkyvä" },
  ];
  p.tickets = [
    { id: "TIK-001", source: "Scope", sourceId: "90.60.080.000", issueType: "Epic", summary: "Consolidate and eliminate financials", description: "Konsolidointi ja eliminoinnit neljälle yhtiölle.", acceptance: "Konsernin tuloslaskelma ja tase täsmäävät rinnakkaisajossa.", target: { epic: "90.60.080.000" }, component: "Taloushallinto", labels: "Konsernitoiminnot", htpInt: 0, htpExt: 0, priority: "Korkea", status: "Hyväksytty", createdAt: "2026-10-20" },
    { id: "TIK-002", source: "Keskustelu", sourceId: "KES-001", issueType: "Story", summary: "Selvitä EDI-tilausvahvistusten automaattinen käsittely", description: "Kartoita, mitkä 12 suurta toimittajaa lähettävät ORDRSP-sanoman ja millä versiolla.", acceptance: "Lista toimittajista ja sanomaversioista hyväksytty hankintapäällikön kanssa.", target: { epic: "75.40.030.000" }, component: "Hankinta", labels: "EDI", htpInt: 2, htpExt: 2, priority: "Normaali", status: "Arvioitu", createdAt: "2026-10-15" },
    { id: "TIK-003", source: "Muutos", sourceId: "MUU-003", issueType: "Task", summary: "Poista budjettivalvonta vaiheen 1 backlogista", description: "Hyväksytty muutos MUU-003.", acceptance: "Budjettivalvonnan Storyt siirretty vaiheeseen 2.", target: { lego: "90.30.000.000" }, component: "Taloushallinto", labels: "Muutos", htpInt: -4, htpExt: -4, priority: "Matala", status: "Hyväksytty", createdAt: "2026-10-20" },
  ];
  p.offer = {
    title: "Dynamics 365 Finance & Operations – toteutustarjous",
    background: "Pohjolan Teollisuus Oy:n nykyinen toiminnanohjausjärjestelmä tulee elinkaarensa päähän vuonna 2027. Konserni uudistaa talous-, hankinta-, myynti- ja varastoprosessinsa Microsoft Dynamics 365 Finance & Operations -ratkaisuun neljässä yhtiössä.",
    goals: "Yhtenäinen konsernin talousprosessi ja kuukausisulku\nSähköinen hankinta ja EDI-kumppanien siirto\nKonsolidointi ja sisäinen kauppa ilman Exceliä\nMicrosoftin vakioprosessit mahdollisimman laajasti",
    validUntil: "2026-11-30", contactPerson: "Heikki Salmi, Solution Lead",
    approach: "Toteutus perustuu Microsoftin Business Process Catalogiin ja Fellowmindin vakioituun toimitusmalliin. Työ etenee sprinteissä, ja jokainen prosessialue hyväksytään asiakkaan kanssa ennen siirtymistä seuraavaan.",
  };
  const m = computeModel(p);
  const b: Baseline = { id: "LT-001", version: "v1.0", lockedAt: "2026-10-17", lockedBy: "Heikki Salmi", note: "Scope-työpajojen 1–2 jälkeen, tarjousluonnoksen pohja.", totalInt: +m.totalInt.toFixed(1), totalExt: +m.totalExt.toFixed(1), rows: snapshotRows(m) };
  p.baselines = [b];
  p.revision = 3;
  return p;
}

interface StoreState {
  projects: Record<string, Project>; activeId: string;
  update: (fn: (p: Project) => Project) => void;
  setActive: (id: string) => void;
  addProject: (p: Project) => void;
}

export const useProjectStore = create<StoreState>((set) => ({
  projects: { demo: demoProject() }, activeId: "demo",
  update: (fn) => set((s) => { const cur = s.projects[s.activeId]; const next = { ...fn(cur), updatedAt: new Date().toISOString() }; return { projects: { ...s.projects, [s.activeId]: next } }; }),
  setActive: (id) => set({ activeId: id }),
  addProject: (p) => set((s) => ({ projects: { ...s.projects, [p.id]: p }, activeId: p.id })),
}));

export const useProject = () => useProjectStore((s) => s.projects[s.activeId]);

/** React-style [value, setter] bound to a project field. */
export function useField<K extends keyof Project>(k: K): [Project[K], (v: Updater<Project[K]>) => void] {
  const value = useProjectStore((s) => s.projects[s.activeId][k]);
  const update = useProjectStore((s) => s.update);
  const setter = (v: Updater<Project[K]>) => update((p) => ({ ...p, [k]: typeof v === "function" ? (v as (prev: Project[K]) => Project[K])(p[k]) : v }));
  return [value, setter];
}

export function nextId(prefix: string, items: { id: string }[]) {
  const max = items.reduce((a, x) => { const m = x.id.match(/(\d+)$/); return m && x.id.startsWith(prefix) ? Math.max(a, Number(m[1])) : a; }, 0);
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

export function useList<K extends ListKey>(k: K) {
  const items = useProjectStore((s) => s.projects[s.activeId][k]) as ListItem<K>[];
  const update = useProjectStore((s) => s.update);
  const add = (item: ListItem<K>) => update((p) => ({ ...p, [k]: [...(p[k] as ListItem<K>[]), item] }));
  const patch = (id: string, ch: Partial<ListItem<K>>) => update((p) => ({ ...p, [k]: (p[k] as ListItem<K>[]).map((x) => (x.id === id ? { ...x, ...ch } : x)) }));
  const remove = (id: string) => update((p) => ({ ...p, [k]: (p[k] as ListItem<K>[]).filter((x) => x.id !== id) }));
  return { items, add, patch, remove };
}
export type { Memo, Attachment, Discussion, Change, RaidItem, Ticket, Contact };
