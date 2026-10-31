import { CATALOG } from "@/data/catalog";
import type { CDuplo, CEpic, CFunc, CLego, ParamId } from "@/data/types";
import type { BaselineRow, FuncState, ModuleDef, Project, RateKey, Target } from "@/lib/project-types";

export const DEL_TYPES: Record<string, string> = { W: "Workflow", R: "Report", I: "Integration", C: "Configuration", E: "Enhancement", D: "Documentation (SOP)", J: "Job", M: "Migration", P: "Personalization", S: "Security" };
export const DEL_ORDER = ["W", "R", "I", "C", "E", "D", "J", "M", "P", "S"];
export const RATE_LABEL: Record<RateKey, string> = { C: "Konfiguraatio", W: "Työnkulku", I: "Integraatio", J: "Ajo (batch)", M: "Migraatio", D: "SOP-dokumentti", X: "Erikoistapauksen lisätyö" };
export const DEFAULT_RATES: Record<RateKey, number> = { C: 0.25, W: 1, I: 5, J: 0.25, M: 2, D: 0.5, X: 2 };

export const PARAMS: { id: ParamId; q: string; options: { v: string; label: string }[]; active: (v: string) => boolean }[] = [
  { id: "companies", q: "Montako juridista yhtiötä otetaan käyttöön?", options: [{ v: "1", label: "Yksi" }, { v: "2-5", label: "2–5" }, { v: "6+", label: "6 tai enemmän" }], active: (v) => v !== "1" },
  { id: "countries", q: "Missä maissa yhtiöt toimivat?", options: [{ v: "fi", label: "Vain Suomi" }, { v: "nordic", label: "Pohjoismaat" }, { v: "eu", label: "EU ja muut" }], active: (v) => v !== "fi" },
  { id: "currencies", q: "Kuinka monella valuutalla asioidaan?", options: [{ v: "one", label: "Vain euro" }, { v: "multi", label: "Useita" }], active: (v) => v === "multi" },
  { id: "edi", q: "Vaihdetaanko tilauksia ja laskuja EDI:llä?", options: [{ v: "no", label: "Ei" }, { v: "yes", label: "Kyllä" }], active: (v) => v === "yes" },
  { id: "apInvoices", q: "Miten ostolaskut pääosin saapuvat?", options: [{ v: "einvoice", label: "Verkkolaskuina" }, { v: "ocr", label: "PDF / paperi" }, { v: "mixed", label: "Molempia" }], active: (v) => v !== "einvoice" },
  { id: "portal", q: "Tarvitaanko toimittaja- tai asiakasportaali?", options: [{ v: "no", label: "Ei" }, { v: "yes", label: "Kyllä" }], active: (v) => v === "yes" },
  { id: "wms", q: "Millainen varastonhallinta tarvitaan?", options: [{ v: "basic", label: "Perusvarasto" }, { v: "advanced", label: "WMS + mobiili" }], active: (v) => v === "advanced" },
  { id: "budget", q: "Miten budjetointi hoidetaan?", options: [{ v: "none", label: "Nykyisellä työkalulla" }, { v: "planning", label: "F&O:ssa" }, { v: "control", label: "F&O + valvonta" }], active: (v) => v !== "none" },
];
export const DEFAULT_PARAMS: Record<ParamId, string> = { companies: "2-5", countries: "nordic", currencies: "multi", edi: "yes", apInvoices: "mixed", portal: "no", wms: "basic", budget: "none" };
export const REFS: Record<string, string[]> = { "90": ["75.50.000.000", "65.30.000.000"], "75": ["90.25.000.000"], "65": ["60.40.000.000"], "60": ["75.40.000.000"], "70": ["60.20.000.000"], "80": ["90.50.000.000"] };

export const DUPLOS = CATALOG.duplos;
export type LegoX = CLego & { owner: string };
export const ALL_LEGOS: LegoX[] = DUPLOS.flatMap((d) => d.l.map((l) => ({ ...l, owner: d.id })));
export const LEGO_BY_ID: Record<string, LegoX> = Object.fromEntries(ALL_LEGOS.map((l) => [l.id, l]));
export const DUPLO_BY_ID: Record<string, CDuplo> = Object.fromEntries(DUPLOS.map((d) => [d.id, d]));
export const EPIC_BY_ID: Record<string, { epic: CEpic; lego: LegoX; duplo: CDuplo }> = {};
export const FUNC_BY_ID: Record<string, { fn: CFunc; epic: CEpic }> = {};
for (const l of ALL_LEGOS) for (const e of l.e) { EPIC_BY_ID[e.id] = { epic: e, lego: l, duplo: DUPLO_BY_ID[l.owner] }; for (const f of e.f) FUNC_BY_ID[f.id] = { fn: f, epic: e }; }

