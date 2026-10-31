import { CHAINS } from "@/data/e2e-chains";
import type { ModuleResult, ScopeModel, IncludedEpic } from "@/lib/scope-model";
import { isPrereq } from "@/lib/scope-model";
import type { Project } from "@/lib/project-types";

export type TeamId = "A" | "B" | "joint";
export const TEAM_LABEL: Record<TeamId, string> = { A: "Talous", B: "Supply chain", joint: "Yhteinen" };
/** Talous team: whole Duplos plus finance-owned Legos (AP, AR, credit & collections). Ids may be Duplo or Lego ids. */
export const DEFAULT_TEAM_A = ["90", "10", "80", "55", "75.50.000.000", "65.30.000.000", "65.50.000.000"];

export type PhaseId = "kaynnistys" | "perusta" | "ketjut" | "sulkeminen" | "valmistelu" | "kaytto";
export const PHASES: { id: PhaseId; label: string; joint: boolean; why: string }[] = [
  { id: "kaynnistys", label: "Käynnistys", joint: true, why: "Ympäristöt, arkkitehtuuri ja datakartoitus ennen konfigurointia" },
  { id: "perusta", label: "Perusta", joint: false, why: "Perusedellytykset ja politiikat, joita kaikki ketjut tarvitsevat" },
  { id: "ketjut", label: "End to End -ketjut", joint: false, why: "Prosessit ketjujärjestyksessä, jotta jokainen ketju on testattavissa heti" },
  { id: "sulkeminen", label: "Sulkeminen ja raportointi", joint: false, why: "Kauden sulkeminen, konsolidointi ja analytiikka, kun transaktioprosessit ovat valmiina" },
  { id: "valmistelu", label: "Valmistelu ja käyttöönotto", joint: true, why: "Migraatio, tietoturva, testaus, koulutus ja cutover" },
  { id: "kaytto", label: "Käyttö", joint: true, why: "Hypercare ja siirto jatkuvaan palveluun" },
];

export type PlanItem =
  | { kind: "epic"; id: string; inc: IncludedEpic; load: number; reason: string; chain?: string; step?: number; team?: "A" | "B"; after?: string }
  | { kind: "module"; id: string; r: ModuleResult; load: number; reason: string };
export interface Sprint { n: number; phase: PhaseId; team: TeamId; items: PlanItem[]; load: number; cap: number; label: string }
export interface Plan { sprints: Sprint[]; columns: number; overhead: ModuleResult[]; checks: { ok: boolean; text: string }[]; teamA: string[] }

const MODULE_SLOT: Record<string, "k" | "A" | "B" | "v" | "h"> = { M02: "k", M03: "k", M04: "k", M05: "k", M12: "k", M07: "B", M09: "B", M13: "B", M08: "A", M11: "A", M06: "v", M10: "v", M14: "v", M15: "v", M16: "v", M17: "v", M18: "h", M19: "h", M20: "h" };
const PHASE_SLOT: Record<string, "k" | "B" | "v" | "h"> = { "Käynnistys ja suunnittelu": "k", Toteutus: "B", "Valmistelu ja käyttöönotto": "v", "Käyttö ja jatkuvuus": "h" };
/** Team of a Lego: explicit Lego id wins, "!lego" excludes it from a Talous Duplo, otherwise the Duplo decides. */
export function legoTeam(teamA: string[], legoId: string, duploId: string): "A" | "B" {
  if (teamA.includes(legoId)) return "A";
  if (teamA.includes(`!${legoId}`)) return "B";
  return teamA.includes(duploId) ? "A" : "B";
}
export function setLegoTeam(teamA: string[], legoId: string, duploId: string, t: "A" | "B"): string[] {
  const rest = teamA.filter((x) => x !== legoId && x !== `!${legoId}`);
  const duploA = rest.includes(duploId);
  if (t === "A") return duploA ? rest : [...rest, legoId];
  return duploA ? [...rest, `!${legoId}`] : rest;
}
export function setDuploTeam(teamA: string[], duploId: string, legoIds: string[], t: "A" | "B"): string[] {
  const rest = teamA.filter((x) => x !== duploId && !legoIds.includes(x) && !legoIds.map((l) => `!${l}`).includes(x));
  return t === "A" ? [...rest, duploId] : rest;
}
const CHAIN_ORDER = ["r2r", "p2p", "o2c", "p2prod"];

export function pack(items: PlanItem[], cap: number): PlanItem[][] {
  const out: PlanItem[][] = []; let cur: PlanItem[] = []; let load = 0;
  for (const it of items) {
    if (cur.length && load + it.load > cap) { out.push(cur); cur = []; load = 0; }
    cur.push(it); load += it.load;
  }
  if (cur.length) out.push(cur);
  return out;
}

