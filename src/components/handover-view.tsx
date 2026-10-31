import { Fragment, useState } from "react";
import { ArrowRight, CheckCircle2, ChevronDown, FileSpreadsheet, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useField } from "@/lib/project-store";
import type { Project } from "@/lib/project-types";
import { DUPLO_BY_ID, fmt, type ScopeModel } from "@/lib/scope-model";
import { DEFAULT_TEAM_A, PHASES, TEAM_LABEL, legoTeam, setDuploTeam, setLegoTeam, type Plan, type Sprint } from "@/lib/sprint-plan";

const COL_W = 236;
const PHASE_TONE: Record<string, string> = {
  kaynnistys: "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
  perusta: "bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100",
  ketjut: "bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100",
  sulkeminen: "bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-100",
  valmistelu: "bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100",
  kaytto: "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100",
};

interface Props {
  plan: Plan; model: ScopeModel; project: Project; sprintCap: number; setSprintCap: (n: number) => void;
  approvedCount: number; scopeTotal: number; approvedTickets: number; onTickets: () => void; onExport: () => void;
}

function SprintCard({ s }: { s: Sprint }) {
  const pct = Math.min(100, (s.load / s.cap) * 100);
  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="text-sm font-semibold">Sprint {s.n}</span>
        <span className={cn("text-xs tabular-nums", s.load > s.cap && "font-semibold text-red-700 dark:text-red-300")}>{fmt(s.load)}/{s.cap} htp</span>
      </div>
      <div className="h-1 bg-muted" aria-hidden="true"><div className={cn("h-full", s.load > s.cap ? "bg-red-700" : "bg-primary")} style={{ width: `${pct}%` }} /></div>
      {s.label && <div className="px-3 pt-2 text-[11px] font-medium leading-snug">{s.label}</div>}
      <ul className="space-y-1.5 p-2">
        {s.items.map((it) => (
          <li key={it.id} className="rounded-md border border-border px-2 py-1.5" title={it.reason}>
            <div className="text-[10px] text-muted-foreground">{it.kind === "epic" ? `${it.inc.duplo.fi} › ${it.inc.lego.fi}` : "Moduuli"}</div>
            <div className="text-xs font-medium leading-snug">{it.kind === "epic" ? it.inc.epic.t : it.r.mod.name}</div>
            <div className="mt-0.5 flex justify-between gap-2 text-[10px]"><span className="truncate">{it.reason}</span><span className="shrink-0 tabular-nums">{fmt(it.load)}</span></div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HandoverView({ plan, model, project, sprintCap, setSprintCap, approvedCount, scopeTotal, approvedTickets, onTickets, onExport }: Props) {
  const [teamA, setTeamA] = useField("teamA");
  const [teamsOpen, setTeamsOpen] = useState(false);
  const tA = teamA ?? DEFAULT_TEAM_A;
  const cols = plan.columns;
  const byCol = (n: number) => plan.sprints.filter((s) => s.n === n);
  const allOk = plan.checks.every((c) => c.ok);
  const loadOf = (t: "A" | "B") => plan.sprints.filter((s) => s.team === t).reduce((a, s) => a + s.load, 0);
  const jointLoad = plan.sprints.filter((s) => s.team === "joint").reduce((a, s) => a + s.load, 0);
  const overhead = plan.overhead.reduce((a, r) => a + r.totalInt, 0);
  const phaseSpans = PHASES.map((ph) => { const ns = plan.sprints.filter((s) => s.phase === ph.id).map((s) => s.n); return ns.length ? { ...ph, from: Math.min(...ns), to: Math.max(...ns) } : null; }).filter(Boolean) as (typeof PHASES[number] & { from: number; to: number })[];
  const scopeLegos = model.scopeLegos;
  const duploIds = [...new Set(scopeLegos.map((l) => l.owner))];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Handover projektiorganisaatiolle</h1>
          <p className="text-sm text-muted-foreground">{cols} sprinttiä · 2 tiimiä · {model.included.length} Epiciä · {fmt(model.totalInt)} htp sisäinen · luokittelusta hyväksytty {approvedCount}/{scopeTotal} · tikettijonossa {approvedTickets} hyväksyttyä aihiota</p>
        </div>
        <div className="flex items-end gap-3">
          <div><Label htmlFor="cap" className="mb-1 text-xs text-muted-foreground">Kapasiteetti / tiimi / sprintti (htp)</Label><Input id="cap" type="number" min={5} max={400} value={sprintCap} onChange={(e) => setSprintCap(Math.max(5, Number(e.target.value) || 5))} className="h-9 w-28" /></div>
          <Button variant="outline" onClick={onTickets}>Tikettijono <ArrowRight /></Button>
          <Button onClick={onExport}><FileSpreadsheet />Vie backlog (Jira)</Button>
        </div>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section aria-labelledby="riippuvuus" className="rounded-lg border border-border bg-card p-4">
          <h2 id="riippuvuus" className="mb-2 flex items-center gap-2 text-base font-semibold">{allOk ? <CheckCircle2 className="size-4 text-green-700" aria-hidden="true" /> : <XCircle className="size-4 text-red-700" aria-hidden="true" />}Riippuvuustarkistus</h2>
          <ul className="space-y-1 text-sm">{plan.checks.map((c) => <li key={c.text} className="flex items-start gap-2">{c.ok ? <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-green-700" aria-label="Kunnossa" /> : <XCircle className="mt-0.5 size-3.5 shrink-0 text-red-700" aria-label="Huomio" />}{c.text}</li>)}</ul>
        </section>
        <section aria-labelledby="kuorma" className="rounded-lg border border-border bg-card p-4">
          <h2 id="kuorma" className="mb-2 text-base font-semibold">Kuormitus</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt>Talous-tiimi</dt><dd className="text-right tabular-nums">{fmt(loadOf("A"))} htp</dd>
            <dt>Supply chain -tiimi</dt><dd className="text-right tabular-nums">{fmt(loadOf("B"))} htp</dd>
            <dt>Yhteiset sprintit</dt><dd className="text-right tabular-nums">{fmt(jointLoad)} htp</dd>
            <dt>Projektinhallinta (koko projekti)</dt><dd className="text-right tabular-nums">{fmt(overhead)} htp</dd>
          </dl>
          <Collapsible open={teamsOpen} onOpenChange={setTeamsOpen}>
            <CollapsibleTrigger className="group mt-3 flex items-center gap-1 rounded text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring">Tiimijako<ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" /></CollapsibleTrigger>
            <CollapsibleContent className="mt-2 max-h-80 space-y-3 overflow-y-auto">
              {duploIds.map((d) => {
                const legos = scopeLegos.filter((l) => l.owner === d);
                const teams = legos.map((l) => legoTeam(tA, l.id, d));
                const dVal = teams.every((t) => t === "A") ? "A" : teams.every((t) => t === "B") ? "B" : "";
                return (
                  <div key={d} className="rounded-md border border-border p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{DUPLO_BY_ID[d]?.fi}</span>
                      <ToggleGroup type="single" size="sm" variant="outline" value={dVal} onValueChange={(v) => v && setTeamA(setDuploTeam(tA, d, legos.map((l) => l.id), v as "A" | "B"))} aria-label={`${DUPLO_BY_ID[d]?.fi}: tiimi`} className="h-6">
                        <ToggleGroupItem value="A" className="h-6 px-2 text-[11px]">Talous</ToggleGroupItem>
                        <ToggleGroupItem value="B" className="h-6 px-2 text-[11px]">Supply chain</ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                    <ul className="mt-1.5 space-y-1">
                      {legos.map((l, k) => (
                        <li key={l.id} className="flex items-center justify-between gap-2 text-xs">
                          <span className="min-w-0 truncate">{l.fi}</span>
                          <ToggleGroup type="single" size="sm" variant="outline" value={teams[k]} onValueChange={(v) => v && setTeamA(setLegoTeam(tA, l.id, d, v as "A" | "B"))} aria-label={`${l.fi}: tiimi`} className="h-5">
                            <ToggleGroupItem value="A" className="h-5 px-1.5 text-[10px]">T</ToggleGroupItem>
                            <ToggleGroupItem value="B" className="h-5 px-1.5 text-[10px]">SC</ToggleGroupItem>
                          </ToggleGroup>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        </section>
      </div>

      {model.openAll.length > 0 && <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">{model.openAll.length} optiota on vielä avoinna – ne eivät ole sprinttirungossa.</div>}

      <figure aria-labelledby="runko" className="relative rounded-xl border border-border bg-card p-3 pb-7">
        <figcaption id="runko" className="mb-2 text-base font-semibold">Sprinttirunko</figcaption>
        <div className="overflow-x-auto">
          <div className="grid gap-2" style={{ gridTemplateColumns: `112px repeat(${cols}, ${COL_W}px)` }}>
            <div />
            {phaseSpans.map((ph) => (
              <div key={ph.id} title={ph.why} className={cn("rounded-md px-2 py-1 text-xs font-semibold", PHASE_TONE[ph.id])} style={{ gridColumn: `${ph.from + 1} / ${ph.to + 2}`, gridRow: 1 }}>{ph.label}<span className="ml-1.5 font-normal">· {ph.why}</span></div>
            ))}
            {(["A", "B"] as const).map((t, ti) => (
              <Fragment key={t}>
                <div className="sticky left-0 z-10 flex items-start bg-card pt-2 text-sm font-semibold" style={{ gridRow: ti + 2, gridColumn: 1 }}>{TEAM_LABEL[t]}</div>
                {Array.from({ length: cols }, (_, k) => k + 1).map((n) => {
                  const joint = byCol(n).find((s) => s.team === "joint");
                  if (joint) return ti === 0 ? <div key={`j${n}`} style={{ gridColumn: n + 1, gridRow: "2 / 4" }}><SprintCard s={joint} /></div> : null;
                  const s = byCol(n).find((x) => x.team === t);
                  return <div key={`${t}${n}`} style={{ gridColumn: n + 1, gridRow: ti + 2 }}>{s ? <SprintCard s={s} /> : <div className="h-full min-h-16 rounded-lg border border-dashed border-border" aria-hidden="true" />}</div>;
                })}
              </Fragment>
            ))}
          </div>
        </div>
        <span className="pointer-events-none absolute bottom-2 left-3 text-[10px] font-medium text-muted-foreground">HS Testi</span>
      </figure>
      <p className="mt-2 text-xs text-muted-foreground">Yhteiset sprintit ulottuvat molempien tiimien yli. Kun tiimin rivi on tyhjä, se odottaa toisen tiimin ketjuaskelta.</p>
      <span className="sr-only">{project.name}</span>
    </div>
  );
}