export function targetLabel(t: Target): string {
  if (t.func && FUNC_BY_ID[t.func]) return `${FUNC_BY_ID[t.func].fn.t}`;
  if (t.epic && EPIC_BY_ID[t.epic]) return EPIC_BY_ID[t.epic].epic.t;
  if (t.lego && LEGO_BY_ID[t.lego]) return LEGO_BY_ID[t.lego].fi;
  if (t.duplo && DUPLO_BY_ID[t.duplo]) return DUPLO_BY_ID[t.duplo].fi;
  return "";
}
export function targetPath(t: Target): string {
  const parts: string[] = [];
  const d = t.duplo ?? (t.lego ? LEGO_BY_ID[t.lego]?.owner : undefined) ?? (t.epic ? EPIC_BY_ID[t.epic]?.duplo.id : undefined);
  if (d && DUPLO_BY_ID[d]) parts.push(DUPLO_BY_ID[d].fi);
  const l = t.lego ?? (t.epic ? EPIC_BY_ID[t.epic]?.lego.id : undefined);
  if (l && LEGO_BY_ID[l]) parts.push(LEGO_BY_ID[l].fi);
  if (t.epic && EPIC_BY_ID[t.epic]) parts.push(EPIC_BY_ID[t.epic].epic.t);
  if (t.func && FUNC_BY_ID[t.func]) parts.push(FUNC_BY_ID[t.func].fn.t);
  return parts.join(" › ");
}
export const targetId = (t: Target) => t.func ?? t.epic ?? t.lego ?? t.duplo ?? "";

export interface OptionItem { id: string; kind: "epic" | "function"; name: string; duplo: CDuplo; lego: LegoX; epic: CEpic; fn?: CFunc; rule: string | null; tr: ParamId[]; effInt: number; effExt: number; desc: string }
export interface IncludedEpic { duplo: CDuplo; lego: LegoX; epic: CEpic; funcs: CFunc[]; calc: number; corrInt: number; corrExt: number; totalInt: number; totalExt: number; sops: number }

export function isTrig(tr: ParamId[], params: Record<ParamId, string>) {
  return tr.some((p) => PARAMS.find((x) => x.id === p)!.active(params[p]));
}

const M = (id: string, phase: number, name: string, desc: string, outputs: string, base: number, scope: "S" | "O", extra: Partial<ModuleDef> = {}): ModuleDef =>
  ({ id, phase: ["Käynnistys ja suunnittelu", "Toteutus", "Valmistelu ja käyttöönotto", "Käyttö ja jatkuvuus"][phase], name, desc, outputs, base, driver: "kiinteä", unitLabel: "", unitRate: 0, units: null, pct: 0, scope, trigger: "", custom: false, ...extra });
