import * as XLSX from "xlsx";
import { CATALOG } from "@/data/catalog";
import type { ParamId } from "@/data/types";
import type { Baseline, Contact, ModuleDef, ModuleDriver, Project, RateKey, Target } from "@/lib/project-types";
import { emptyProject } from "@/lib/project-store";
import { EPIC_BY_ID, FUNC_BY_ID, PARAMS, RATE_LABEL, LEGO_BY_ID, DUPLO_BY_ID, MODULE_DEFAULTS } from "@/lib/scope-model";

export const SCHEMA_VERSION = 4;
const H: Record<string, string> = {
  id: "Tunnus", name: "Nimi", role: "Rooli", org: "Organisaatio", email: "Sähköposti", phone: "Puhelin", sourceId: "Lähdetunniste",
  date: "Päivä", title: "Otsikko", phase: "Vaihe", type: "Tyyppi", visibility: "Näkyvyys", participants: "Osallistujat", body: "Sisältö", source: "Lähde",
  parentType: "Kohdetyyppi", parentId: "Kohteen tunnus", kind: "Liitetyyppi", url: "Linkki", addedAt: "Lisätty",
  author: "Kirjoittaja", status: "Tila", ticketId: "Tiketti", changeId: "Muutospyyntö", createdAt: "Luotu", description: "Kuvaus", reason: "Perustelu",
  requester: "Pyytäjä", htpInt: "Htp sisäinen", htpExt: "Htp ulkoinen", scheduleImpact: "Aikatauluvaikutus", baselineVersion: "Lähtötaso",
  approverCustomer: "Hyväksyjä asiakas", approverFellowmind: "Hyväksyjä Fellowmind", approvedAt: "Hyväksytty pvm", discussionId: "Keskustelu",
  owner: "Vastuuhenkilö", probability: "Todennäköisyys", impact: "Vaikutus", dueDate: "Määräpäivä", mitigation: "Toimenpide", inOffer: "Tarjouksessa",
  issueType: "Jira-tyyppi", summary: "Yhteenveto", acceptance: "Hyväksymiskriteerit", component: "Komponentti", labels: "Tunnisteet", priority: "Prioriteetti",
};
const T_COLS: [keyof Target, string][] = [["duplo", "Kohde Duplo"], ["lego", "Kohde Lego"], ["epic", "Kohde Epic"], ["func", "Kohde Function"]];

