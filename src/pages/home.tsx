import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  AlertTriangle, ArrowLeft, ArrowRight, Check, CircleHelp, ChevronDown, CircleDot, Download, FolderOpen, Link2, Lock, LockKeyhole, Minus, Plus, Printer, Search, Sparkles, Upload, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PdfExportButton } from "@/components/pdf-export-button";
import { useConfirm } from "@/hooks/use-confirm";
import { cn } from "@/lib/utils";
import { CATALOG } from "@/data/catalog";
import type { CEpic, CFunc } from "@/data/types";
import type { Decision, FuncState, RateKey } from "@/lib/project-types";
import { emptyProject, nextId, useField, useProject, useProjectStore } from "@/lib/project-store";
import { exportProject, importProject } from "@/lib/excel-io";
import {
  ALL_LEGOS, DEL_ORDER, DEL_TYPES, DUPLOS, THEMES, funcStateOf, partialOf, isPrereq, DUPLO_BY_ID, EPIC_BY_ID, FUNC_BY_ID, LEGO_BY_ID, PARAMS, RATE_LABEL, REFS, computeModel, fiDate, fmt, isTrig, moduleTrig, snapshotRows, today, type LegoX,
} from "@/lib/scope-model";
import { OfferDocument } from "@/components/offer-document";
import { buildPlan, TEAM_LABEL, PHASES } from "@/lib/sprint-plan";
import { ModulesStep } from "@/components/modules-step";
import { E2EView, type StepStatus } from "@/components/e2e-view";
import { HandoverView } from "@/components/handover-view";
import { CustomerSection } from "@/components/folder/customer";
import { MemosSection } from "@/components/folder/memos";
import { DiscussionsSection } from "@/components/folder/discussions";
import { ChangesSection } from "@/components/folder/changes";
import { RaidSection } from "@/components/folder/raid";
import { TicketsSection } from "@/components/folder/tickets";
import { Sel, type Mode } from "@/components/folder/shared";