export function buildPlan(p: Project, m: ScopeModel): Plan {
  const teamA = p.teamA ?? DEFAULT_TEAM_A;
  const cap = p.sprintCap;
  const teamOf = (i: IncludedEpic): "A" | "B" => legoTeam(teamA, i.lego.id, i.duplo.id);
  const byId = new Map(m.included.map((i) => [i.epic.id, i]));
  const placed = new Set<string>();
  const ep = (inc: IncludedEpic, reason: string, chain?: string, step?: number): PlanItem => { placed.add(inc.epic.id); return { kind: "epic", id: inc.epic.id, inc, load: inc.totalInt, reason, chain, step }; };
  const mo = (r: ModuleResult): PlanItem => ({ kind: "module", id: r.mod.id, r, load: r.totalInt, reason: `Moduuli · ${r.mod.phase}` });

  // Duplo order and first (policy/strategy) Lego per Duplo
  const firstLego = new Map<string, string>();
  for (const i of m.included) { const cur = firstLego.get(i.duplo.id); if (!cur || i.lego.id < cur) firstLego.set(i.duplo.id, i.lego.id); }
  const isClosing = (i: IncludedEpic) => i.lego.id.startsWith("90.60") || i.lego.id.startsWith("90.70") || /^Analy[sz]e/i.test(i.lego.t);

  // Modules
  const mods = m.mods.filter((r) => r.included);
  const overhead = mods.filter((r) => r.mod.driver === "prosentti");
  const slot = (r: ModuleResult) => MODULE_SLOT[r.mod.custom ? "" : r.mod.id] ?? PHASE_SLOT[r.mod.phase] ?? "B";
  const modsIn = (s: string) => mods.filter((r) => r.mod.driver !== "prosentti" && slot(r) === s).map(mo);

  // Foundation: prerequisites first, then rest of each Duplo's first Lego, then chain foundations
  const foundation: IncludedEpic[] = [];
  const add = (i?: IncludedEpic) => { if (i && !foundation.includes(i) && !isClosing(i)) foundation.push(i); };
  for (const i of m.included) if (isPrereq(p, i.epic.id)) add(i);
  for (const i of m.included) if (firstLego.get(i.duplo.id) === i.lego.id) add(i);
  for (const c of CHAINS) for (const id of c.foundation) add(byId.get(id));
  const perusta: Record<"A" | "B", PlanItem[]> = { A: [], B: [] };
  for (const i of foundation) perusta[teamOf(i)].push(ep(i, isPrereq(p, i.epic.id) ? "Perusedellytys" : "Perusta / politiikka"));

  // Chains + remaining processes + team modules (continuous per team)
  // One ordered list across both teams; a chain step may not start before the previous step of the same chain.
  const flowList: { it: PlanItem; team: "A" | "B"; after?: string }[] = [];
  for (const cid of CHAIN_ORDER) {
    const c = CHAINS.find((x) => x.id === cid); if (!c) continue;
    let prev: string | undefined;
    c.steps.forEach((s, idx) => {
      const i = byId.get(s.epic); if (!i || isClosing(i)) return;
      if (placed.has(i.epic.id)) { prev = i.epic.id; return; }
      flowList.push({ it: ep(i, `${c.name}, askel ${idx + 1}`, c.name, idx + 1), team: teamOf(i), after: prev }); prev = i.epic.id;
    });
    for (const id of c.side) { const i = byId.get(id); if (i && !placed.has(i.epic.id) && !isClosing(i)) flowList.push({ it: ep(i, `${c.name}, sivupolku`, c.name), team: teamOf(i) }); }
  }
  for (const i of m.included) if (!placed.has(i.epic.id) && !isClosing(i)) flowList.push({ it: ep(i, `Muut prosessit · ${i.duplo.fi}`), team: teamOf(i) });
  for (const it of modsIn("A")) flowList.push({ it, team: "A" });
  for (const it of modsIn("B")) flowList.push({ it, team: "B" });

  const closing: Record<"A" | "B", PlanItem[]> = { A: [], B: [] };
  for (const i of m.included) if (!placed.has(i.epic.id) && isClosing(i)) closing[teamOf(i)].push(ep(i, /^Analy/i.test(i.lego.t) ? "Analytiikka" : "Kauden sulkeminen"));

  // Lay out phases on a shared sprint grid
  const sprints: Sprint[] = []; let col = 0;
  const jointPhase = (phase: PhaseId, items: PlanItem[]) => { for (const g of pack(items, cap * 2)) sprints.push({ n: ++col, phase, team: "joint", items: g, load: g.reduce((a, x) => a + x.load, 0), cap: cap * 2, label: "" }); };
  const teamPhase = (phase: PhaseId, src: Record<"A" | "B", PlanItem[]>) => {
    const a = pack(src.A, cap), b = pack(src.B, cap); const n = Math.max(a.length, b.length);
    for (let k = 0; k < n; k++) {
      col++;
      if (a[k]) sprints.push({ n: col, phase, team: "A", items: a[k], load: a[k].reduce((s, x) => s + x.load, 0), cap, label: "" });
      if (b[k]) sprints.push({ n: col, phase, team: "B", items: b[k], load: b[k].reduce((s, x) => s + x.load, 0), cap, label: "" });
    }
  };
  jointPhase("kaynnistys", modsIn("k"));
  teamPhase("perusta", perusta);
  // Constrained scheduling for the chain phase
  {
    const start = col + 1; const colOf = new Map<string, number>();
    const cur: Record<"A" | "B", { c: number; load: number; sp?: Sprint }> = { A: { c: start, load: 0 }, B: { c: start, load: 0 } };
    let maxCol = start - 1;
    for (const { it, team, after } of flowList) {
      const t = cur[team]; const earliest = after ? colOf.get(after) ?? start : start;
      if (t.c < earliest) { t.c = earliest; t.load = 0; t.sp = undefined; }
      if (t.sp && t.load + it.load > cap) { t.c++; t.load = 0; t.sp = undefined; }
      if (!t.sp) { t.sp = { n: t.c, phase: "ketjut", team, items: [], load: 0, cap, label: "" }; sprints.push(t.sp); }
      t.sp.items.push(it); t.sp.load += it.load; t.load += it.load; colOf.set(it.id, t.c); maxCol = Math.max(maxCol, t.c);
    }
    col = maxCol;
    sprints.sort((a, b) => a.n - b.n || a.team.localeCompare(b.team));
  }
  teamPhase("sulkeminen", closing);
  jointPhase("valmistelu", modsIn("v"));
  jointPhase("kaytto", modsIn("h"));

  // Sprint labels: chain step ranges or reason summary
  for (const s of sprints) {
    const chainParts = new Map<string, number[]>();
    for (const it of s.items) if (it.kind === "epic" && it.chain && it.step) { const a = chainParts.get(it.chain) ?? []; a.push(it.step); chainParts.set(it.chain, a); }
    const parts = [...chainParts].map(([c, st]) => `${c} ${Math.min(...st)}–${Math.max(...st)}`.replace(/ (\d+)–\1$/, " $1"));
    const other = [...new Set(s.items.filter((it) => !(it.kind === "epic" && it.step)).map((it) => it.reason.split(" · ")[0]))];
    s.label = [...parts, ...other].slice(0, 3).join(" · ");
  }

  // Dependency checks
  const sprintOf = new Map<string, number>(); for (const s of sprints) for (const it of s.items) sprintOf.set(it.id, s.n);
  const checks: Plan["checks"] = [];
  const expected = m.included.length + mods.filter((r) => r.mod.driver !== "prosentti").length;
  const got = sprints.reduce((a, s) => a + s.items.length, 0);
  checks.push({ ok: got === expected && sprintOf.size === expected, text: `Kaikki ${expected} Epiciä ja moduulia sijoitettu kerran` });
  const prereqMax = Math.max(0, ...m.included.filter((i) => isPrereq(p, i.epic.id)).map((i) => sprintOf.get(i.epic.id) ?? 0));
  const chainMin = Math.min(Infinity, ...sprints.filter((s) => s.phase === "ketjut").map((s) => s.n));
  checks.push({ ok: !isFinite(chainMin) || prereqMax < chainMin, text: "Perusedellytykset valmiina ennen ketjuja" });
  for (const c of CHAINS) {
    const own = new Set(sprints.flatMap((sp) => sp.items).filter((it) => it.kind === "epic" && it.chain === c.name && it.step).map((it) => it.id));
    const ns = c.steps.filter((s) => own.has(s.epic)).map((s) => sprintOf.get(s.epic)).filter((x): x is number => x !== undefined);
    if (ns.length < 2) continue;
    checks.push({ ok: ns.every((x, k) => k === 0 || x >= ns[k - 1]), text: `${c.name}: askeleet järjestyksessä (sprintit ${Math.min(...ns)}–${Math.max(...ns)})` });
  }
  const closeMin = Math.min(Infinity, ...sprints.filter((s) => s.phase === "sulkeminen").map((s) => s.n));
  const flowMax = Math.max(0, ...sprints.filter((s) => s.phase === "ketjut").map((s) => s.n));
  if (isFinite(closeMin)) checks.push({ ok: closeMin > flowMax, text: "Sulkeminen ja raportointi transaktioprosessien jälkeen" });
  const over = sprints.filter((s) => s.load > s.cap && s.items.length === 1);
  if (over.length) checks.push({ ok: false, text: `${over.length} yksittäistä kohdetta ylittää sprintin kapasiteetin – jaa ne Jirassa` });

  return { sprints, columns: col, overhead, checks, teamA };
}