export const MODULE_DEFAULTS: ModuleDef[] = [
  M("M01", 0, "Projektinhallinta", "Projektisuunnitelma, ohjausryhmät, raportointi sekä riskien- ja muutostenhallinta", "Projektisuunnitelma, tilanneraportit", 0, "S", { driver: "prosentti", pct: 12 }),
  M("M02", 0, "Esiselvitys ja tavoitteet", "Liiketoimintatavoitteet, käyttötapaukset ja mittarit", "Tavoitekartta, use case -lista", 5, "O"),
  M("M03", 0, "Ratkaisuarkkitehtuuri", "Tavoitearkkitehtuuri, ympäristöstrategia ja teknologiavalinnat", "Arkkitehtuurikuvaus, ympäristösuunnitelma", 6, "S"),
  M("M04", 0, "Ympäristöt ja ALM", "Ympäristöjen pystytys, DevOps-putki, versionhallinta ja päivitysten hallinta", "Ympäristöt, ALM-ohje", 4, "S", { driver: "määrä", unitLabel: "ympäristö", unitRate: 1.5, units: 4 }),
  M("M05", 1, "Datakartoitus", "Lähteet, laatu, omistajuus ja käyttöoikeudet", "Datakartta, laaturaportti", 8, "S"),
  M("M06", 1, "Datamigraatio", "Migraatiopaketit, ajoharjoitukset ja täsmäytys", "Migraatiosuunnitelma, täsmäytysraportit", 4, "S", { driver: "määrä", unitLabel: "ajoharjoitus", unitRate: 3, units: 3 }),
  M("M07", 1, "Integraatiot", "Liittymät lähdejärjestelmiin, operaattoreihin ja kumppaneihin", "Integraatiot ja testit", 4, "S", { driver: "määrä", unitLabel: "integraatio", unitRate: 6, units: 3, trigger: "edi" }),
  M("M08", 1, "Raportointi ja analytiikka", "Power BI -raportit ja talouden raportointi", "Raporttikatalogi, raportit", 3, "O", { driver: "määrä", unitLabel: "raportti", unitRate: 2, units: 5 }),
  M("M09", 1, "Laajennukset", "Vakiotoiminnallisuutta täydentävät laajennukset", "Laajennukset, tekninen dokumentaatio", 2, "O", { driver: "määrä", unitLabel: "laajennus", unitRate: 5, units: 2 }),
  M("M10", 1, "Tietoturva ja compliance", "Roolit, tehtävien eriyttäminen (SoD), uhkamallinnus ja auditointi", "Roolimalli, riskiarvio, compliance-dokumentaatio", 8, "S", { driver: "yhtiöt", unitLabel: "yhtiö", unitRate: 1 }),
  M("M11", 1, "Lokalisointi ja viranomaisraportointi", "Maakohtaiset vaatimukset, sähköinen laskutus ja viranomaisraportit", "Lokalisointimatriisi, ER-konfiguraatiot", 2, "S", { driver: "maat", unitLabel: "maa", unitRate: 4, trigger: "countries" }),
  M("M12", 1, "PoC / Pilotti", "Rajattu toteutus ja hyötyjen todentaminen", "PoC-ratkaisu, arviointiraportti", 15, "O"),
  M("M13", 1, "Copilot ja AI-agentit", "Copilot-ominaisuudet ja F&O-agentit, AI Act -luokitus", "Agenttien kuvaus, AI-riskiarvio", 10, "O"),
  M("M14", 2, "Testaus ja evaluointi", "Järjestelmä-, regressio- ja hyväksymistestauksen tuki", "Testisuunnitelma, testiraportti", 8, "S", { driver: "yhtiöt", unitLabel: "yhtiö", unitRate: 2 }),
  M("M15", 2, "Suorituskykytestaus", "Kuormitus- ja suorituskykytestit kriittisille prosesseille", "Suorituskykyraportti", 6, "O"),
  M("M16", 2, "Koulutus ja adoptio", "Pääkäyttäjäkoulutus, käyttäjäviestintä ja muutosjohtaminen", "Koulutusmateriaalit", 5, "S", { driver: "yhtiöt", unitLabel: "yhtiö", unitRate: 1 }),
  M("M17", 2, "Käyttöönotto", "Cutover-suunnitelma, tuotantoonvienti ja hallittu rollout", "Käyttöönottosuunnitelma", 6, "S", { driver: "yhtiöt", unitLabel: "yhtiö", unitRate: 2 }),
  M("M18", 3, "Hypercare", "Tehostettu tuki käyttöönoton jälkeen", "Hypercare-raportti", 0, "S", { driver: "määrä", unitLabel: "viikko", unitRate: 2.5, units: 4 }),
  M("M19", 3, "Siirto jatkuvaan palveluun", "Palvelukuvaus, SLA ja siirto ylläpitotiimille", "Palvelukuvaus, SLA", 3, "S"),
  M("M20", 3, "Rollout lisäyhtiöihin", "Toteutetun ratkaisun laajentaminen uusiin yhtiöihin tai maihin", "Rollout-suunnitelma", 0, "O", { driver: "määrä", unitLabel: "yhtiö", unitRate: 8, units: 2, trigger: "companies" }),
];
const COMPANY_UNITS: Record<string, number> = { "1": 1, "2-5": 4, "6+": 8 };
const COUNTRY_UNITS: Record<string, number> = { fi: 1, nordic: 3, eu: 5 };
export function unitsOf(m: ModuleDef, params: Project["params"]): number {
  if (m.driver === "yhtiöt") return m.units ?? COMPANY_UNITS[params.companies] ?? 1;
  if (m.driver === "maat") return m.units ?? COUNTRY_UNITS[params.countries] ?? 1;
  if (m.driver === "määrä") return m.units ?? 0;
  return 0;
}
export const moduleTrig = (m: ModuleDef, params: Project["params"]) => !!m.trigger && m.trigger in params && isTrig([m.trigger as ParamId], params);