type Row = Record<string, unknown>;
const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));
const num = (v: unknown) => { const n = Number(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : 0; };
const bool = (v: unknown) => ["true", "kyllä", "1", "x"].includes(str(v).trim().toLowerCase());

function listToRows(items: object[]): Row[] {
  return items.map((it) => {
    const r: Row = {};
    for (const [k, v] of Object.entries(it)) {
      if (k === "target") { const t = v as Target; for (const [tk, th] of T_COLS) r[th] = t[tk] ?? ""; r["Kohde (polku)"] = ""; continue; }
      r[H[k] ?? k] = typeof v === "boolean" ? (v ? "Kyllä" : "Ei") : v;
    }
    return r;
  });
}
function rowsToList<T>(rows: Row[], template: T): T[] {
  const tpl = template as Record<string, unknown>;
  return rows.filter((r) => str(r[H.id]).trim()).map((r) => {
    const o: Record<string, unknown> = {};
    for (const k of Object.keys(tpl)) {
      if (k === "target") { const t: Target = {}; for (const [tk, th] of T_COLS) { const v = str(r[th]).trim(); if (v) t[tk] = v; } o.target = t; continue; }
      const raw = r[H[k] ?? k];
      const d = tpl[k];
      o[k] = typeof d === "number" ? num(raw) : typeof d === "boolean" ? bool(raw) : str(raw);
    }
    return o as T;
  });
}
const TPL = {
  contact: { id: "", name: "", role: "", org: "Asiakas", email: "", phone: "", sourceId: "" },
  memo: { id: "", date: "", title: "", phase: "", type: "", visibility: "Sisäinen", participants: "", body: "", target: {}, source: "" },
  att: { id: "", parentType: "Muistio", parentId: "", name: "", kind: "", url: "", visibility: "Sisäinen", addedAt: "" },
  disc: { id: "", date: "", title: "", target: {}, body: "", author: "", status: "", visibility: "Sisäinen", ticketId: "", changeId: "" },
  change: { id: "", createdAt: "", title: "", description: "", reason: "", type: "", target: {}, requester: "", status: "", htpInt: 0, htpExt: 0, scheduleImpact: "", baselineVersion: "", approverCustomer: "", approverFellowmind: "", approvedAt: "", discussionId: "", ticketId: "", visibility: "Sisäinen" },
  raid: { id: "", type: "", title: "", description: "", target: {}, owner: "", probability: "", impact: "", status: "", dueDate: "", mitigation: "", inOffer: false, visibility: "Sisäinen" },
  ticket: { id: "", source: "", sourceId: "", issueType: "Story", summary: "", description: "", acceptance: "", target: {}, component: "", labels: "", htpInt: 0, htpExt: 0, priority: "", status: "", createdAt: "" },
};

function sheet(wb: XLSX.WorkBook, name: string, rows: Row[], widths?: number[]) {
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
  if (widths) ws["!cols"] = widths.map((w) => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, name);
}
const kv = (obj: Record<string, unknown>, prefix: string) => Object.entries(obj).map(([k, v]) => ({ Kenttä: `${prefix}.${k}`, Arvo: v }));

export function exportProject(p: Project) {
  const wb = XLSX.utils.book_new();
  sheet(wb, "_Meta", [
    { Avain: "Rakenneversio", Arvo: SCHEMA_VERSION }, { Avain: "Sovellus", Arvo: "F&O Scope Agent V8" }, { Avain: "Katalogi", Arvo: CATALOG.version },
    { Avain: "Projekti-ID", Arvo: p.id }, { Avain: "Projekti", Arvo: p.name }, { Avain: "Revisio", Arvo: p.revision }, { Avain: "Viety", Arvo: new Date().toISOString() },
  ], [18, 40]);
  sheet(wb, "Projekti", [...kv(p.customer as unknown as Record<string, unknown>, "customer"), ...kv(p.offer as unknown as Record<string, unknown>, "offer"), ...Object.entries(p.bulkOpen ?? {}).map(([d, v]) => ({ Kenttä: `bulk.${d}`, Arvo: v })), { Kenttä: "settings.teamA", Arvo: (p.teamA ?? []).join(",") }, { Kenttä: "settings.extFactor", Arvo: p.extFactor }, { Kenttä: "settings.sprintCap", Arvo: p.sprintCap }], [28, 80]);
  sheet(wb, "Moduulit", p.modules.map((m) => ({ Tunnus: m.id, Vaihe: m.phase, Nimi: m.name, Kuvaus: m.desc, Tuotokset: m.outputs, "Perus htp": m.base, Laskentaperuste: m.driver, Yksikkö: m.unitLabel, "Htp / yksikkö": m.unitRate, Määrä: m.units ?? "", Prosentti: m.pct, Luokka: m.scope === "O" ? "Optio" : "Sisältyy", Nostin: m.trigger, Oma: m.custom ? "Kyllä" : "Ei" })), [8, 26, 30, 50, 40, 9, 14, 12, 12, 8, 9, 10, 12, 6]);
  sheet(wb, "Yhteyshenkilöt", listToRows(p.contacts), [10, 24, 30, 12, 34, 18, 16]);
  sheet(wb, "Lähtötiedot", PARAMS.map((x) => ({ Parametri: x.id, Kysymys: x.q, Arvo: p.params[x.id], Selite: x.options.find((o) => o.v === p.params[x.id])?.label ?? "" })), [14, 48, 10, 20]);
  sheet(wb, "Scope", [...p.duplos.map((d) => ({ Tyyppi: "Duplo", Tunnus: d, Nimi: DUPLO_BY_ID[d]?.fi ?? "" })), ...p.extraLegos.map((l) => ({ Tyyppi: "Lisä-Lego", Tunnus: l, Nimi: LEGO_BY_ID[l]?.fi ?? "" }))], [12, 16, 30]);
  const epicIds = new Set([...Object.keys(p.scopeOverride), ...Object.keys(p.scopeReason ?? {}), ...Object.keys(p.prereq ?? {}), ...p.approved, ...Object.keys(p.corrInt), ...Object.keys(p.corrExt), ...Object.keys(p.epicNotes)]);
  sheet(wb, "Luokittelu", [...epicIds].map((id) => ({ "Epic-tunnus": id, Epic: EPIC_BY_ID[id]?.epic.t ?? p.modules.find((m) => m.id === id)?.name ?? "", Ehdotus: (EPIC_BY_ID[id]?.epic.s ?? p.modules.find((m) => m.id === id)?.scope) === "O" ? "Optio" : "Sisältyy", Luokka: p.scopeOverride[id] === "O" ? "Optio" : p.scopeOverride[id] === "S" ? "Sisältyy" : p.scopeOverride[id] === "E" ? "Ei sisälly" : "", Perustelu: p.scopeReason?.[id] ?? "", Perusedellytys: p.prereq?.[id] === true ? "Kyllä" : p.prereq?.[id] === false ? "Ei" : "", Hyväksytty: p.approved.includes(id) ? "Kyllä" : "Ei", "Korjaus sisäinen": p.corrInt[id] ?? 0, "Korjaus ulkoinen": p.corrExt[id] ?? 0, Muistiinpano: p.epicNotes[id] ?? "" })), [16, 50, 10, 10, 40, 12, 11, 10, 10, 50]);
  sheet(wb, "Optiopäätökset", Object.entries(p.decisions).map(([id, d]) => ({ Tunnus: id, Nimi: EPIC_BY_ID[id]?.epic.t ?? FUNC_BY_ID[id]?.fn.t ?? p.modules.find((m) => m.id === id)?.name ?? "", Päätös: d.choice, Perustelu: d.reason, Vastuuhenkilö: d.owner, Plussat: d.pros, Miinukset: d.cons })), [16, 50, 10, 50, 20, 40, 40]);
  sheet(wb, "Function_tila", Object.entries(p.funcScope ?? {}).map(([id, st]) => ({ "Function-tunnus": id, Function: FUNC_BY_ID[id]?.fn.t ?? "", "Epic-tunnus": FUNC_BY_ID[id]?.epic.id ?? "", Tila: st === "E" ? "Ei sisälly" : st === "O" ? "Optio" : "Sisältyy" })), [18, 60, 16, 12]);
  sheet(wb, "Asiakasehdotukset", Object.entries(p.scopeProposals ?? {}).map(([id, x]) => ({ "Epic-tunnus": id, Epic: EPIC_BY_ID[id]?.epic.t ?? "", Ehdotus: x.to === "E" ? "Ei sisälly" : x.to === "O" ? "Optio" : "Sisältyy", Perustelu: x.reason, Ehdottaja: x.by, Päivä: x.at })), [16, 50, 12, 50, 20, 12]);
  sheet(wb, "Lähtötasot", p.baselines.map((b) => ({ Tunnus: b.id, Versio: b.version, Lukittu: b.lockedAt, Lukitsija: b.lockedBy, Huomio: b.note, "Yhteensä sisäinen": b.totalInt, "Yhteensä ulkoinen": b.totalExt })), [10, 8, 12, 20, 50, 12, 12]);
  sheet(wb, "Lähtötaso_rivit", p.baselines.flatMap((b) => b.rows.map((r) => ({ Lähtötaso: b.id, "Epic-tunnus": r.epicId, Epic: EPIC_BY_ID[r.epicId]?.epic.t ?? p.modules.find((m) => m.id === r.epicId)?.name ?? "", Luokka: r.scope, "Htp sisäinen": r.htpInt, "Htp ulkoinen": r.htpExt }))), [10, 16, 50, 16, 12, 12]);
  sheet(wb, "Muistiot", listToRows(p.memos), [10, 12, 40, 20, 14, 18, 40, 80]);
  sheet(wb, "Liitteet", listToRows(p.attachments), [10, 12, 12, 40, 16, 60, 18, 12]);
  sheet(wb, "Keskustelut", listToRows(p.discussions));
  sheet(wb, "Muutokset", listToRows(p.changes));
  sheet(wb, "RAID", listToRows(p.raid));
  sheet(wb, "Tikettijono", listToRows(p.tickets));
  sheet(wb, "Yksikköhinnat", (Object.keys(RATE_LABEL) as RateKey[]).map((k) => ({ Koodi: k, Nimi: RATE_LABEL[k], Htp: p.rates[k] })), [8, 26, 8]);
  sheet(wb, "CRM_kartoitus", p.crmMap.map((m) => ({ Lähdekenttä: m.source, "Sovelluksen kenttä": m.target })), [34, 30]);
  XLSX.writeFile(wb, `ScopeAgent_${p.name.replace(/[^\p{L}\p{N}]+/gu, "_")}_r${p.revision}.xlsx`);
}

export interface ImportResult { project: Project; warnings: string[] }

export async function importProject(file: File): Promise<ImportResult> {
  const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: "array" });
  const rows = (n: string): Row[] => (wb.Sheets[n] ? XLSX.utils.sheet_to_json<Row>(wb.Sheets[n], { defval: "" }) : []);
  const meta = Object.fromEntries(rows("_Meta").map((r) => [str(r.Avain), r.Arvo]));
  if (!wb.Sheets._Meta) throw new Error("Tiedostosta puuttuu _Meta-välilehti, joten se ei ole Scope Agentin vienti.");
  const ver = num(meta.Rakenneversio);
  if (ver < 1 || ver > SCHEMA_VERSION) throw new Error(`Tiedoston rakenneversio ${str(meta.Rakenneversio)} ei ole tuettu (odotettu ${SCHEMA_VERSION}).`);
  const warnings: string[] = [];
  const id = str(meta["Projekti-ID"]) || `p-${Date.now()}`;
  const p = emptyProject(id, str(meta.Projekti) || "Tuotu projekti");
  p.revision = num(meta.Revisio);
  if (str(meta.Katalogi) && str(meta.Katalogi) !== CATALOG.version) warnings.push(`Tiedosto on tehty katalogilla "${str(meta.Katalogi)}", sovellus käyttää "${CATALOG.version}".`);
  for (const r of rows("Projekti")) {
    const [grp, key] = str(r.Kenttä).split(".");
    if (grp === "customer" && key in p.customer) (p.customer as unknown as Record<string, string>)[key] = str(r.Arvo);
    if (grp === "offer" && key in p.offer) (p.offer as unknown as Record<string, string>)[key] = str(r.Arvo);
    if (grp === "settings" && key === "extFactor") p.extFactor = num(r.Arvo) || 1;
    if (grp === "settings" && key === "sprintCap") p.sprintCap = num(r.Arvo) || 40;
    if (grp === "settings" && key === "teamA" && str(r.Arvo)) p.teamA = str(r.Arvo).split(",").map((x) => x.trim()).filter(Boolean);
    if (grp === "bulk" && (str(r.Arvo) === "in" || str(r.Arvo) === "out")) p.bulkOpen[key] = str(r.Arvo) as "in" | "out";
  }
  const DRIVERS: ModuleDriver[] = ["kiinteä", "yhtiöt", "maat", "määrä", "prosentti"];
  const modRows = rows("Moduulit").filter((r) => str(r.Tunnus).trim());
  if (modRows.length) p.modules = modRows.map((r): ModuleDef => ({ id: str(r.Tunnus).trim(), phase: str(r.Vaihe), name: str(r.Nimi), desc: str(r.Kuvaus), outputs: str(r.Tuotokset), base: num(r["Perus htp"]), driver: (DRIVERS.includes(str(r.Laskentaperuste) as ModuleDriver) ? str(r.Laskentaperuste) : "kiinteä") as ModuleDriver, unitLabel: str(r.Yksikkö), unitRate: num(r["Htp / yksikkö"]), units: str(r.Määrä).trim() === "" ? null : num(r.Määrä), pct: num(r.Prosentti), scope: str(r.Luokka) === "Optio" ? "O" : "S", trigger: str(r.Nostin), custom: bool(r.Oma) }));
  else { p.modules = MODULE_DEFAULTS.map((m) => ({ ...m })); if (ver === 1) warnings.push("Tiedostossa ei ollut moduuleja (rakenneversio 1) – moduulit asetettiin oletusarvoihin."); }
  const modIds = new Set(p.modules.map((m) => m.id));
  p.contacts = rowsToList(rows("Yhteyshenkilöt"), TPL.contact) as Contact[];
  for (const r of rows("Lähtötiedot")) { const k = str(r.Parametri) as ParamId; if (k in p.params) p.params[k] = str(r.Arvo); }
  const scope = rows("Scope");
  if (scope.length) {
    p.duplos = scope.filter((r) => str(r.Tyyppi) === "Duplo").map((r) => str(r.Tunnus)).filter((d) => { const ok = !!DUPLO_BY_ID[d]; if (!ok) warnings.push(`Tuntematon Duplo ${d} ohitettiin.`); return ok; });
    p.extraLegos = scope.filter((r) => str(r.Tyyppi) === "Lisä-Lego").map((r) => str(r.Tunnus)).filter((l) => !!LEGO_BY_ID[l]);
  }
  let unknown = 0;
  for (const r of rows("Luokittelu")) {
    const eid = str(r["Epic-tunnus"]); if (!EPIC_BY_ID[eid] && !modIds.has(eid)) { unknown++; continue; }
    const cls = str(r.Luokka); if (cls === "Optio") p.scopeOverride[eid] = "O"; else if (cls === "Sisältyy") p.scopeOverride[eid] = "S"; else if (cls === "Ei sisälly") p.scopeOverride[eid] = "E";
    if (str(r.Perustelu)) p.scopeReason[eid] = str(r.Perustelu);
    if (str(r.Perusedellytys) === "Kyllä") p.prereq[eid] = true; else if (str(r.Perusedellytys) === "Ei") p.prereq[eid] = false;
    if (bool(r.Hyväksytty)) p.approved.push(eid);
    if (num(r["Korjaus sisäinen"])) p.corrInt[eid] = num(r["Korjaus sisäinen"]);
    if (num(r["Korjaus ulkoinen"])) p.corrExt[eid] = num(r["Korjaus ulkoinen"]);
    if (str(r.Muistiinpano)) p.epicNotes[eid] = str(r.Muistiinpano);
  }
  for (const r of rows("Asiakasehdotukset")) {
    const eid = str(r["Epic-tunnus"]).trim(); if (!eid) continue; if (!EPIC_BY_ID[eid]) { unknown++; continue; }
    const t = str(r.Ehdotus); p.scopeProposals[eid] = { to: t === "Ei sisälly" ? "E" : t === "Optio" ? "O" : "S", reason: str(r.Perustelu), by: str(r.Ehdottaja), at: str(r.Päivä) };
  }
  for (const r of rows("Function_tila")) {
    const fid = str(r["Function-tunnus"]).trim(); if (!fid) continue; if (!FUNC_BY_ID[fid]) { unknown++; continue; }
    const t = str(r.Tila); p.funcScope[fid] = t === "Ei sisälly" ? "E" : t === "Optio" ? "O" : "S";
  }
  for (const r of rows("Optiopäätökset")) {
    const oid = str(r.Tunnus); if (!EPIC_BY_ID[oid] && !FUNC_BY_ID[oid] && !modIds.has(oid)) { unknown++; continue; }
    const ch = str(r.Päätös); p.decisions[oid] = { choice: ch === "valitaan" || ch === "eivalita" ? ch : "avoin", reason: str(r.Perustelu), owner: str(r.Vastuuhenkilö), pros: str(r.Plussat), cons: str(r.Miinukset) };
  }
  if (unknown) warnings.push(`${unknown} riviä viittasi prosesseihin, joita ei ole nykyisessä katalogissa – ne ohitettiin.`);
  const bRows = rows("Lähtötaso_rivit");
  p.baselines = rows("Lähtötasot").filter((r) => str(r.Tunnus)).map((r): Baseline => ({ id: str(r.Tunnus), version: str(r.Versio), lockedAt: str(r.Lukittu), lockedBy: str(r.Lukitsija), note: str(r.Huomio), totalInt: num(r["Yhteensä sisäinen"]), totalExt: num(r["Yhteensä ulkoinen"]), rows: bRows.filter((x) => str(x.Lähtötaso) === str(r.Tunnus)).map((x) => ({ epicId: str(x["Epic-tunnus"]), scope: str(x.Luokka), htpInt: num(x["Htp sisäinen"]), htpExt: num(x["Htp ulkoinen"]) })) }));
  p.memos = rowsToList(rows("Muistiot"), TPL.memo) as Project["memos"];
  p.attachments = rowsToList(rows("Liitteet"), TPL.att) as Project["attachments"];
  p.discussions = rowsToList(rows("Keskustelut"), TPL.disc) as Project["discussions"];
  p.changes = rowsToList(rows("Muutokset"), TPL.change) as Project["changes"];
  p.raid = rowsToList(rows("RAID"), TPL.raid) as Project["raid"];
  p.tickets = rowsToList(rows("Tikettijono"), TPL.ticket) as Project["tickets"];
  for (const r of rows("Yksikköhinnat")) { const k = str(r.Koodi) as RateKey; if (k in p.rates) p.rates[k] = num(r.Htp); }
  const crm = rows("CRM_kartoitus"); if (crm.length) p.crmMap = crm.map((r) => ({ source: str(r.Lähdekenttä), target: str(r["Sovelluksen kenttä"]) })).filter((m) => m.source && m.target);
  return { project: p, warnings };
}