type Choice = Decision["choice"];
type Status = "sisaltyy" | "valittu" | "avoin" | "eisisally";
const TONE: Record<Status, { label: string; badge: string; dot: string }> = {
  sisaltyy: { label: "Sisältyy", badge: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800", dot: "bg-blue-700" },
  valittu: { label: "Optio – valittu", badge: "bg-green-50 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-800", dot: "bg-green-700" },
  avoin: { label: "Optio – avoin", badge: "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800", dot: "bg-amber-500" },
  eisisally: { label: "Ei sisälly", badge: "bg-muted text-foreground border-border", dot: "bg-zinc-400" },
};
const STEPS = [
  { key: "lahto", n: 1, label: "Lähtötiedot" }, { key: "moduulit", n: 2, label: "Moduulit" }, { key: "kartta", n: 3, label: "Prosessikartta" }, { key: "luokittelu", n: 4, label: "Luokittelu", sellerOnly: true },
  { key: "optiot", n: 5, label: "Optiopäätökset" }, { key: "yhteenveto", n: 6, label: "Yhteenveto ja tarjous" }, { key: "handover", n: 7, label: "Handover", sellerOnly: true },
] as const;
const FOLDER = [
  { key: "t10", n: 10, label: "Asiakas" }, { key: "t20", n: 20, label: "Muistiot" }, { key: "t30", n: 30, label: "Prosessikeskustelut" },
  { key: "t40", n: 40, label: "Muutokset" }, { key: "t50", n: 50, label: "RAID" }, { key: "t60", n: 60, label: "Tikettijono", sellerOnly: true },
] as const;

function StatusBadge({ s }: { s: Status }) {
  return <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium", TONE[s].badge)}><span className={cn("size-1.5 rounded-full", TONE[s].dot)} aria-hidden="true" />{TONE[s].label}</span>;
}
const toggleIn = (arr: string[], id: string) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

export function HomePage() {
  const project = useProject();
  const projects = useProjectStore((s) => s.projects);
  const setActive = useProjectStore((s) => s.setActive);
  const addProject = useProjectStore((s) => s.addProject);
  const update = useProjectStore((s) => s.update);
  const confirm = useConfirm();

  const [view, setView] = useState<string>("kartta");
  const [focusId, setFocusId] = useState<string | undefined>();
  const [mode, setMode] = useState<Mode>("myyja");
  const [focusLego, setFocusLego] = useState<string>("75.40.000.000");
  const [openEpic, setOpenEpic] = useState<string | null>(null);
  const [mapView, setMapView] = useState<"toiminnoittain" | "simple" | "wide">("toiminnoittain");
  const [chainId, setChainId] = useState("o2c");
  const [decId, setDecId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"kaikki" | "nostetut" | "avoimet">("kaikki");
  const [optDuplo, setOptDuplo] = useState<string>("kaikki");
  const [delSearch, setDelSearch] = useState("");
  const [deliverablesOpen, setDeliverablesOpen] = useState(false);
  const [deliverableType, setDeliverableType] = useState<string | null>(null);
  const [sumTab, setSumTab] = useState<"yhteenveto" | "tarjous">("yhteenveto");
  const [lockOpen, setLockOpen] = useState(false);
  const [lockNote, setLockNote] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const offerRef = useRef<HTMLDivElement>(null);

  const [customer] = useField("customer");
  const [params, setParams] = useField("params");
  const [duplos, setDuplos] = useField("duplos");
  const [extraLegos, setExtraLegos] = useField("extraLegos");
  const [scopeOverride, setScopeOverride] = useField("scopeOverride");
  const [approved, setApproved] = useField("approved");
  const [decisions, setDecisions] = useField("decisions");
  const [notes, setNotes] = useField("epicNotes");
  const [corrInt, setCorrInt] = useField("corrInt");
  const [corrExt, setCorrExt] = useField("corrExt");
  const [rates, setRates] = useField("rates");
  const [extFactor, setExtFactor] = useField("extFactor");
  const [sprintCap, setSprintCap] = useField("sprintCap");
  const [baselines, setBaselines] = useField("baselines");
  const [offer, setOffer] = useField("offer");
  const [, setFuncScope] = useField("funcScope");
  const [scopeReason, setScopeReason] = useField("scopeReason");
  const [, setPrereq] = useField("prereq");
  const [proposals, setProposals] = useField("scopeProposals");
  const [bulkOpen, setBulkOpen] = useField("bulkOpen");
  const tickets = project.tickets;

  const seller = mode === "myyja";
  const steps = STEPS.filter((s) => seller || !("sellerOnly" in s));
  const folder = FOLDER.filter((s) => seller || !("sellerOnly" in s));
  const curView = [...steps, ...folder].some((s) => s.key === view) ? view : "lahto";
  const stepIdx = steps.findIndex((s) => s.key === curView);
  const go = (v: string, id?: string) => { setFocusId(id); setView(v); };

  const model = useMemo(() => computeModel(project), [project]);
  /** Same project with every Duplo included – used to count and bulk-decide options in boxes not yet in scope. */
  const allModel = useMemo(() => computeModel({ ...project, duplos: DUPLOS.map((d) => d.id) }), [project]);
  const inclIds = useMemo(() => new Set(model.included.map((i) => i.epic.id)), [model]);
  const [showAllOpts, setShowAllOpts] = useState(false);
  const base = baselines[baselines.length - 1];
  const dec = (id: string): Decision => decisions[id] ?? { choice: "avoin", reason: "", owner: "", pros: "", cons: "" };
  const setDec = (id: string, patch: Partial<Decision>) => setDecisions((p) => ({ ...p, [id]: { ...(p[id] ?? { choice: "avoin", reason: "", owner: "", pros: "", cons: "" }), ...patch } }));
  const scopeOf = (e: CEpic) => scopeOverride[e.id] ?? e.s;
  const legoInScope = (l: LegoX) => duplos.includes(l.owner) || extraLegos.includes(l.id);
  const trig = (tr: CEpic["tr"]) => isTrig(tr, params);
  const epicStatus = (e: CEpic): Status => { if (scopeOf(e) === "S") return "sisaltyy"; if (scopeOf(e) === "E") return "eisisally"; const c = dec(e.id).choice; return c === "valitaan" ? "valittu" : c === "eivalita" ? "eisisally" : "avoin"; };
  const optStatus = (id: string): Status => { const c = dec(id).choice; return c === "valitaan" ? "valittu" : c === "eivalita" ? "eisisally" : "avoin"; };
  const fState = (f: CFunc) => funcStateOf(project, f);
  const SCOPE_LABEL: Record<FuncState, string> = { S: "Sisältyy", O: "Optio", E: "Ei sisälly" };
  const applyEpicScope = (e: CEpic, v: FuncState) => setScopeOverride((p) => { const n = { ...p }; if (v === e.s) delete n[e.id]; else n[e.id] = v; return n; });
  const changeEpicScope = async (e: CEpic, v: FuncState) => {
    if (!seller) {
      setProposals((p) => { const n = { ...p }; if (v === scopeOf(e)) delete n[e.id]; else n[e.id] = { to: v, reason: p[e.id]?.reason ?? "", at: today(), by: "Asiakas" }; return n; });
      if (v !== scopeOf(e)) toast.success("Ehdotus kirjattu – myyjä hyväksyy sen Luokittelu-vaiheessa");
      return;
    }
    if (v === scopeOf(e)) return;
    if (v === "E" && isPrereq(project, e.id) && !(await confirm({ title: `${e.t} on perusedellytys`, description: "Toteutus ei yleensä toimi ilman tätä prosessia. Rajataanko se silti pois scopesta? Kirjaa perustelu.", confirmLabel: "Rajaa pois", cancelLabel: "Peruuta", destructive: true }))) return;
    applyEpicScope(e, v);
  };
  const approveProposal = (id: string) => { const x = proposals[id]; const ep = EPIC_BY_ID[id]; if (!x || !ep) return; applyEpicScope(ep.epic, x.to); if (x.reason) setScopeReason((p) => ({ ...p, [id]: x.reason })); setProposals((p) => { const n = { ...p }; delete n[id]; return n; }); toast.success(`Hyväksytty: ${ep.epic.t} → ${SCOPE_LABEL[x.to]}`); };
  /** Open (undecided) options inside one Duplo, incl. function options under included Epics. */
  const openInDuplo = (p: typeof project, duploId: string) => computeModel({ ...p, duplos: p.duplos.includes(duploId) ? p.duplos : [...p.duplos, duploId] }).options.filter((o) => o.duplo.id === duploId && (p.decisions[o.id]?.choice ?? "avoin") === "avoin");
  const applyBulk = (duploId: string, mode: "in" | "out") => {
    const before = project.decisions; const beforeBulk = project.bulkOpen;
    const choice: Decision["choice"] = mode === "in" ? "valitaan" : "eivalita";
    let next = { ...before }; let n = 0;
    for (let pass = 0; pass < 4; pass++) {
      const open = openInDuplo({ ...project, decisions: next }, duploId);
      if (!open.length) break;
      for (const o of open) { next = { ...next, [o.id]: { ...(next[o.id] ?? { reason: "", owner: "", pros: "", cons: "" }), choice } }; n++; }
      if (mode === "out") break;
    }
    setDecisions(next); setBulkOpen((b) => ({ ...b, [duploId]: mode }));
    const name = DUPLO_BY_ID[duploId]?.fi ?? duploId;
    toast.success(n ? `${name}: ${n} avointa optiota ${mode === "in" ? "otettu mukaan" : "rajattu pois"}` : `${name}: ei avoimia optioita`, n ? { action: { label: "Kumoa", onClick: () => { setDecisions(before); setBulkOpen(beforeBulk); } } } : undefined);
  };
  const rejectProposal = (id: string) => setProposals((p) => { const n = { ...p }; delete n[id]; return n; });
  const setFState = (f: CFunc, v: FuncState) => setFuncScope((p) => { const n = { ...p }; const def = f.o ? "O" : "S"; if (v === def && !THEMES.some((t) => t.param && t.inactive?.(params[t.param]) && t.re.test(f.t))) delete n[f.id]; else n[f.id] = v; return n; });
  const partialText = (e: CEpic) => {
    const pi0 = partialOf(project, e); const pi = { ...pi0, open: inclIds.has(e.id) ? pi0.open : [] }; const out = pi.excluded.length + pi.declined.length;
    if (!out && !pi.open.length) return null;
    const label = [out ? `${out}/${e.f.length} rajattu` : "", pi.open.length ? `${pi.open.length} optio avoinna` : ""].filter(Boolean).join(" · ");
    const names = [...pi.excluded.map((f) => `Ei sisälly: ${f.t}`), ...pi.declined.map((f) => `Optio, ei valittu: ${f.t}`), ...pi.open.map((f) => `Optio avoinna: ${f.t}`)].join("\n");
    return { label, names, out };
  };
  const warn = (e: CEpic, compact?: boolean) => {
    const pt = partialText(e); if (!pt) return null;
    return (
      <span title={pt.names} aria-label={`Osittain: ${pt.label}`} role="img"
        className={cn("inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100", compact ? "p-0.5" : "px-1.5 py-0.5 text-[11px] font-medium")}>
        <AlertTriangle className="size-3" aria-hidden="true" />{!compact && pt.label}
      </span>
    );
  };
  const htp = (int: number, ext: number) => (seller ? `${fmt(int)} / ${fmt(ext)}` : fmt(ext));

  const plan = useMemo(() => buildPlan(project, model), [project, model]);

  const delta = useMemo(() => {
    if (!base) return null;
    const now = new Map(model.included.map((i) => [i.epic.id, i]));
    const was = new Map(base.rows.map((r) => [r.epicId, r]));
    const added = [...now.keys()].filter((k) => !was.has(k));
    const removed = [...was.keys()].filter((k) => !now.has(k));
    return { added, removed, dExt: model.totalExt - base.totalExt, dInt: model.totalInt - base.totalInt };
  }, [model, base]);

  const safeName = (customer.name || project.name).replace(/[^\p{L}\p{N}]+/gu, "_");
  const exportBacklog = () => {
    const rows: Record<string, string | number>[] = [];
    const phaseLabel = (id: string) => PHASES.find((x) => x.id === id)?.label ?? id;
    for (const sp of plan.sprints) for (const it of sp.items) {
      const common = { Sprint: `Sprint ${sp.n}`, Team: TEAM_LABEL[sp.team], Phase: phaseLabel(sp.phase) };
      if (it.kind === "module") { rows.push({ "Issue Type": "Epic", Summary: it.r.mod.name, "Epic Name": it.r.mod.name, ...common, Component: "Moduulit", Labels: `Tiimi_${TEAM_LABEL[sp.team].replace(/\s+/g, "_")} Moduuli`, "Original Estimate (htp)": +it.load.toFixed(1), Description: `${it.r.mod.desc}${it.r.mod.outputs ? `\n\nTuotokset: ${it.r.mod.outputs}` : ""} (${it.r.mod.id})` }); continue; }
      const i2 = it.inc;
      rows.push({ "Issue Type": "Epic", Summary: i2.epic.t, "Epic Name": i2.epic.t, ...common, Component: i2.duplo.fi, Labels: `Tiimi_${TEAM_LABEL[sp.team].replace(/\s+/g, "_")} ${i2.lego.fi.replace(/\s+/g, "_")}`, "Original Estimate (htp)": +i2.totalInt.toFixed(1), Description: `${it.reason} · ${i2.duplo.e2e} › ${i2.lego.t} (${i2.epic.id})` });
      i2.funcs.forEach((f) => rows.push({ "Issue Type": "Story", Summary: f.t, "Epic Name": i2.epic.t, ...common, Component: i2.duplo.fi, Labels: f.o ? "Erikoistapaus" : "Perus", "Original Estimate (htp)": "", Description: `${f.id} · SOP ${f.sop}` }));
    }
    const legoDone = new Set<string>();
    for (const sp of plan.sprints) for (const it of sp.items) {
      if (it.kind !== "epic") continue; const l = it.inc.lego;
      if (legoDone.has(l.id) || l.dl.length === 0) continue; legoDone.add(l.id);
      const cnt = DEL_ORDER.map((c) => [c, l.dl.filter((d) => d[1] === c).length] as const).filter(([, n]) => n > 0).map(([c, n]) => `${DEL_TYPES[c]} ${n}`).join(", ");
      rows.push({ "Issue Type": "Story", Summary: `${l.fi}: konfiguraatiot ja deliverablet`, "Epic Name": it.inc.epic.t, Sprint: `Sprint ${sp.n}`, Team: TEAM_LABEL[sp.team], Phase: phaseLabel(sp.phase), Component: it.inc.duplo.fi, Labels: "Deliverables", "Original Estimate (htp)": "", Description: cnt });
    }
    plan.overhead.forEach((r) => rows.push({ "Issue Type": "Epic", Summary: r.mod.name, "Epic Name": r.mod.name, Sprint: "Koko projekti", Team: "Yhteinen", Phase: "Koko projekti", Component: "Moduulit", Labels: "Projektinhallinta", "Original Estimate (htp)": +r.totalInt.toFixed(1), Description: r.mod.desc }));
    tickets.filter((t) => t.status === "Hyväksytty" && t.source !== "Scope").forEach((t) => rows.push({ "Issue Type": t.issueType, Summary: t.summary, "Epic Name": t.target.epic ? EPIC_BY_ID[t.target.epic]?.epic.t ?? "" : "", Sprint: "Muutokset", Component: t.component, Labels: [t.labels, t.source].filter(Boolean).join(" "), "Original Estimate (htp)": t.htpInt, Description: `${t.description}${t.acceptance ? `\n\nHyväksymiskriteerit: ${t.acceptance}` : ""} (${t.id})` }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Backlog");
    XLSX.writeFile(wb, `Backlog_${safeName}.xlsx`);
    toast.success("Backlog viety sprinttirunkoon");
  };

  const doExport = () => { update((p) => ({ ...p, revision: p.revision + 1 })); const p = useProjectStore.getState().projects[useProjectStore.getState().activeId]; exportProject(p); toast.success(`Projekti viety (revisio ${p.revision})`); };
  const doImport = async (f?: File) => {
    if (!f) return;
    try {
      const { project: np, warnings } = await importProject(f);
      const existing = projects[np.id];
      if (existing && existing.revision > np.revision && !(await confirm({ title: "Tiedosto on vanhempi kuin sovelluksen tiedot", description: `Sovelluksessa on revisio ${existing.revision}, tiedostossa ${np.revision}. Korvataanko silti?`, confirmLabel: "Korvaa", cancelLabel: "Peruuta", destructive: true }))) return;
      addProject(np);
      toast.success(`Projekti "${np.name}" tuotu (revisio ${np.revision})`);
      warnings.forEach((w) => toast.warning(w));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Tiedoston tuonti epäonnistui"); }
    finally { if (importRef.current) importRef.current.value = ""; }
  };
  const lockBaseline = () => {
    const version = `v${baselines.length + 1}.0`;
    setBaselines((b) => [...b, { id: nextId("LT", b), version, lockedAt: today(), lockedBy: "Heikki Salmi", note: lockNote, totalInt: +model.totalInt.toFixed(1), totalExt: +model.totalExt.toFixed(1), rows: snapshotRows(model) }]);
    setLockOpen(false); setLockNote("");
    toast.success(`Lähtötaso ${version} lukittu`);
  };

  const visibleOptions = model.options.filter((o) => optDuplo === "kaikki" || o.duplo.id === optDuplo).filter((o) => filter === "kaikki" ? true : filter === "nostetut" ? trig(o.tr) : dec(o.id).choice === "avoin").sort((a, b) => Number(trig(b.tr)) - Number(trig(a.tr)));
  const modOpts = model.mods.filter((r) => r.isOpt);
  const visibleMods = optDuplo === "kaikki" || optDuplo === "mod" ? modOpts.filter((r) => filter === "kaikki" ? true : filter === "nostetut" ? moduleTrig(r.mod, params) : dec(r.mod.id).choice === "avoin") : [];
  const procOptions = optDuplo === "mod" ? [] : visibleOptions;
  const optTotal = model.options.length + modOpts.length;
  const decided = optTotal - model.openAll.length;
  const nameOf = (id: string) => EPIC_BY_ID[id]?.epic.t ?? model.mods.find((r) => r.mod.id === id)?.mod.name ?? project.modules.find((m) => m.id === id)?.name ?? id;
  const lego = LEGO_BY_ID[focusLego];
  const selectEpic = (id: string) => {
    const e = EPIC_BY_ID[id]; if (!e) return;
    setFocusLego(e.lego.id); setOpenEpic(id);
    requestAnimationFrame(() => document.getElementById(`epic-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  };
  const triggered = ALL_LEGOS.flatMap((l) => l.e.flatMap((e) => [...(trig(e.tr) ? [{ id: e.id, name: e.t, l, kind: "Epic" }] : []), ...e.f.filter((f) => trig(f.tr)).map((f) => ({ id: f.id, name: f.t, l, kind: "Function" }))]));
  const trigInScope = triggered.filter((x) => legoInScope(x.l));
  const scopeQuestions = PARAMS.filter((p) => p.id !== "edi" && p.id !== "apInvoices");
  const primaryDuplos = DUPLOS.slice(0, 5);
  const additionalDuplos = DUPLOS.slice(5);
  const scopeEpics = model.scopeLegos.flatMap((l) => l.e);
  const approvedSet = new Set(approved);
  const approvedCount = scopeEpics.filter((e) => approvedSet.has(e.id)).length;
  const discCount = (legoId: string) => project.discussions.filter((d) => (d.target.lego === legoId || (d.target.epic && EPIC_BY_ID[d.target.epic]?.lego.id === legoId)) && (seller || d.visibility === "Asiakkaalle näkyvä")).length;

  const duploCard = (d: (typeof DUPLOS)[number]) => {
    const on = duplos.includes(d.id);
    return (
        <button key={d.id} type="button" aria-pressed={on} onClick={() => setDuplos((p) => toggleIn(p, d.id))}
        className={cn("flex h-full min-h-20 flex-col justify-between rounded-xl border p-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring", on ? "border-primary/60 bg-primary/5 hover:bg-primary/10" : "border-border bg-background hover:border-primary/40 hover:bg-accent/50")}>
        <span className="flex w-full items-start justify-between gap-2">
          <span className="min-w-0 text-sm font-semibold leading-snug">{d.fi}</span>
          <span className={cn("grid size-5 shrink-0 place-items-center rounded-md border", on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}>{on ? <Check className="size-3.5" aria-hidden="true" /> : <Plus className="size-3.5 text-muted-foreground" aria-hidden="true" />}</span>
        </span>
        <span className="mt-2 text-xs text-muted-foreground">{d.e2e} · {d.seq.slice(0, 2)} · {d.l.reduce((a, l) => a + l.e.length, 0)} Epiciä</span>
      </button>
    );
  };

  const navBtn = ({ k, label, n, badge, lock }: { k: string; label: string; n: number; badge?: number; lock?: boolean }) => (
    <button key={k} type="button" onClick={() => go(k)} aria-current={curView === k ? "page" : undefined}
      className={cn("flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring", curView === k ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>
      <span className={cn("grid h-5 min-w-5 place-items-center rounded-full border px-1 text-[11px] font-semibold tabular-nums", curView === k ? "border-primary-foreground/60" : "border-border")}>{n}</span>
      {label}
      {!!badge && <span className="rounded-full bg-amber-100 px-1.5 text-[11px] font-semibold text-amber-900">{badge}</span>}
      {lock && <Lock className="size-3 opacity-70" aria-label="Vain myyjälle" />}
    </button>
  );

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col px-6 pb-16">
      <div className="no-print sticky top-0 z-20 -mx-6 mb-6 border-b border-border bg-background/95 px-6 pt-2.5 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3 pb-2">
          <div className="flex min-w-0 items-center gap-2">
            <FolderOpen className="size-4 text-muted-foreground" aria-hidden="true" />
            <Sel ariaLabel="Projekti" value={project.id} onChange={(v) => setActive(v)} options={Object.values(projects).map((p) => ({ v: p.id, label: `${p.name} · ${p.customer.name || "ei asiakasta"}` }))} className="h-8 w-64" />
            {seller && <Button size="icon-sm" variant="ghost" aria-label="Uusi projekti" onClick={() => { const id = `p-${Date.now().toString(36)}`; addProject(emptyProject(id, `Projekti ${Object.keys(projects).length + 1}`)); go("t10"); }}><Plus /></Button>}
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs">
            <LockKeyhole className="size-3.5" aria-hidden="true" />{base ? `Lähtötaso ${base.version} · ${fiDate(base.lockedAt)}` : "Ei lukittua lähtötasoa"}
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="text-right text-xs leading-tight">
              <div className="text-muted-foreground">{seller ? "Työmäärä sis. / ulk." : "Työmääräarvio"}</div>
              <div className="font-semibold tabular-nums">{htp(model.totalInt, model.totalExt)} htp</div>
            </div>
            {seller && <>
              <Button size="sm" variant="outline" onClick={() => setLockOpen(true)}><LockKeyhole />Lukitse lähtötaso</Button>
              <Button size="sm" variant="outline" onClick={doExport}><Download />Vie Excel</Button>
              <input ref={importRef} type="file" accept=".xlsx" className="sr-only" aria-label="Tuo projektin Excel" onChange={(e) => doImport(e.target.files?.[0])} />
              <Button size="sm" variant="outline" onClick={() => importRef.current?.click()}><Upload />Tuo Excel</Button>
            </>}
            <ToggleGroup type="single" variant="outline" size="sm" value={mode} onValueChange={(v) => v && setMode(v as Mode)} aria-label="Näkymä">
              <ToggleGroupItem value="myyja">Myyjä</ToggleGroupItem>
              <ToggleGroupItem value="asiakas">Asiakas</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        <nav aria-label="Scope-vaiheet" className="flex flex-wrap items-center gap-1 border-t border-border py-1.5">
          <span className="mr-1 w-24 text-xs font-medium text-muted-foreground">Scope</span>
          {steps.map((s) => navBtn({ k: s.key, label: s.label, n: s.n, badge: s.key === "optiot" ? model.openAll.length : undefined, lock: "sellerOnly" in s }))}
        </nav>
        <nav aria-label="Projektikansio" className="flex flex-wrap items-center gap-1 border-t border-border py-1.5">
          <span className="mr-1 w-24 text-xs font-medium text-muted-foreground">Projektikansio</span>
          {folder.map((s) => navBtn({ k: s.key, label: s.label, n: s.n, lock: "sellerOnly" in s,
            badge: s.key === "t40" ? project.changes.filter((c) => c.status === "Asiakkaan hyväksyttävänä" && (seller || c.visibility === "Asiakkaalle näkyvä")).length : s.key === "t30" ? project.discussions.filter((d) => d.status === "Avoin" && (seller || d.visibility === "Asiakkaalle näkyvä")).length : undefined }))}
        </nav>
      </div>

      <section id="tyoalue" tabIndex={-1} className="outline-none">
        {curView === "t10" && <CustomerSection key={project.id} mode={mode} />}
        {curView === "t20" && <MemosSection key={`${project.id}-${focusId}-${mode}`} mode={mode} initialId={focusId} />}
        {curView === "t30" && <DiscussionsSection key={`${project.id}-${focusId}-${mode}`} mode={mode} initialId={focusId} go={go} />}
        {curView === "t40" && <ChangesSection key={`${project.id}-${focusId}-${mode}`} mode={mode} initialId={focusId} go={go} />}
        {curView === "t50" && <RaidSection key={`${project.id}-${focusId}-${mode}`} mode={mode} initialId={focusId} />}
        {curView === "t60" && <TicketsSection key={`${project.id}-${focusId}`} initialId={focusId} go={go} />}

        {curView === "lahto" && (
          <div className="space-y-4">
            <header className="overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-card to-card p-4 sm:p-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="max-w-2xl">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Projektin määrittely</p>
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Lähtötiedot</h1>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Valitse projektin prosessialueet ja täydennä toimintaympäristön tiedot. Valinnat muodostavat selkeän lähtökohdan scopelle ja päivittyvät myös Prosessikartalle.</p>
                </div>
                <div className="flex gap-3">
                  <div className="min-w-28 rounded-xl border border-border/80 bg-background/80 px-3 py-2">
                    <div className="text-xs text-muted-foreground">Prosessialueet</div>
                    <div className="mt-1 text-xl font-semibold tabular-nums">{duplos.length}<span className="text-sm font-normal text-muted-foreground"> / {DUPLOS.length}</span></div>
                  </div>
                  <div className="min-w-28 rounded-xl border border-border/80 bg-background/80 px-3 py-2">
                    <div className="text-xs text-muted-foreground">Nostetut prosessit</div>
                    <div className="mt-1 text-xl font-semibold tabular-nums">{trigInScope.length}</div>
                  </div>
                </div>
              </div>
            </header>

            <section aria-labelledby="duplo-valinta-otsikko" className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 id="duplo-valinta-otsikko" className="text-lg font-semibold">Valitse prosessialueet</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Valitse mukaan tulevat Duplot. Sama valinta näkyy Prosessikartalla.</p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{duplos.length} valittu</span>
              </div>
              <div className="grid auto-rows-fr grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                {primaryDuplos.map(duploCard)}
              </div>
              {additionalDuplos.length > 0 && (
                <Collapsible defaultOpen={false} className="mt-2">
                  <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-accent/50 focus-visible:outline-2 focus-visible:outline-ring">
                    <span>
                      <span className="block text-sm font-medium">Muut prosessialueet <span className="text-muted-foreground">({additionalDuplos.length})</span></span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{duplos.filter((id) => additionalDuplos.some((d) => d.id === id)).length} valittu</span>
                    </span>
                    <ChevronDown className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <div className="grid auto-rows-fr grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                      {additionalDuplos.map(duploCard)}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </section>

            <Collapsible defaultOpen={false} className="rounded-xl border border-border bg-card">
              <CollapsibleTrigger className="group flex w-full flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-ring sm:px-4">
                <span>
                  <span className="block font-semibold">Suomen oletukset – EDI ja ostolaskut</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    EDI: {PARAMS.find((p) => p.id === "edi")?.options.find((o) => o.v === params.edi)?.label} · Ostolaskut: {PARAMS.find((p) => p.id === "apInvoices")?.options.find((o) => o.v === params.apInvoices)?.label}
                  </span>
                </span>
                <ChevronDown className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
              </CollapsibleTrigger>
              <CollapsibleContent className="border-t border-border px-4 sm:px-5">
                <p className="py-2 text-sm text-muted-foreground">Suomen projektien oletusvastaukset. Muuta niitä, jos projektissa on tästä poikkeava tarve.</p>
                <ol className="mb-3 divide-y divide-border rounded-lg border border-border">
                  {PARAMS.filter((p) => p.id === "edi" || p.id === "apInvoices").map((p) => {
                    const n = ALL_LEGOS.reduce((a, l) => a + l.e.filter((e) => e.tr.includes(p.id)).length + l.e.reduce((b, e) => b + e.f.filter((f) => f.tr.includes(p.id)).length, 0), 0);
                    return (
                      <li key={p.id} className="grid gap-3 p-3 md:grid-cols-[1fr_auto] md:items-center">
                        <div className="flex gap-3"><span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">{PARAMS.indexOf(p) + 1}</span><div className="min-w-0"><div id={`q-${p.id}`} className="font-medium">{p.q}</div><div className="mt-0.5 text-xs text-muted-foreground">Liittyy {n} katalogin prosessiin</div></div></div>
                        <ToggleGroup type="single" variant="outline" value={params[p.id]} aria-labelledby={`q-${p.id}`} onValueChange={(v) => v && setParams((prev) => ({ ...prev, [p.id]: v }))}>
                          {p.options.map((o) => <ToggleGroupItem key={o.v} value={o.v} className="px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">{o.label}</ToggleGroupItem>)}
                        </ToggleGroup>
                      </li>
                    );
                  })}
                </ol>
              </CollapsibleContent>
            </Collapsible>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
              <div>
                <div className="mb-3">
                  <h2 className="text-lg font-semibold tracking-tight">Toimintaympäristö</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{scopeQuestions.length} kysymystä · {trigInScope.length} prosessia nostettu valituilta alueilta</p>
                </div>
                <ol className="divide-y divide-border rounded-xl border border-border bg-card">
                {scopeQuestions.map((p) => {
                  const n = ALL_LEGOS.reduce((a, l) => a + l.e.filter((e) => e.tr.includes(p.id)).length + l.e.reduce((b, e) => b + e.f.filter((f) => f.tr.includes(p.id)).length, 0), 0);
                  return (
                    <li key={p.id} className="grid gap-3 p-3 md:grid-cols-[1fr_auto] md:items-center">
                      <div className="flex gap-3"><span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">{PARAMS.indexOf(p) + 1}</span><div className="min-w-0"><div id={`q-${p.id}`} className="font-medium">{p.q}</div><div className="mt-0.5 text-xs text-muted-foreground">Liittyy {n} katalogin prosessiin</div></div></div>
                      <ToggleGroup type="single" variant="outline" value={params[p.id]} aria-labelledby={`q-${p.id}`} onValueChange={(v) => v && setParams((prev) => ({ ...prev, [p.id]: v }))}>
                        {p.options.map((o) => <ToggleGroupItem key={o.v} value={o.v} className="px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">{o.label}</ToggleGroupItem>)}
                      </ToggleGroup>
                    </li>
                  );
                })}
                </ol>
                <div className="mt-6 flex justify-end"><Button onClick={() => go("moduulit")}>Moduuleihin <ArrowRight /></Button></div>
              </div>
              <Collapsible defaultOpen={false} role="complementary" aria-labelledby="nostetut" className="self-start rounded-xl border border-border bg-card lg:sticky lg:top-36">
                  <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 p-4 text-left focus-visible:outline-2 focus-visible:outline-ring">
                    <span>
                      <span id="nostetut" className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-primary" aria-hidden="true" />Nostetut prosessit valituilla alueilla</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{trigInScope.length} prosessia · avaa lista</span>
                    </span>
                    <ChevronDown className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t border-border px-4 pb-4 pt-3">
                    <p className="mb-2 text-xs text-muted-foreground">Vastauksista johdetut prosessit auttavat tarkentamaan keskustelua.</p>
                    <ul className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                      {trigInScope.slice(0, 40).map((x) => <li key={x.id} className="rounded-lg border border-border bg-background p-3"><div className="text-sm font-medium">{x.name}</div><div className="mt-1 text-xs text-muted-foreground">{x.kind} · {x.id} · {DUPLO_BY_ID[x.l.owner].fi} › {x.l.fi}</div></li>)}
                      {trigInScope.length === 0 && <li className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">Valituilla alueilla ei ole vielä vastauksiin liittyviä prosesseja.</li>}
                      {trigInScope.length > 40 && <li className="text-xs text-muted-foreground">+ {trigInScope.length - 40} muuta</li>}
                      {triggered.length > trigInScope.length && <li className="text-xs text-muted-foreground">{triggered.length - trigInScope.length} nostettua prosessia on valitsemattomilla alueilla.</li>}
                    </ul>
                  </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        )}

        {curView === "moduulit" && <ModulesStep mode={mode} model={model} />}

        {curView === "kartta" && (<>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <ToggleGroup type="single" variant="outline" value={mapView === "toiminnoittain" ? "toiminnoittain" : "e2e"} onValueChange={(v) => v && setMapView(v === "e2e" ? (mapView === "wide" ? "wide" : "simple") : "toiminnoittain")} aria-label="Prosessikartan näkymä">
              <ToggleGroupItem value="toiminnoittain" className="px-4 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">Toiminnoittain</ToggleGroupItem>
              <ToggleGroupItem value="e2e" className="px-4 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">End to End</ToggleGroupItem>
            </ToggleGroup>
            {mapView !== "toiminnoittain" && (
              <ToggleGroup type="single" size="sm" variant="outline" value={mapView} onValueChange={(v) => v && setMapView(v as "simple" | "wide")} aria-label="End to End -näkymän laajuus">
                <ToggleGroupItem value="simple" className="px-3">Yksinkertainen</ToggleGroupItem>
                <ToggleGroupItem value="wide" className="px-3">Laaja (osastokaistat)</ToggleGroupItem>
              </ToggleGroup>
            )}
          </div>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_460px]">
            {mapView !== "toiminnoittain" ? (
              <figure className="relative min-w-0 rounded-xl border border-border bg-card p-4 pb-9" role="group" aria-labelledby="e2e-otsikko">
                <figcaption id="e2e-otsikko" className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><span className="text-lg font-semibold">End to End -prosessit</span><span className="text-xs text-muted-foreground">{CATALOG.version} · askel = Epic (taso 3)</span></figcaption>
                <E2EView chainId={chainId} setChainId={setChainId} variant={mapView} selected={openEpic} model={model} seller={seller}
                  onSelect={selectEpic} statusOf={epicStatus} styleOf={(st: StepStatus) => TONE[st]} inScope={(id) => { const l = EPIC_BY_ID[id]?.lego; return !!l && legoInScope(l); }} partial={(id) => { const x = EPIC_BY_ID[id]; return x ? partialText(x.epic) : null; }} />
                <div className="mt-4 flex flex-wrap gap-3 text-xs">{(Object.keys(TONE) as Status[]).map((st) => <span key={st} className="flex items-center gap-1.5"><span className={cn("size-2 rounded-full", TONE[st].dot)} aria-hidden="true" />{TONE[st].label}</span>)}<span className="flex items-center gap-1"><AlertTriangle className="size-3 text-amber-700" aria-hidden="true" />Osittain rajattu</span><span className="flex items-center gap-1"><CircleHelp className="size-3" aria-hidden="true" />Tarkistettava askel</span><span>Katkoviiva = alue ei scopessa</span></div>
                <span className="pointer-events-none absolute bottom-2 left-3 text-[10px] font-medium text-muted-foreground">HS Testi</span>
              </figure>
            ) : (
            <figure className="relative rounded-xl border border-border bg-card p-4 pb-9" role="group" aria-labelledby="kartta-otsikko">
              <figcaption id="kartta-otsikko" className="mb-4 flex flex-wrap items-baseline justify-between gap-2"><span className="text-lg font-semibold">Prosessikartta</span><span className="text-xs text-muted-foreground">{CATALOG.version} · {duplos.length}/{DUPLOS.length} Duploa · {model.scopeLegos.length} Legoa · {scopeEpics.length} Epiciä</span></figcaption>
              <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {DUPLOS.map((d) => {
                  const on = duplos.includes(d.id);
                  return (
                    <div key={d.id} className={cn("flex flex-col gap-1.5 rounded-lg border p-2.5 transition-colors", on ? "border-primary/60 bg-background" : "border-dashed border-border bg-muted/40")}>
                      <button type="button" aria-pressed={on} onClick={() => setDuplos((p) => toggleIn(p, d.id))} className="flex items-start justify-between gap-2 rounded-md p-1 text-left focus-visible:outline-2 focus-visible:outline-ring">
                        <span className="min-w-0"><span className="block font-semibold">{d.fi}</span><span className="block text-xs text-muted-foreground">{d.e2e} · {d.seq.slice(0, 2)} · {d.l.reduce((a, l) => a + l.e.length, 0)} Epiciä</span></span>
                        <span className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border", on ? "border-primary bg-primary text-primary-foreground" : "border-border")}>{on ? <Check className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}</span>
                        <span className="sr-only">{on ? "Mukana scopessa" : "Ei scopessa"}</span>
                      </button>
                      {(() => {
                        const nOpen = allModel.options.filter((o) => o.duplo.id === d.id && dec(o.id).choice === "avoin").length;
                        return (
                          <div className="flex flex-wrap items-center justify-between gap-1.5 px-1">
                            <span className="text-[11px] text-muted-foreground">Avoimia optioita <span className="font-semibold tabular-nums text-foreground">{nOpen}</span></span>
                            <ToggleGroup type="single" size="sm" variant="outline" value={bulkOpen[d.id] ?? ""} onValueChange={(v) => { const m = (v || bulkOpen[d.id]) as "in" | "out" | undefined; if (m) applyBulk(d.id, m); }} aria-label={`${d.fi}: avoimet optiot`} className="h-6">
                              <ToggleGroupItem value="in" className="h-6 px-2 text-[11px] data-[state=on]:bg-green-700 data-[state=on]:text-white">Avoimet optiot mukaan</ToggleGroupItem>
                              <ToggleGroupItem value="out" className="h-6 px-2 text-[11px] data-[state=on]:bg-zinc-700 data-[state=on]:text-white">Avoimet optiot pois</ToggleGroupItem>
                            </ToggleGroup>
                          </div>
                        );
                      })()}
                      {d.l.map((l) => {
                        const L = LEGO_BY_ID[l.id]; const dc = discCount(l.id);
                        return (
                          <button key={l.id} type="button" onClick={() => setFocusLego(l.id)} aria-pressed={focusLego === l.id} className={cn("rounded-md border bg-card px-2.5 py-1.5 text-left transition-shadow hover:shadow-sm focus-visible:outline-2 focus-visible:outline-ring", focusLego === l.id ? "border-primary ring-1 ring-primary" : "border-border", !legoInScope(L) && "opacity-70")}>
                            <span className="flex items-baseline justify-between gap-2"><span className="truncate text-sm font-medium">{l.fi}</span><span className="flex shrink-0 items-center gap-1.5 font-mono text-[10px] text-muted-foreground">{l.e.some((e) => partialText(e)?.out || (e.s === "S" && scopeOf(e) !== "S")) && <AlertTriangle className="size-3 text-amber-700" aria-label="Sisältää rajattuja Functioneita" />}{dc > 0 && <span className="rounded bg-muted px-1 font-sans">{dc} kesk.</span>}{l.id.slice(0, 5)}</span></span>
                            <span className="mt-1 flex gap-0.5" aria-label={`${l.e.filter((e) => scopeOf(e) === "S").length} sisältyy, ${l.e.filter((e) => scopeOf(e) === "O").length} optiota`}>{l.e.map((e) => <span key={e.id} className="min-w-0 flex-1 text-center">{focusLego === l.id && <span className="mb-0.5 block truncate font-mono text-[10px] leading-none text-muted-foreground">{e.id.split(".")[2]}</span>}<span className={cn("block h-1.5 rounded-full", TONE[epicStatus(e)].dot, openEpic === e.id && "outline outline-2 outline-offset-1 outline-primary")} /></span>)}</span>
                          </button>
                        );
                      })}
                      {(REFS[d.id] ?? []).map((rid) => {
                        const r = LEGO_BY_ID[rid]; if (!r) return null; const ownerOn = duplos.includes(r.owner);
                        return (
                          <div key={rid} className="flex items-center justify-between gap-2 rounded-md border border-dashed border-border px-2.5 py-1.5 text-xs">
                            <button type="button" onClick={() => setFocusLego(rid)} className="flex min-w-0 items-center gap-1.5 text-left focus-visible:outline-2 focus-visible:outline-ring"><Link2 className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{r.fi} · {DUPLO_BY_ID[r.owner].fi}</span></button>
                            {ownerOn ? <span className="shrink-0">scopessa</span> : <button type="button" aria-pressed={extraLegos.includes(rid)} onClick={() => setExtraLegos((p) => toggleIn(p, rid))} className="shrink-0 font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring">{extraLegos.includes(rid) ? "Poista" : "Ota mukaan"}</button>}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-xs">
                {(Object.keys(TONE) as Status[]).map((s) => <span key={s} className="flex items-center gap-1.5"><span className={cn("size-2 rounded-full", TONE[s].dot)} aria-hidden="true" />{TONE[s].label}</span>)}
                <span className="flex items-center gap-1.5"><Link2 className="size-3" aria-hidden="true" />Viittaus toisen Duplon Legoon</span>
              </div>
              <span className="pointer-events-none absolute bottom-2 left-3 text-[10px] font-medium text-muted-foreground">HS Testi</span>
            </figure>
            )}

            {lego && (
              <aside aria-labelledby="lego-otsikko" className="rounded-xl border border-border bg-card xl:sticky xl:top-36 xl:max-h-[calc(100vh-10rem)] xl:overflow-y-auto">
                <div className="border-b border-border p-4">
                  <div className="text-xs text-muted-foreground">{DUPLO_BY_ID[lego.owner].fi} › {DUPLO_BY_ID[lego.owner].e2e}</div>
                  <h2 id="lego-otsikko" className="text-lg font-semibold">{lego.fi}</h2>
                  <div className="text-sm">{lego.t} <span className="font-mono text-xs text-muted-foreground">{lego.id}</span></div>
                  {!legoInScope(lego) && <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted px-2 py-1.5 text-xs">Tämä Lego ei ole scopessa.{seller && <Button size="xs" variant="outline" onClick={() => setDuplos((p) => toggleIn(p, lego.owner))}><Plus />Ota {DUPLO_BY_ID[lego.owner].fi} mukaan</Button>}</div>}
                </div>
                <ol className="divide-y divide-border">
                  {lego.e.map((e) => {
                    const disc = project.discussions.filter((d) => d.target.epic === e.id && (seller || d.visibility === "Asiakkaalle näkyvä"));
                    return (
                      <li key={e.id} id={`epic-${e.id}`} className={cn(openEpic === e.id && "rounded-lg border border-primary/70 bg-primary/10 shadow-sm")}>
                        <Collapsible open={openEpic === e.id} onOpenChange={(o) => setOpenEpic(o ? e.id : null)}>
                          <div className="flex items-start gap-1 pr-2 hover:bg-accent">
                          <CollapsibleTrigger className="group flex min-w-0 flex-1 items-start justify-between gap-3 p-3 text-left focus-visible:outline-2 focus-visible:outline-ring">
                            <span className="min-w-0"><span className="block text-sm font-medium">{e.t}</span><span className="block text-xs text-muted-foreground">Epic · {e.id} · {e.f.length} Functionia{e.f.some((f) => f.o) ? ` · ${e.f.filter((f) => f.o).length} erikoistapausta` : ""}{disc.length ? ` · ${disc.length} keskustelua` : ""}</span></span>
                            <ChevronDown className="mt-0.5 size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
                          </CollapsibleTrigger>
                          {scopeOf(e) === "O" ? (
                            <button type="button" onClick={() => setDecId(e.id)} aria-label={`Avaa optiopäätös: ${e.t} (${TONE[epicStatus(e)].label})`} title="Avaa optiopäätös"
                              className="mt-2.5 shrink-0 rounded-full hover:ring-2 hover:ring-primary/40 focus-visible:outline-2 focus-visible:outline-ring"><StatusBadge s={epicStatus(e)} /></button>
                          ) : <span className="mt-2.5 shrink-0"><StatusBadge s={epicStatus(e)} /></span>}
                          </div>
                          {partialText(e) && <div className="-mt-1 px-3 pb-2">{warn(e)}</div>}
                          <CollapsibleContent className="px-3 pb-3">
                            <div className="mb-2 rounded-md border border-border bg-card p-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-medium">Scope{e.s === "S" ? " (oletus: Sisältyy)" : " (oletus: Optio)"}{isPrereq(project, e.id) && <span className="ml-1.5 inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-px text-[10px]"><LockKeyhole className="size-2.5" aria-hidden="true" />Perusedellytys</span>}</span>
                                <ToggleGroup type="single" size="sm" variant="outline" value={!seller && proposals[e.id] ? proposals[e.id].to : scopeOf(e)} onValueChange={(v) => v && changeEpicScope(e, v as FuncState)} aria-label={`Epicin scope: ${e.t}`} className="h-7">
                                  <ToggleGroupItem value="S" className="h-7 px-2 text-xs data-[state=on]:bg-blue-700 data-[state=on]:text-white">Sisältyy</ToggleGroupItem>
                                  <ToggleGroupItem value="O" className="h-7 px-2 text-xs data-[state=on]:bg-amber-100 data-[state=on]:text-amber-950">Optio</ToggleGroupItem>
                                  <ToggleGroupItem value="E" className="h-7 px-2 text-xs data-[state=on]:bg-zinc-700 data-[state=on]:text-white">Ei</ToggleGroupItem>
                                </ToggleGroup>
                              </div>
                              {proposals[e.id] && (
                                <div className="mt-2 flex flex-wrap items-center gap-2 rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
                                  <span className="flex-1">Ehdotus ({proposals[e.id].by}): {SCOPE_LABEL[proposals[e.id].to]} – odottaa myyjän hyväksyntää</span>
                                  {seller && <><Button size="xs" onClick={() => approveProposal(e.id)}><Check />Hyväksy</Button><Button size="xs" variant="outline" onClick={() => rejectProposal(e.id)}><X />Hylkää</Button></>}
                                </div>
                              )}
                              {((seller && scopeOf(e) !== e.s) || (!seller && proposals[e.id])) && (
                                <div className="mt-2">
                                  <Label htmlFor={`sr-${e.id}`} className="mb-1 text-xs text-muted-foreground">Perustelu muutokselle</Label>
                                  {seller
                                    ? <Textarea id={`sr-${e.id}`} rows={2} value={scopeReason[e.id] ?? ""} onChange={(ev) => setScopeReason((p) => ({ ...p, [e.id]: ev.target.value }))} className="text-sm" />
                                    : <Textarea id={`sr-${e.id}`} rows={2} value={proposals[e.id]?.reason ?? ""} onChange={(ev) => setProposals((p) => (p[e.id] ? { ...p, [e.id]: { ...p[e.id], reason: ev.target.value } } : p))} className="text-sm" />}
                                </div>
                              )}
                            </div>
                            {scopeOf(e) === "O" && (
                              <button type="button" onClick={() => setDecId(e.id)} className="mb-2 flex w-full items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-left text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">
                                <span className="min-w-0"><span className="block font-medium">Optiopäätös</span><span className="block truncate text-xs text-muted-foreground">{dec(e.id).reason || (dec(e.id).choice === "avoin" ? "Ei vielä päätetty" : "Ei perustelua")}{dec(e.id).owner ? ` · ${dec(e.id).owner}` : ""}</span></span>
                                <span className="flex shrink-0 items-center gap-1.5"><StatusBadge s={epicStatus(e)} /><ArrowRight className="size-4" aria-hidden="true" /></span>
                              </button>
                            )}
                            {e.d && <p className="mb-2 text-xs leading-relaxed">{e.d}</p>}
                            <ul className="space-y-1">
                              {e.f.map((f) => {
                                const fi = fState(f); const st: Status = fi.state === "E" ? "eisisally" : fi.state === "O" ? optStatus(f.id) : "sisaltyy";
                                const pending = fi.state === "O" && !inclIds.has(e.id);
                                const stLabel = pending ? "Riippuu Epicistä" : TONE[st].label;
                                return (
                                  <li key={f.id} className={cn("rounded border px-2 py-1.5 text-xs", fi.state === "E" ? "border-dashed border-border bg-muted/50" : fi.state === "O" ? (pending ? "border-dashed border-border" : "border-amber-200 dark:border-amber-800") : "border-border")}>
                                    <div className="flex items-start justify-between gap-2">
                                      {fi.state === "O" ? (
                                        <button type="button" onClick={() => setDecId(f.id)} aria-label={`Avaa optiopäätös: ${f.t} (${stLabel})`} className="min-w-0 text-left hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                                          <span className="font-mono text-[10px] text-muted-foreground">{f.id}</span> {f.t}
                                        </button>
                                      ) : <span className={cn("min-w-0", fi.state === "E" && "line-through decoration-1")}><span className="font-mono text-[10px] text-muted-foreground">{f.id}</span> {f.t}</span>}
                                      <span className="flex shrink-0 items-center gap-1">{f.sop > 0 && <abbr title="SOP-dokumentti" className="rounded border border-border px-1 font-mono text-[10px] no-underline">D</abbr>}<span className={cn("size-2 rounded-full", pending ? "border border-zinc-400" : TONE[st].dot)} title={stLabel} aria-hidden="true" /></span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center justify-between gap-1.5">
                                      <span className="flex flex-wrap items-center gap-1">
                                        {f.n === 1 && <span className="rounded bg-muted px-1 text-[10px]">Uusi 10/2026</span>}
                                        {f.o && <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 text-[10px] text-amber-900">{f.o}</span>}
                                        {fi.source === "lähtötiedot" && <span className="inline-flex items-center gap-0.5 rounded-full border border-border px-1.5 text-[10px]"><Sparkles className="size-2.5 text-primary" aria-hidden="true" />lähtötiedoista ({fi.theme})</span>}
                                        {fi.state === "O" && <span className="text-[10px]" title={pending ? "Päätös tulee voimaan, kun Epic on mukana scopessa" : undefined}>{stLabel}</span>}
                                      </span>
                                      <ToggleGroup type="single" size="sm" variant="outline" value={fi.state} onValueChange={(v) => v && setFState(f, v as FuncState)} aria-label={`Scope: ${f.t}`} className="h-6">
                                        <ToggleGroupItem value="S" title="Sisältyy" aria-label="Sisältyy" className="h-6 px-1.5 text-[10px] data-[state=on]:bg-blue-700 data-[state=on]:text-white">Sis.</ToggleGroupItem>
                                        <ToggleGroupItem value="O" title="Optio" aria-label="Optio" className="h-6 px-1.5 text-[10px] data-[state=on]:bg-amber-100 data-[state=on]:text-amber-950">Optio</ToggleGroupItem>
                                        <ToggleGroupItem value="E" title="Ei sisälly" aria-label="Ei sisälly" className="h-6 px-1.5 text-[10px] data-[state=on]:bg-zinc-700 data-[state=on]:text-white">Ei</ToggleGroupItem>
                                      </ToggleGroup>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                            {disc.length > 0 && <ul className="mt-2 space-y-1">{disc.map((d) => <li key={d.id}><button type="button" onClick={() => go("t30", d.id)} className="w-full rounded border border-border px-2 py-1.5 text-left text-xs hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"><span className="font-mono text-[10px] text-muted-foreground">{d.id}</span> {d.title} <span className="text-muted-foreground">· {d.status}</span></button></li>)}</ul>}
                            {seller && (
                              <div className="mt-2 flex flex-col gap-2">
                                <Button size="sm" variant="outline" className="self-start" onClick={() => { const id = nextId("KES", project.discussions); update((p) => ({ ...p, discussions: [...p.discussions, { id, date: today(), title: `Keskustelu: ${e.t}`, target: { duplo: lego.owner, lego: lego.id, epic: e.id }, body: "", author: "", status: "Avoin", visibility: "Sisäinen", ticketId: "", changeId: "" }] })); go("t30", id); }}><Plus />Aloita keskustelu</Button>
                                <div><Label htmlFor={`note-${e.id}`} className="mb-1 flex items-center gap-1 text-xs text-muted-foreground"><Lock className="size-3" aria-hidden="true" />Sisäinen muistiinpano</Label><Textarea id={`note-${e.id}`} rows={2} value={notes[e.id] ?? ""} onChange={(ev) => setNotes((p) => ({ ...p, [e.id]: ev.target.value }))} className="text-sm" /></div>
                              </div>
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                      </li>
                    );
                  })}
                </ol>
                <Collapsible open={deliverablesOpen} onOpenChange={setDeliverablesOpen} className="border-t border-border">
                  <CollapsibleTrigger className="group flex w-full items-center justify-between p-4 text-left focus-visible:outline-2 focus-visible:outline-ring">
                    <h3 className="text-sm font-semibold">Legon deliverablet ({lego.dl.length})</h3>
                    <ChevronDown className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-4 pb-4">
                    {lego.dl.length === 0 ? <p className="text-sm">Ei kytkettyjä deliverableja.</p> : (<>
                      <div className="mb-2 flex flex-wrap gap-1.5">{DEL_ORDER.map((c) => { const n = lego.dl.filter((d) => d[1] === c).length; return n ? <button key={c} type="button" aria-pressed={deliverableType === c} onClick={() => { setDeliverableType((current) => current === c ? null : c); setDeliverablesOpen(true); }} className={cn("rounded border px-1.5 py-0.5 text-xs focus-visible:outline-2 focus-visible:outline-ring", deliverableType === c ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent")}><span className="font-mono font-semibold">{c}</span> {DEL_TYPES[c]} {n}</button> : null; })}</div>
                      <div className="relative mb-2"><Search className="pointer-events-none absolute left-2 top-2 size-4 text-muted-foreground" aria-hidden="true" /><Input aria-label="Hae deliverableja" value={delSearch} onChange={(e) => setDelSearch(e.target.value)} className="h-8 pl-8 text-sm" /></div>
                      <ul className="max-h-64 space-y-1 overflow-y-auto">{lego.dl.filter((d) => (!deliverableType || d[1] === deliverableType) && d[0].toLowerCase().includes(delSearch.toLowerCase())).slice(0, 80).map((d, i) => <li key={i} className="flex items-start gap-2 text-xs"><abbr title={DEL_TYPES[d[1]]} className="grid size-5 shrink-0 place-items-center rounded border border-border bg-muted font-mono text-[10px] font-semibold no-underline">{d[1]}</abbr><span className="min-w-0">{d[0]}<span className="block text-[10px] text-muted-foreground">{CATALOG.fas[d[2]]}</span></span></li>)}</ul>
                    </>)}
                  </CollapsibleContent>
                </Collapsible>
              </aside>
            )}
          </div>
        </>)}

        {curView === "luokittelu" && (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <div className="mb-5"><h1 className="text-2xl font-semibold tracking-tight">Luokittelu</h1><p className="text-sm text-muted-foreground">{approvedCount}/{scopeEpics.length} Epiciä hyväksytty · {scopeEpics.filter((e) => scopeOf(e) === "O").length} optiota · {Object.keys(scopeOverride).length} muutettu ehdotuksesta</p></div>
              {Object.keys(proposals).length > 0 && (
                <section aria-labelledby="ehd" className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
                  <h2 id="ehd" className="mb-2 text-base font-semibold">Asiakkaan ehdotukset ({Object.keys(proposals).length})</h2>
                  <ul className="space-y-2">
                    {Object.entries(proposals).map(([id, x]) => { const ep = EPIC_BY_ID[id]; if (!ep) return null; return (
                      <li key={id} className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card p-3 text-sm">
                        <div className="min-w-0 flex-1"><div className="font-medium">{ep.epic.t} <span className="font-normal">→ {SCOPE_LABEL[x.to]}</span></div><div className="text-xs text-muted-foreground">{ep.duplo.fi} › {ep.lego.fi} · {x.by} · {fiDate(x.at)}{isPrereq(project, id) ? " · perusedellytys" : ""}</div>{x.reason && <div className="mt-1 text-xs">{x.reason}</div>}</div>
                        <Button size="sm" onClick={() => approveProposal(id)}><Check />Hyväksy</Button><Button size="sm" variant="outline" onClick={() => rejectProposal(id)}><X />Hylkää</Button>
                      </li>
                    ); })}
                  </ul>
                </section>
              )}
              <div className="space-y-4">
                {model.scopeLegos.map((l) => (
                  <div key={l.id} className="rounded-lg border border-border bg-card">
                    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
                      <div className="min-w-0"><span className="font-semibold">{l.fi}</span> <span className="text-xs text-muted-foreground">{DUPLO_BY_ID[l.owner].fi} · {l.t}</span></div>
                      <Button size="sm" variant="outline" onClick={() => setApproved((p) => [...new Set([...p, ...l.e.map((e) => e.id)])])}><Check />Hyväksy kaikki</Button>
                    </div>
                    <table className="w-full text-sm">
                      <caption className="sr-only">{l.fi}: Epicien luokittelu</caption>
                      <thead><tr className="text-left text-xs text-muted-foreground"><th className="px-4 py-2 font-medium">Epic</th><th className="px-2 py-2 font-medium">Peruste</th><th className="px-2 py-2 font-medium">Luokka</th><th className="px-2 py-2 font-medium">Perusedell.</th><th className="px-2 py-2 text-right font-medium">Korjaus sis.</th><th className="px-2 py-2 text-right font-medium">Korjaus ulk.</th><th className="px-4 py-2 font-medium">Hyväksytty</th></tr></thead>
                      <tbody className="divide-y divide-border">
                        {l.e.map((e) => {
                          const changed = scopeOverride[e.id] !== undefined && scopeOverride[e.id] !== e.s;
                          return (
                            <tr key={e.id}>
                              <td className="px-4 py-2"><div className="flex flex-wrap items-center gap-1.5">{e.t}{warn(e)}</div><div className="font-mono text-[10px] text-muted-foreground">{e.id} · {e.f.length} F</div></td>
                              <td className="px-2 py-2 text-xs">{changed ? <span className="font-medium">Muutettu (ehdotus: {e.s === "S" ? "Sisältyy" : "Optio"})</span> : e.r ?? "Perusprosessi"}</td>
                              <td className="px-2 py-2"><ToggleGroup type="single" size="sm" variant="outline" value={scopeOf(e)} onValueChange={(v) => v && changeEpicScope(e, v as FuncState)} aria-label={`Luokka: ${e.t}`}><ToggleGroupItem value="S" className="px-2 text-xs data-[state=on]:bg-blue-700 data-[state=on]:text-white">Sisältyy</ToggleGroupItem><ToggleGroupItem value="O" className="px-2 text-xs data-[state=on]:bg-amber-100 data-[state=on]:text-amber-950">Optio</ToggleGroupItem><ToggleGroupItem value="E" className="px-2 text-xs data-[state=on]:bg-zinc-700 data-[state=on]:text-white">Ei</ToggleGroupItem></ToggleGroup>{scopeOf(e) !== e.s && <Input aria-label={`Perustelu: ${e.t}`} placeholder="Perustelu" value={scopeReason[e.id] ?? ""} onChange={(ev) => setScopeReason((p) => ({ ...p, [e.id]: ev.target.value }))} className="mt-1 h-7 text-xs" />}{proposals[e.id] && <div className="mt-1 text-[11px] text-amber-800 dark:text-amber-300">Asiakkaan ehdotus: {SCOPE_LABEL[proposals[e.id].to]}</div>}</td>
                              <td className="px-2 py-2"><Checkbox aria-label={`Perusedellytys: ${e.t}`} checked={isPrereq(project, e.id)} onCheckedChange={(c) => setPrereq((p) => ({ ...p, [e.id]: c === true }))} /></td>
                              <td className="px-2 py-2 text-right"><Input type="number" step="0.5" aria-label={`Sisäinen korjaus: ${e.t}`} value={corrInt[e.id] ?? 0} onChange={(ev) => setCorrInt((p) => ({ ...p, [e.id]: Number(ev.target.value) || 0 }))} className="ml-auto h-7 w-20 text-right text-sm" /></td>
                              <td className="px-2 py-2 text-right"><Input type="number" step="0.5" aria-label={`Ulkoinen korjaus: ${e.t}`} value={corrExt[e.id] ?? 0} onChange={(ev) => setCorrExt((p) => ({ ...p, [e.id]: Number(ev.target.value) || 0 }))} className="ml-auto h-7 w-20 text-right text-sm" /></td>
                              <td className="px-4 py-2"><Checkbox aria-label={`Hyväksy: ${e.t}`} checked={approvedSet.has(e.id)} onCheckedChange={() => setApproved((p) => toggleIn(p, e.id))} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
            <aside aria-labelledby="hinnat" className="h-fit rounded-xl border border-border bg-card p-4 xl:sticky xl:top-36">
              <section aria-labelledby="teemat" className="mb-5 border-b border-border pb-4">
                <h2 id="teemat" className="mb-2 text-base font-semibold">Teemarajaukset</h2>
                <ul className="space-y-2">
                  {THEMES.map((t) => {
                    const fs = scopeEpics.flatMap((e) => e.f).filter((f) => t.re.test(f.t));
                    if (!fs.length) return null;
                    const ex = fs.filter((f) => fState(f).state === "E").length;
                    const setAll = (v: FuncState | null) => setFuncScope((p) => { const n = { ...p }; for (const f of fs) { if (v) n[f.id] = v; else delete n[f.id]; } return n; });
                    return (
                      <li key={t.id} className="rounded-md border border-border p-2">
                        <div className="flex items-baseline justify-between gap-2 text-sm"><span className="font-medium">{t.label}</span><span className="text-xs tabular-nums">{ex}/{fs.length} pois</span></div>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          <Button size="xs" variant="outline" onClick={() => setAll("E")}>Ei sisälly</Button>
                          <Button size="xs" variant="outline" onClick={() => setAll("O")}>Optioksi</Button>
                          <Button size="xs" variant="ghost" onClick={() => setAll(null)}>Palauta</Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
              <h2 id="hinnat" className="mb-3 text-base font-semibold">Yksikköhinnat (htp)</h2>
              <div className="space-y-2">
                {(Object.keys(RATE_LABEL) as RateKey[]).map((k) => (
                  <div key={k} className="flex items-center justify-between gap-3"><Label htmlFor={`rate-${k}`} className="text-sm font-normal">{k !== "X" && <span className="mr-1.5 font-mono text-xs font-semibold">{k}</span>}{RATE_LABEL[k]}</Label><Input id={`rate-${k}`} type="number" step="0.05" min={0} value={rates[k]} onChange={(e) => setRates((p) => ({ ...p, [k]: Math.max(0, Number(e.target.value) || 0) }))} className="h-8 w-20 text-right" /></div>
                ))}
                <div className="flex items-center justify-between gap-3 border-t border-border pt-2"><Label htmlFor="extf" className="text-sm font-normal">Ulkoisen kerroin</Label><Input id="extf" type="number" step="0.05" min={0} value={extFactor} onChange={(e) => setExtFactor(Math.max(0, Number(e.target.value) || 0))} className="h-8 w-20 text-right" /></div>
              </div>
              <p className="mt-3 text-xs leading-relaxed">Sisäinen = Legon deliverablet jaettuna Epiceille + SOP:t + valitut erikoistapaukset + sisäinen korjaus. Ulkoinen = laskettu × kerroin + ulkoinen korjaus.</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 rounded-md bg-muted p-3 text-sm"><div><dt className="text-xs text-muted-foreground">Sisäinen</dt><dd className="font-semibold tabular-nums">{fmt(model.totalInt)} htp</dd></div><div><dt className="text-xs text-muted-foreground">Ulkoinen</dt><dd className="font-semibold tabular-nums">{fmt(model.totalExt)} htp</dd></div></dl>
            </aside>
          </div>
        )}

        {curView === "optiot" && (
          <div>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div><h1 className="text-2xl font-semibold tracking-tight">Optiopäätökset</h1><p className="text-sm text-muted-foreground">{decided}/{optTotal} päätetty · avoimet optiot yhteensä {seller ? `${fmt(model.openInt)} / ${fmt(model.openExt)}` : fmt(model.openExt)} htp</p></div>
              <div className="flex flex-wrap gap-2">
                <ToggleGroup type="single" variant="outline" value={optDuplo} onValueChange={(v) => v && setOptDuplo(v)} aria-label="Duplo"><ToggleGroupItem value="kaikki" className="px-3">Kaikki</ToggleGroupItem>{modOpts.length > 0 && <ToggleGroupItem value="mod" className="px-3">Moduulit</ToggleGroupItem>}{DUPLOS.filter((d) => model.options.some((o) => o.duplo.id === d.id)).map((d) => <ToggleGroupItem key={d.id} value={d.id} className="px-3">{d.fi}</ToggleGroupItem>)}</ToggleGroup>
                <ToggleGroup type="single" variant="outline" value={filter} onValueChange={(v) => v && setFilter(v as typeof filter)} aria-label="Suodata"><ToggleGroupItem value="kaikki" className="px-3">Kaikki</ToggleGroupItem><ToggleGroupItem value="nostetut" className="px-3">Nostetut</ToggleGroupItem><ToggleGroupItem value="avoimet" className="px-3">Avoimet</ToggleGroupItem></ToggleGroup>
              </div>
            </div>
            <div className="mb-5 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Päätetyt optiot" aria-valuenow={decided} aria-valuemin={0} aria-valuemax={optTotal}><div className="h-full bg-primary transition-all" style={{ width: `${optTotal ? (decided / optTotal) * 100 : 0}%` }} /></div>
            {visibleMods.length > 0 && (
              <section aria-labelledby="mod-opt" className="mb-6">
                <h2 id="mod-opt" className="mb-3 text-base font-semibold">Moduulit ({visibleMods.length})</h2>
                <ul className="space-y-4">
                  {visibleMods.map((r) => {
                    const dd = dec(r.mod.id); const st: Status = dd.choice === "valitaan" ? "valittu" : dd.choice === "eivalita" ? "eisisally" : "avoin";
                    return (
                      <li key={r.mod.id} className="grid gap-5 rounded-xl border border-border bg-card p-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
                        <div className="min-w-0">
                          <div className="mb-1 flex flex-wrap items-center gap-2"><StatusBadge s={st} /><span className="rounded-full border border-border px-2 py-0.5 text-xs">Moduuli</span>{moduleTrig(r.mod, params) && <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs"><Sparkles className="size-3 text-primary" aria-hidden="true" />Lähtötiedoista</span>}</div>
                          <h3 className="text-base font-semibold">{r.mod.name}</h3>
                          <div className="text-xs text-muted-foreground">{r.mod.phase} · <span className="font-mono">{r.mod.id}</span></div>
                          <div className="mt-2 text-sm font-medium tabular-nums">≈ {htp(r.effInt, r.effExt)} htp</div>
                          {r.mod.desc && <p className="mt-2 text-xs leading-relaxed">{r.mod.desc}</p>}
                          {r.mod.outputs && <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">Tuotokset: {r.mod.outputs}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div><Label htmlFor={`p-${r.mod.id}`} className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-green-800 dark:text-green-300"><Plus className="size-3.5" aria-hidden="true" />Plussat</Label><Textarea id={`p-${r.mod.id}`} rows={4} value={dd.pros} onChange={(e) => setDec(r.mod.id, { pros: e.target.value })} className="text-sm" /></div>
                          <div><Label htmlFor={`c-${r.mod.id}`} className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-red-800 dark:text-red-300"><Minus className="size-3.5" aria-hidden="true" />Miinukset</Label><Textarea id={`c-${r.mod.id}`} rows={4} value={dd.cons} onChange={(e) => setDec(r.mod.id, { cons: e.target.value })} className="text-sm" /></div>
                        </div>
                        <div className="space-y-3">
                          <ToggleGroup type="single" variant="outline" value={dd.choice} onValueChange={(v) => v && setDec(r.mod.id, { choice: v as Choice })} aria-label={`Päätös: ${r.mod.name}`} className="w-full">
                            <ToggleGroupItem value="valitaan" className="flex-1 data-[state=on]:bg-green-700 data-[state=on]:text-white"><Check aria-hidden="true" />Valitaan</ToggleGroupItem>
                            <ToggleGroupItem value="eivalita" className="flex-1 data-[state=on]:bg-zinc-700 data-[state=on]:text-white"><X aria-hidden="true" />Ei</ToggleGroupItem>
                            <ToggleGroupItem value="avoin" className="flex-1 data-[state=on]:bg-amber-100 data-[state=on]:text-amber-950"><CircleDot aria-hidden="true" />Avoin</ToggleGroupItem>
                          </ToggleGroup>
                          <div><Label htmlFor={`r-${r.mod.id}`} className="mb-1 text-xs text-muted-foreground">Perustelu</Label><Textarea id={`r-${r.mod.id}`} rows={2} value={dd.reason} onChange={(e) => setDec(r.mod.id, { reason: e.target.value })} className="text-sm" /></div>
                          <div><Label htmlFor={`o-${r.mod.id}`} className="mb-1 text-xs text-muted-foreground">Vastuuhenkilö</Label><Input id={`o-${r.mod.id}`} value={dd.owner} onChange={(e) => setDec(r.mod.id, { owner: e.target.value })} className="h-8 text-sm" /></div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
            {procOptions.length === 0 ? (visibleMods.length === 0 && <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm">Ei optioita tällä rajauksella.</div>) : (
              <ul className="space-y-4">
                {visibleMods.length > 0 && <li><h2 className="text-base font-semibold">Prosessit ({procOptions.length})</h2></li>}
                {procOptions.slice(0, showAllOpts ? undefined : 60).map((o) => {
                  const dd = dec(o.id);
                  return (
                    <li key={o.id} className="grid gap-5 rounded-xl border border-border bg-card p-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2"><StatusBadge s={optStatus(o.id)} />{o.kind === "function" && <span className="rounded-full border border-border px-2 py-0.5 text-xs">Erikoistapaus</span>}{trig(o.tr) && <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs"><Sparkles className="size-3 text-primary" aria-hidden="true" />Lähtötiedoista</span>}{seller && o.rule && <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{o.rule}</span>}</div>
                        <h3 className="text-base font-semibold">{o.name}</h3>
                        <div className="text-xs text-muted-foreground">{o.duplo.fi} › {o.lego.fi}{o.kind === "function" ? ` › ${o.epic.t}` : ""} · <span className="font-mono">{o.id}</span></div>
                        <div className="mt-2 text-sm font-medium tabular-nums">≈ {htp(o.effInt, o.effExt)} htp{o.kind === "epic" ? ` · ${o.epic.f.length} Functionia` : ""}</div>
                        {o.desc && <p className="mt-2 line-clamp-4 text-xs leading-relaxed">{o.desc}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label htmlFor={`p-${o.id}`} className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-green-800 dark:text-green-300"><Plus className="size-3.5" aria-hidden="true" />Plussat</Label><Textarea id={`p-${o.id}`} rows={4} value={dd.pros} onChange={(e) => setDec(o.id, { pros: e.target.value })} className="text-sm" /></div>
                        <div><Label htmlFor={`c-${o.id}`} className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-red-800 dark:text-red-300"><Minus className="size-3.5" aria-hidden="true" />Miinukset</Label><Textarea id={`c-${o.id}`} rows={4} value={dd.cons} onChange={(e) => setDec(o.id, { cons: e.target.value })} className="text-sm" /></div>
                      </div>
                      <div className="space-y-3">
                        <ToggleGroup type="single" variant="outline" value={dd.choice} onValueChange={(v) => v && setDec(o.id, { choice: v as Choice })} aria-label={`Päätös: ${o.name}`} className="w-full">
                          <ToggleGroupItem value="valitaan" className="flex-1 data-[state=on]:bg-green-700 data-[state=on]:text-white"><Check aria-hidden="true" />Valitaan</ToggleGroupItem>
                          <ToggleGroupItem value="eivalita" className="flex-1 data-[state=on]:bg-zinc-700 data-[state=on]:text-white"><X aria-hidden="true" />Ei</ToggleGroupItem>
                          <ToggleGroupItem value="avoin" className="flex-1 data-[state=on]:bg-amber-100 data-[state=on]:text-amber-950"><CircleDot aria-hidden="true" />Avoin</ToggleGroupItem>
                        </ToggleGroup>
                        <div><Label htmlFor={`r-${o.id}`} className="mb-1 text-xs text-muted-foreground">Perustelu</Label><Textarea id={`r-${o.id}`} rows={2} value={dd.reason} onChange={(e) => setDec(o.id, { reason: e.target.value })} className="text-sm" /></div>
                        <div><Label htmlFor={`o-${o.id}`} className="mb-1 text-xs text-muted-foreground">Vastuuhenkilö</Label><Input id={`o-${o.id}`} value={dd.owner} onChange={(e) => setDec(o.id, { owner: e.target.value })} className="h-8 text-sm" /></div>
                      </div>
                    </li>
                  );
                })}
                {procOptions.length > 60 && <li className="flex flex-wrap items-center justify-center gap-3 rounded-lg border border-dashed border-border p-4 text-sm">{showAllOpts ? `Näytetään kaikki ${procOptions.length} optiota` : `Näytetään 60 / ${procOptions.length} optiota`}<Button size="sm" variant="outline" onClick={() => setShowAllOpts((v) => !v)}>{showAllOpts ? "Näytä 60" : `Näytä kaikki ${procOptions.length}`}</Button></li>}
              </ul>
            )}
          </div>
        )}

        {curView === "yhteenveto" && (
          <div>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div><h1 className="text-2xl font-semibold tracking-tight">Scope – {customer.name}</h1><p className="text-sm text-muted-foreground">{CATALOG.version} · {duplos.map((x) => DUPLO_BY_ID[x]?.fi).join(", ")}{base ? ` · lähtötaso ${base.version}` : ""}</p></div>
              <div className="no-print flex flex-wrap items-center gap-2">
                <ToggleGroup type="single" variant="outline" value={sumTab} onValueChange={(v) => v && setSumTab(v as typeof sumTab)} aria-label="Näkymä"><ToggleGroupItem value="yhteenveto" className="px-3">Tarjousyhteenveto</ToggleGroupItem><ToggleGroupItem value="tarjous" className="px-3">Tarjousdokumentti</ToggleGroupItem></ToggleGroup>
                {sumTab === "yhteenveto" ? <Button variant="outline" onClick={() => window.print()}><Printer />Tulosta</Button> : <PdfExportButton targetRef={offerRef} fileName={`Tarjous_${safeName}.pdf`} options={{ paperSize: "a4", orientation: "portrait" }}>Lataa PDF</PdfExportButton>}
              </div>
            </div>
            {sumTab === "yhteenveto" ? (<>
              <dl className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-5">
                {[[seller ? "Työmäärä sis. / ulk." : "Työmääräarvio", `${htp(model.totalInt, model.totalExt)} htp`], ["Epicejä scopessa", String(model.included.length)], ["Deliverableja", String(model.delCount)], ["Avoimia päätöksiä", String(model.openAll.length)], ["Muutos lähtötasoon", delta ? `${delta.dExt >= 0 ? "+" : ""}${fmt(delta.dExt)} htp` : "–"]].map(([k, v]) => <div key={k} className="bg-card p-4"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="text-xl font-semibold tabular-nums">{v}</dd></div>)}
              </dl>
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                <section aria-labelledby="sis">
                  <h2 id="sis" className="mb-3 text-base font-semibold">Sisältyy</h2>
                  <div className="space-y-4">
                    {model.mods.some((r) => r.included) && (
                      <div className="rounded-lg border border-border bg-card">
                        <div className="flex justify-between border-b border-border px-4 py-2.5 font-semibold"><span>Moduulit <span className="text-xs font-normal text-muted-foreground">· projektin työvaiheet ja palvelut</span></span><span className="tabular-nums">{htp(model.modulesInt, model.modulesExt)} htp</span></div>
                        <table className="w-full text-sm"><caption className="sr-only">Sisältyvät moduulit</caption>
                          <thead><tr className="text-left text-xs text-muted-foreground"><th className="px-4 py-2 font-medium">Moduuli</th><th className="px-2 py-2 font-medium">Tila</th><th className="px-4 py-2 text-right font-medium">{seller ? "Sis. / ulk." : "Arvio"}</th></tr></thead>
                          <tbody className="divide-y divide-border">
                            {model.mods.filter((r) => r.included).map((r) => (
                              <tr key={r.mod.id}><td className="px-4 py-1.5"><div className="text-xs text-muted-foreground">{r.mod.phase} · <span className="font-mono">{r.mod.id}</span></div>{r.mod.name}</td><td className="px-2 py-1.5"><StatusBadge s={r.isOpt ? "valittu" : "sisaltyy"} /></td><td className="whitespace-nowrap px-4 py-1.5 text-right tabular-nums">{htp(r.totalInt, r.totalExt)}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {DUPLOS.filter((d) => model.included.some((i) => i.duplo.id === d.id)).map((d) => {
                      const rows = model.included.filter((i) => i.duplo.id === d.id);
                      return (
                        <div key={d.id} className="rounded-lg border border-border bg-card">
                          <div className="flex justify-between border-b border-border px-4 py-2.5 font-semibold"><span>{d.fi} <span className="text-xs font-normal text-muted-foreground">· {d.e2e}</span></span><span className="tabular-nums">{htp(rows.reduce((a, r) => a + r.totalInt, 0), rows.reduce((a, r) => a + r.totalExt, 0))} htp</span></div>
                          <table className="w-full text-sm"><caption className="sr-only">{d.fi}: sisältyvät Epicit</caption>
                            <thead><tr className="text-left text-xs text-muted-foreground"><th className="px-4 py-2 font-medium">Lego › Epic</th><th className="px-2 py-2 font-medium">Tila</th><th className="px-2 py-2 text-right font-medium">F</th><th className="px-4 py-2 text-right font-medium">{seller ? "Sis. / ulk." : "Arvio"}</th></tr></thead>
                            <tbody className="divide-y divide-border">
                              {rows.map((i) => (
                                <tr key={i.epic.id}>
                                  <td className="px-4 py-1.5"><div className="text-xs text-muted-foreground">{i.lego.fi} · <span className="font-mono">{i.epic.id}</span>{delta?.added.includes(i.epic.id) && <span className="ml-1 rounded bg-green-50 px-1 text-green-800 dark:bg-green-950 dark:text-green-200">uusi lähtötason jälkeen</span>}</div>{i.epic.t}{seller && notes[i.epic.id] && <div className="mt-1 flex items-start gap-1 text-xs"><Lock className="mt-0.5 size-3 shrink-0" aria-label="Sisäinen" />{notes[i.epic.id]}</div>}</td>
                                  <td className="px-2 py-1.5"><StatusBadge s={epicStatus(i.epic)} /></td>
                                  <td className="px-2 py-1.5 text-right tabular-nums">{i.funcs.length}</td>
                                  <td className="whitespace-nowrap px-4 py-1.5 text-right tabular-nums">{htp(i.totalInt, i.totalExt)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                </section>
                <div className="space-y-6">
                  {delta && (delta.added.length > 0 || delta.removed.length > 0) && (
                    <section aria-labelledby="poik" className="rounded-lg border border-border bg-card p-4">
                      <h2 id="poik" className="mb-2 text-base font-semibold">Poikkeamat lähtötasosta {base?.version}</h2>
                      <ul className="space-y-1 text-sm">
                        {delta.added.map((id) => <li key={id} className="flex gap-2"><Plus className="mt-0.5 size-3.5 shrink-0 text-green-700" aria-label="Lisätty" />{nameOf(id)}</li>)}
                        {delta.removed.map((id) => <li key={id} className="flex gap-2"><Minus className="mt-0.5 size-3.5 shrink-0 text-red-700" aria-label="Poistettu" />{nameOf(id)}</li>)}
                      </ul>
                      <Button variant="link" className="no-print mt-2 h-auto p-0" onClick={() => go("t40")}>Muutospyyntöihin <ArrowRight /></Button>
                    </section>
                  )}
                  <section aria-labelledby="ei" className="rounded-lg border border-border bg-card p-4"><h2 id="ei" className="mb-2 text-base font-semibold">Ei sisälly ({model.excludedAll.length + model.epicExclusions.length + model.funcExclusions.reduce((a, x) => a + x.funcs.length, 0)})</h2>{model.excludedAll.length === 0 && model.funcExclusions.length === 0 && model.epicExclusions.length === 0 ? <p className="text-sm">Ei rajattuja optioita.</p> : <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">{model.epicExclusions.map((x) => <li key={x.epic.id}><div className="flex items-center gap-1.5 font-medium">{x.epic.t}{x.prereq && <AlertTriangle className="size-3.5 text-amber-700" aria-label="Perusedellytys" />}</div><div className="text-xs text-muted-foreground">Rajattu oletusscopesta · {x.duplo.fi} › {x.lego.fi}{x.reason ? ` — ${x.reason}` : ""}</div></li>)}{model.excludedAll.map((o) => <li key={o.id}><div className="font-medium">{o.name}</div><div className="text-xs text-muted-foreground">{o.path}{dec(o.id).reason ? ` — ${dec(o.id).reason}` : ""}</div></li>)}{model.funcExclusions.map((x) => <li key={x.epic.id}><div className="font-medium">{x.epic.t} – ei sisällä:</div><ul className="ml-4 list-disc text-xs">{x.funcs.map((f) => <li key={f.id}>{f.t}</li>)}</ul><div className="text-xs text-muted-foreground">{x.duplo.fi} › {x.lego.fi}</div></li>)}</ul>}</section>
                  <section aria-labelledby="av" className="rounded-lg border border-border bg-card p-4"><h2 id="av" className="mb-2 flex items-center justify-between text-base font-semibold">Avoimet päätökset ({model.openAll.length}) <span className="text-xs font-normal tabular-nums">{fmt(model.openExt)} htp</span></h2><ul className="max-h-64 space-y-1.5 overflow-y-auto text-sm">{model.openAll.map((o) => <li key={o.id} className="flex justify-between gap-2"><span className="min-w-0">{o.name}{o.kind === "module" && <span className="ml-1 text-xs text-muted-foreground">(moduuli)</span>}</span><span className="shrink-0 tabular-nums text-muted-foreground">{fmt(o.effExt)}</span></li>)}</ul><Button variant="link" className="no-print mt-2 h-auto p-0" onClick={() => { setFilter("avoimet"); go("optiot"); }}>Optiopäätöksiin <ArrowRight /></Button></section>
                  <section aria-labelledby="tyypit" className="rounded-lg border border-border bg-card p-4"><h2 id="tyypit" className="mb-3 text-base font-semibold">Deliverablet tyypeittäin</h2>
                    <table className="w-full text-sm"><caption className="sr-only">Sisältyvien deliverablejen määrä WRICEDJMPS-tyypeittäin</caption><tbody>{DEL_ORDER.map((c) => { const n = model.byType[c]; const max = Math.max(1, ...Object.values(model.byType)); return <tr key={c}><th scope="row" className="w-44 py-1 text-left font-normal"><span className="mr-2 font-mono text-xs font-semibold">{c}</span>{DEL_TYPES[c]}</th><td className="py-1"><div className="h-2 rounded-full bg-primary" style={{ width: `${(n / max) * 100}%` }} aria-hidden="true" /></td><td className="w-12 py-1 text-right tabular-nums">{n}</td></tr>; })}</tbody></table>
                  </section>
                </div>
              </div>
            </>) : (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="overflow-x-auto rounded-xl bg-muted p-6"><OfferDocument ref={offerRef} p={project} m={model} /></div>
                {seller && (
                  <aside aria-labelledby="tarj-ed" className="h-fit space-y-3 rounded-xl border border-border bg-card p-4 xl:sticky xl:top-36">
                    <h2 id="tarj-ed" className="text-base font-semibold">Tarjouksen tekstit</h2>
                    <div><Label htmlFor="o-title" className="mb-1 text-xs text-muted-foreground">Otsikko</Label><Input id="o-title" value={offer.title} onChange={(e) => setOffer((p) => ({ ...p, title: e.target.value }))} /></div>
                    <div><Label htmlFor="o-bg" className="mb-1 text-xs text-muted-foreground">Tausta</Label><Textarea id="o-bg" rows={4} value={offer.background} onChange={(e) => setOffer((p) => ({ ...p, background: e.target.value }))} className="text-sm" /></div>
                    <div><Label htmlFor="o-goals" className="mb-1 text-xs text-muted-foreground">Tavoitteet (rivi per tavoite)</Label><Textarea id="o-goals" rows={4} value={offer.goals} onChange={(e) => setOffer((p) => ({ ...p, goals: e.target.value }))} className="text-sm" /></div>
                    <div><Label htmlFor="o-app" className="mb-1 text-xs text-muted-foreground">Toteutustapa</Label><Textarea id="o-app" rows={3} value={offer.approach} onChange={(e) => setOffer((p) => ({ ...p, approach: e.target.value }))} className="text-sm" /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label htmlFor="o-valid" className="mb-1 text-xs text-muted-foreground">Voimassa</Label><Input id="o-valid" type="date" value={offer.validUntil} onChange={(e) => setOffer((p) => ({ ...p, validUntil: e.target.value }))} /></div>
                      <div><Label htmlFor="o-cp" className="mb-1 text-xs text-muted-foreground">Yhteyshenkilö</Label><Input id="o-cp" value={offer.contactPerson} onChange={(e) => setOffer((p) => ({ ...p, contactPerson: e.target.value }))} /></div>
                    </div>
                    <p className="text-xs">Oletukset ja riippuvuudet tulevat RAID-kirjauksista, joissa on valittu "Näytä tarjouksessa". Työmäärät ovat ulkoisia.</p>
                    <Button variant="outline" size="sm" onClick={() => go("t50")}>RAID <ArrowRight /></Button>
                  </aside>
                )}
              </div>
            )}
          </div>
        )}

        {curView === "handover" && (
          <HandoverView plan={plan} model={model} project={project} sprintCap={sprintCap} setSprintCap={setSprintCap} approvedCount={approvedCount} scopeTotal={scopeEpics.length}
            approvedTickets={tickets.filter((t) => t.status === "Hyväksytty").length} onTickets={() => go("t60")} onExport={exportBacklog} />
        )}

        {stepIdx >= 0 && (
          <div className="no-print mt-8 flex justify-between">
            <Button variant="ghost" disabled={stepIdx === 0} onClick={() => go(steps[stepIdx - 1].key)}><ArrowLeft />Edellinen</Button>
            {stepIdx < steps.length - 1 && <Button variant="outline" onClick={() => go(steps[stepIdx + 1].key)}>{steps[stepIdx + 1].label}<ArrowRight /></Button>}
          </div>
        )}
      </section>

      {(() => {
        if (!decId) return null;
        const ep = EPIC_BY_ID[decId]; const fn = FUNC_BY_ID[decId]; const parent = fn ? EPIC_BY_ID[fn.epic.id] : ep;
        if (!parent) return null;
        const name = fn ? fn.fn.t : parent.epic.t;
        const opt = model.options.find((o) => o.id === decId);
        const dd = dec(decId); const st = optStatus(decId);
        const parentIn = !fn || model.included.some((i) => i.epic.id === fn.epic.id);
        return (
          <Dialog open onOpenChange={(o) => { if (!o) setDecId(null); }}>
            <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2"><StatusBadge s={st} />{fn && <span className="rounded-full border border-border px-2 py-0.5 text-xs">{fn.fn.o ? `Erikoistapaus · ${fn.fn.o}` : "Function"}</span>}{opt && trig(opt.tr) && <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs"><Sparkles className="size-3 text-primary" aria-hidden="true" />Lähtötiedoista</span>}{seller && !fn && parent.epic.r && <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{parent.epic.r}</span>}</div>
                <DialogTitle className="text-lg">Optiopäätös: {name}</DialogTitle>
                <DialogDescription>{parent.duplo.fi} › {parent.lego.fi}{fn ? ` › ${parent.epic.t}` : ""} · <span className="font-mono">{decId}</span>{opt ? ` · ≈ ${htp(opt.effInt, opt.effExt)} htp` : ""}</DialogDescription>
              </DialogHeader>
              {!fn && parent.epic.d && <p className="line-clamp-4 text-sm leading-relaxed">{parent.epic.d}</p>}
              {!legoInScope(parent.lego) && <p className="rounded-md bg-muted px-3 py-2 text-sm">{parent.duplo.fi} ei ole vielä scopessa – päätös tallentuu ja tulee voimaan, kun alue otetaan mukaan.</p>}
              {fn && !parentIn && <p className="rounded-md bg-muted px-3 py-2 text-sm">Epic "{parent.epic.t}" ei ole mukana scopessa – erikoistapauksen päätös tulee voimaan, kun Epic valitaan.</p>}
              <div className="grid gap-4 md:grid-cols-2">
                <div><Label htmlFor="dlg-pros" className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-green-800 dark:text-green-300"><Plus className="size-3.5" aria-hidden="true" />Plussat</Label><Textarea id="dlg-pros" rows={5} value={dd.pros} onChange={(e) => setDec(decId, { pros: e.target.value })} className="text-sm" /></div>
                <div><Label htmlFor="dlg-cons" className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-red-800 dark:text-red-300"><Minus className="size-3.5" aria-hidden="true" />Miinukset</Label><Textarea id="dlg-cons" rows={5} value={dd.cons} onChange={(e) => setDec(decId, { cons: e.target.value })} className="text-sm" /></div>
              </div>
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                <div className="space-y-3">
                  <div><Label id="dlg-choice-l" className="mb-1 text-xs text-muted-foreground">Päätös</Label>
                    <ToggleGroup type="single" variant="outline" value={dd.choice} onValueChange={(v) => v && setDec(decId, { choice: v as Choice })} aria-labelledby="dlg-choice-l" className="w-full">
                      <ToggleGroupItem value="valitaan" className="flex-1 data-[state=on]:bg-green-700 data-[state=on]:text-white"><Check aria-hidden="true" />Valitaan</ToggleGroupItem>
                      <ToggleGroupItem value="eivalita" className="flex-1 data-[state=on]:bg-zinc-700 data-[state=on]:text-white"><X aria-hidden="true" />Ei</ToggleGroupItem>
                      <ToggleGroupItem value="avoin" className="flex-1 data-[state=on]:bg-amber-100 data-[state=on]:text-amber-950"><CircleDot aria-hidden="true" />Avoin</ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                  <div><Label htmlFor="dlg-owner" className="mb-1 text-xs text-muted-foreground">Vastuuhenkilö</Label><Input id="dlg-owner" value={dd.owner} onChange={(e) => setDec(decId, { owner: e.target.value })} /></div>
                </div>
                <div><Label htmlFor="dlg-reason" className="mb-1 text-xs text-muted-foreground">Perustelu</Label><Textarea id="dlg-reason" rows={4} value={dd.reason} onChange={(e) => setDec(decId, { reason: e.target.value })} className="text-sm" /></div>
              </div>
              <DialogFooter><Button onClick={() => setDecId(null)}><Check />Valmis</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      <Dialog open={lockOpen} onOpenChange={setLockOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Lukitse lähtötaso v{baselines.length + 1}.0</DialogTitle></DialogHeader>
          <dl className="grid grid-cols-3 gap-3 rounded-md bg-muted p-3 text-sm"><div><dt className="text-xs text-muted-foreground">Epicejä</dt><dd className="font-semibold">{model.included.length}</dd></div><div><dt className="text-xs text-muted-foreground">Sisäinen</dt><dd className="font-semibold tabular-nums">{fmt(model.totalInt)} htp</dd></div><div><dt className="text-xs text-muted-foreground">Ulkoinen</dt><dd className="font-semibold tabular-nums">{fmt(model.totalExt)} htp</dd></div></dl>
          {model.openAll.length > 0 && <p className="text-sm">{model.openAll.length} optiota on avoinna, eivätkä ne kuulu lähtötasoon.</p>}
          <div><Label htmlFor="lock-note" className="mb-1 text-xs text-muted-foreground">Huomio</Label><Textarea id="lock-note" rows={3} value={lockNote} onChange={(e) => setLockNote(e.target.value)} /></div>
          {baselines.length > 0 && <ul className="space-y-1 text-xs">{baselines.map((b) => <li key={b.id}>{b.version} · {fiDate(b.lockedAt)} · {fmt(b.totalExt)} htp ulk. {b.note && `· ${b.note}`}</li>)}</ul>}
          <DialogFooter><Button variant="outline" onClick={() => setLockOpen(false)}>Peruuta</Button><Button onClick={lockBaseline}><LockKeyhole />Lukitse</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