export interface ModuleResult { mod: ModuleDef; units: number; included: boolean; isOpt: boolean; calc: number; corrInt: number; corrExt: number; totalInt: number; totalExt: number; effInt: number; effExt: number }
export interface DecisionLine { id: string; kind: "epic" | "function" | "module"; name: string; path: string; effInt: number; effExt: number }

/** Theme groups for bulk function tagging. `param` + `inactive` = suggest "E" when the start-data answer makes the theme irrelevant. */
export interface Theme { id: string; label: string; re: RegExp; param?: ParamId; inactive?: (v: string) => boolean }
export const THEMES: Theme[] = [
  { id: "ic", label: "Intercompany", re: /intercompany|inter-company/i, param: "companies", inactive: (v) => v === "1" },
  { id: "dd", label: "Suoratoimitus", re: /direct deliver|drop ship/i },
  { id: "edi", label: "EDI", re: /\bEDI\b|electronic data interchange/i, param: "edi", inactive: (v) => v === "no" },
  { id: "sub", label: "Tilauslaskutus", re: /subscription/i },
  { id: "cons", label: "Konsignaatio", re: /consign/i },
  { id: "loc", label: "Maakohtaiset lokalisoinnit", re: /LATAM|Brazil|India|Mexic|Argentin|Chile|Peru|Colomb|Russia|China|Japan|Saudi|Egypt|Gulf|Thai|Malays|Paraguay|Uruguay|Bolivia|Ecuador/i },
];
export const themesOf = (title: string) => THEMES.filter((t) => t.re.test(title));
export interface FuncStateInfo { state: FuncState; source: "valinta" | "lähtötiedot" | "oletus"; theme?: string }
export function funcStateOf(p: Pick<Project, "funcScope" | "params">, f: CFunc): FuncStateInfo {
  const o = p.funcScope?.[f.id];
  if (o) return { state: o, source: "valinta" };
  for (const t of THEMES) if (t.param && t.inactive?.(p.params[t.param]) && t.re.test(f.t)) return { state: "E", source: "lähtötiedot", theme: t.label };
  return { state: f.o ? "O" : "S", source: "oletus" };
}
export interface PartialInfo { excluded: CFunc[]; declined: CFunc[]; open: CFunc[] }
/** Functions below an Epic that are not simply included: explicitly excluded, declined options and open options. */
export function partialOf(p: Project, e: CEpic): PartialInfo {
  const r: PartialInfo = { excluded: [], declined: [], open: [] };
  for (const f of e.f) {
    const s = funcStateOf(p, f).state;
    if (s === "E") r.excluded.push(f);
    else if (s === "O") { const c = p.decisions[f.id]?.choice ?? "avoin"; if (c === "eivalita") r.declined.push(f); else if (c === "avoin") r.open.push(f); }
  }
  return r;
}

/** Epics that the implementation cannot work without; excluding them warns. Editable per project. */
export const DEFAULT_PREREQ = ["90.10.010", "90.10.020", "90.10.035", "90.10.040", "90.10.050", "90.10.200", "90.25.100", "75.10.010", "75.10.050", "75.30.030", "65.05.030", "65.05.050", "60.10.020", "70.10.010"].map((x) => `${x}.000`);
export const isPrereq = (p: Pick<Project, "prereq">, id: string) => p.prereq?.[id] ?? DEFAULT_PREREQ.includes(id);