/** Read a CRM export (first sheet) and map columns using the project's CRM mapping. */
export async function importCrm(file: File, p: Project): Promise<{ customer: Partial<Project["customer"]>; contacts: Contact[]; matched: number }> {
  const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: "array" });
  const rows = XLSX.utils.sheet_to_json<Row>(wb.Sheets[wb.SheetNames[0]], { defval: "" });
  if (!rows.length) throw new Error("Tiedostossa ei ole rivejä.");
  const headers = Object.keys(rows[0]);
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const col = (source: string) => { const full = norm(source); const tail = norm(source.split(".").pop() ?? ""); return headers.find((h) => norm(h) === full || norm(h) === tail); };
  const customer: Record<string, string> = {}; const contacts: Contact[] = []; let matched = 0;
  const map = p.crmMap.map((m) => ({ ...m, col: col(m.source) })).filter((m) => m.col);
  matched = map.length;
  for (const m of map) if (m.target.startsWith("customer.")) { const v = str(rows[0][m.col!]); if (v) customer[m.target.slice(9)] = v; }
  let n = p.contacts.reduce((a, c) => Math.max(a, Number(c.id.replace(/\D/g, "")) || 0), 0);
  for (const r of rows) {
    const c: Contact = { id: "", name: "", role: "", org: "Asiakas", email: "", phone: "", sourceId: "" };
    for (const m of map) if (m.target.startsWith("contact.")) (c as unknown as Record<string, string>)[m.target.slice(8)] = str(r[m.col!]);
    if (c.name && !contacts.some((x) => x.name === c.name) && !p.contacts.some((x) => x.name === c.name)) { n++; c.id = `YHT-${String(n).padStart(3, "0")}`; contacts.push(c); }
  }
  return { customer: customer as Partial<Project["customer"]>, contacts, matched };
}