export function computeModel(p: Project) {
  const { rates, extFactor } = p;
  const ch = (id: string) => p.decisions[id]?.choice ?? "avoin";
  const sc = (e: CEpic) => p.scopeOverride[e.id] ?? e.s;
  const duplos = new Set(p.duplos); const extra = new Set(p.extraLegos);
  const scopeLegos = ALL_LEGOS.filter((l) => duplos.has(l.owner) || extra.has(l.id));
  const options: OptionItem[] = []; const included: IncludedEpic[] = [];
  const funcExclusions: { duplo: CDuplo; lego: LegoX; epic: CEpic; funcs: CFunc[] }[] = [];
  const epicExclusions: { duplo: CDuplo; lego: LegoX; epic: CEpic; reason: string; prereq: boolean }[] = [];
  for (const lego of scopeLegos) {
    const duplo = DUPLO_BY_ID[lego.owner];
    const share = lego.dl.reduce((a, d) => a + (rates[d[1] as RateKey] ?? 0), 0) / lego.e.length;
    for (const epic of lego.e) {
      if (sc(epic) === "E") { epicExclusions.push({ duplo, lego, epic, reason: p.scopeReason?.[epic.id] ?? "", prereq: isPrereq(p, epic.id) }); continue; }
      const isOpt = sc(epic) === "O";
      const fst = (f: CFunc) => funcStateOf(p, f).state;
      const fEff = (f: CFunc) => f.sop * rates.D + (f.o ? rates.X : 0);
      const baseFuncs = epic.f.filter((f) => fst(f) === "S");
      const epicEff = share + baseFuncs.reduce((a, f) => a + fEff(f), 0);
      if (isOpt) options.push({ id: epic.id, kind: "epic", name: epic.t, duplo, lego, epic, rule: epic.r, tr: epic.tr, effInt: epicEff, effExt: epicEff * extFactor, desc: epic.d });
      const epicIn = !isOpt || ch(epic.id) === "valitaan";
      if (!epicIn) continue;
      for (const fn of epic.f.filter((f) => fst(f) === "O")) { const e = fEff(fn); options.push({ id: fn.id, kind: "function", name: fn.t, duplo, lego, epic, fn, rule: fn.o, tr: fn.tr, effInt: e, effExt: e * extFactor, desc: "" }); }
      const chosenF = epic.f.filter((f) => fst(f) === "O" && ch(f.id) === "valitaan");
      const exclF = epic.f.filter((f) => fst(f) === "E");
      if (exclF.length) funcExclusions.push({ duplo, lego, epic, funcs: exclF });
      const calc = epicEff + chosenF.reduce((a, f) => a + fEff(f), 0);
      const ci = p.corrInt[epic.id] ?? 0; const ce = p.corrExt[epic.id] ?? 0;
      const funcs = [...baseFuncs, ...chosenF];
      included.push({ duplo, lego, epic, funcs, calc, corrInt: ci, corrExt: ce, totalInt: Math.max(0, calc + ci), totalExt: Math.max(0, calc * extFactor + ce), sops: funcs.reduce((a, f) => a + f.sop, 0) });
    }
  }
  const open = options.filter((o) => ch(o.id) === "avoin");
  const excluded = options.filter((o) => ch(o.id) === "eivalita");
  const processInt = included.reduce((a, x) => a + x.totalInt, 0);
  const processExt = included.reduce((a, x) => a + x.totalExt, 0);
  // Modules: fixed / per-unit first, percentage modules on top of process + other modules.
  const mods: ModuleResult[] = (p.modules ?? []).map((mod) => {
    const isOpt = (p.scopeOverride[mod.id] ?? mod.scope) === "O";
    const inc = !isOpt || ch(mod.id) === "valitaan";
    const units = unitsOf(mod, p.params);
    const calc = mod.driver === "prosentti" ? 0 : mod.base + mod.unitRate * units;
    return { mod, units, included: inc, isOpt, calc, corrInt: p.corrInt[mod.id] ?? 0, corrExt: p.corrExt[mod.id] ?? 0, totalInt: 0, totalExt: 0, effInt: 0, effExt: 0 };
  });
  for (const r of mods) if (r.mod.driver !== "prosentti") { r.effInt = r.calc; r.effExt = r.calc * extFactor; }
  const fixedInt = mods.filter((r) => r.included && r.mod.driver !== "prosentti").reduce((a, r) => a + Math.max(0, r.calc + r.corrInt), 0);
  const fixedExt = mods.filter((r) => r.included && r.mod.driver !== "prosentti").reduce((a, r) => a + Math.max(0, r.calc * extFactor + r.corrExt), 0);
  for (const r of mods) if (r.mod.driver === "prosentti") { r.calc = (r.mod.pct / 100) * (processInt + fixedInt); r.effInt = r.calc; r.effExt = (r.mod.pct / 100) * (processExt + fixedExt); }
  for (const r of mods) { r.totalInt = r.included ? Math.max(0, r.effInt + r.corrInt) : 0; r.totalExt = r.included ? Math.max(0, r.effExt + r.corrExt) : 0; }
  const modulesInt = mods.reduce((a, r) => a + r.totalInt, 0);
  const modulesExt = mods.reduce((a, r) => a + r.totalExt, 0);
  const totalInt = processInt + modulesInt;
  const totalExt = processExt + modulesExt;
  const modOpen = mods.filter((r) => r.isOpt && ch(r.mod.id) === "avoin");
  const modExcluded = mods.filter((r) => r.isOpt && ch(r.mod.id) === "eivalita");
  const line = (o: OptionItem): DecisionLine => ({ id: o.id, kind: o.kind, name: o.name, path: `${o.duplo.fi} › ${o.lego.fi}`, effInt: o.effInt, effExt: o.effExt });
  const mline = (r: ModuleResult): DecisionLine => ({ id: r.mod.id, kind: "module", name: r.mod.name, path: `Moduuli · ${r.mod.phase}`, effInt: r.effInt, effExt: r.effExt });
  const openAll = [...modOpen.map(mline), ...open.map(line)];
  const excludedAll = [...modExcluded.map(mline), ...excluded.map(line)];
  const openInt = openAll.reduce((a, x) => a + x.effInt, 0);
  const openExt = openAll.reduce((a, x) => a + x.effExt, 0);
  const legosWithWork = new Set(included.map((i) => i.lego.id));
  const byType: Record<string, number> = Object.fromEntries(DEL_ORDER.map((c) => [c, 0]));
  for (const l of scopeLegos) if (legosWithWork.has(l.id)) {
    const frac = included.filter((i) => i.lego.id === l.id).length / l.e.length;
    for (const d of l.dl) byType[d[1]] += frac;
  }
  byType.D = included.reduce((a, x) => a + x.sops, 0);
  for (const k of Object.keys(byType)) byType[k] = Math.round(byType[k]);
  const delCount = Object.values(byType).reduce((a, b) => a + b, 0);
  return { scopeLegos, options, included, funcExclusions, epicExclusions, open, excluded, totalInt, totalExt, processInt, processExt, mods, modulesInt, modulesExt, modOpen, modExcluded, openAll, excludedAll, openInt, openExt, byType, delCount };
}
export type ScopeModel = ReturnType<typeof computeModel>;

export function snapshotRows(m: ScopeModel): BaselineRow[] {
  return [
    ...m.mods.filter((r) => r.included).map((r) => ({ epicId: r.mod.id, scope: r.isOpt ? "Moduuli – optio valittu" : "Moduuli", htpInt: +r.totalInt.toFixed(2), htpExt: +r.totalExt.toFixed(2) })),
    ...m.included.map((i) => ({ epicId: i.epic.id, scope: (i.epic.s === "O" ? "Optio – valittu" : "Sisältyy"), htpInt: +i.totalInt.toFixed(2), htpExt: +i.totalExt.toFixed(2) })),
  ];
}

export const fmt = (n: number) => n.toLocaleString("fi-FI", { maximumFractionDigits: 1 });
export const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
export const today = () => new Date().toISOString().slice(0, 10);
export const fiDate = (iso: string) => { if (!iso) return ""; const [y, m, d] = iso.slice(0, 10).split("-"); return y && m && d ? `${Number(d)}.${Number(m)}.${y}` : iso; };

export function componentOf(t: { duplo?: string; lego?: string; epic?: string }) {
  const d = t.duplo ?? (t.lego ? LEGO_BY_ID[t.lego]?.owner : undefined) ?? (t.epic ? EPIC_BY_ID[t.epic]?.duplo.id : undefined);
  return d ? DUPLO_BY_ID[d]?.fi ?? "" : "";
}
