import { AlertTriangle, ArrowRight, CircleHelp, CornerDownRight } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { CHAINS, CHAINS_BY_EPIC, type Chain } from "@/data/e2e-chains";
import { EPIC_BY_ID, fmt, type ScopeModel } from "@/lib/scope-model";
import type { CEpic } from "@/data/types";

export type StepStatus = "sisaltyy" | "valittu" | "avoin" | "eisisally";
export interface StatusStyle { label: string; dot: string }

interface Props {
  chainId: string; setChainId: (id: string) => void;
  variant: "simple" | "wide";
  selected: string | null; onSelect: (epicId: string) => void;
  model: ScopeModel; seller: boolean;
  statusOf: (e: CEpic) => StepStatus; styleOf: (s: StepStatus) => StatusStyle;
  inScope: (epicId: string) => boolean;
  partial: (epicId: string) => { label: string; names: string } | null;
}

const CARD_W = 150, CARD_H = 84, COL_W = 176, LANE_H = 112, LABEL_W = 136;

function shortDuplo(name: string) { return name.split(" ")[0]; }

export function E2EView({ chainId, setChainId, variant, selected, onSelect, model, seller, statusOf, styleOf, inScope, partial }: Props) {
  const chain: Chain = CHAINS.find((c) => c.id === chainId) ?? CHAINS[0];
  const all = [...new Set([...chain.foundation, ...chain.steps.map((s) => s.epic), ...chain.side, ...chain.analytics])];
  const inc = new Map(model.included.map((i) => [i.epic.id, i]));
  const effInt = all.reduce((a, id) => a + (inc.get(id)?.totalInt ?? 0), 0);
  const effExt = all.reduce((a, id) => a + (inc.get(id)?.totalExt ?? 0), 0);
  const counts = all.reduce<Record<StepStatus, number>>((a, id) => { const e = EPIC_BY_ID[id]; if (e) a[statusOf(e.epic)]++; return a; }, { sisaltyy: 0, valittu: 0, avoin: 0, eisisally: 0 });
  const others = (id: string) => (CHAINS_BY_EPIC[id] ?? []).filter((n) => n !== chain.name);
  const note = chain.steps.find((s) => s.epic === selected)?.note;

  const chip = (id: string) => {
    const e = EPIC_BY_ID[id]; if (!e) return null; const st = statusOf(e.epic); const sty = styleOf(st);
    return (
      <button key={id} type="button" onClick={() => onSelect(id)} aria-pressed={selected === id} aria-label={`${e.epic.t}, ${sty.label}`}
        className={cn("flex max-w-56 items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-left text-xs hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring", selected === id ? "border-primary ring-1 ring-primary" : "border-border", !inScope(id) && "border-dashed opacity-70")}>
        <span className={cn("size-2 shrink-0 rounded-full", sty.dot)} aria-hidden="true" /><span className="min-w-0 truncate">{e.epic.t}</span>
      </button>
    );
  };

  const card = (id: string, n: number, idx: number, wide?: boolean) => {
    const e = EPIC_BY_ID[id]; if (!e) return null; const st = statusOf(e.epic); const sty = styleOf(st); const scope = inScope(id);
    const o = others(id); const stepNote = chain.steps[idx]?.note; const pt = partial(id);
    return (
      <button type="button" onClick={() => onSelect(id)} aria-pressed={selected === id}
        aria-label={`Askel ${n}: ${e.epic.t}, ${e.duplo.fi}, ${sty.label}${scope ? "" : ", ei scopessa"}${pt ? `, osittain: ${pt.label}` : ""}${stepNote ? ", tarkistettava askel" : ""}`} title={pt?.names}
        style={{ width: CARD_W, height: CARD_H }}
        className={cn("relative flex shrink-0 flex-col rounded-lg border bg-card px-2.5 py-2 text-left shadow-xs transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring",
          selected === id ? "border-primary ring-2 ring-primary" : "border-border", !scope && "border-dashed opacity-70")}>
        <span className={cn("absolute inset-y-0 left-0 w-1 rounded-l-lg", sty.dot)} aria-hidden="true" />
        <span className="flex items-center justify-between gap-1 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="grid size-4 place-items-center rounded-full bg-muted font-semibold text-foreground">{n}</span>{!wide && shortDuplo(e.duplo.fi)}</span>
          <span className="flex items-center gap-1">{pt && <span className="grid size-4 place-items-center rounded-full bg-amber-100 text-amber-900"><AlertTriangle className="size-3" aria-hidden="true" /></span>}{stepNote && <CircleHelp className="size-3.5 text-muted-foreground" aria-hidden="true" />}</span>
        </span>
        <span className="mt-0.5 line-clamp-2 text-[12.5px] font-medium leading-tight">{e.epic.t}</span>
        <span className="mt-auto flex items-center justify-between gap-1 text-[10px]">
          <span className="font-mono text-muted-foreground">{id.slice(0, 9)}</span>
          {o.length > 0 ? <span className="truncate rounded bg-muted px-1">myös {o.map((x) => x.split(" ").map((w) => w[0]).join("").toUpperCase()).join(", ")}</span> : !scope ? <span>ei scopessa</span> : null}
        </span>
      </button>
    );
  };

  const steps = chain.steps.map((s) => s.epic);
  const lanes = [...new Set(steps.map((id) => EPIC_BY_ID[id]?.duplo.id).filter(Boolean))] as string[];
  const laneOf = (id: string) => lanes.indexOf(EPIC_BY_ID[id]?.duplo.id ?? "");
  const W = LABEL_W + steps.length * COL_W + 16, H = lanes.length * LANE_H;
  const cx = (i: number) => LABEL_W + i * COL_W + (COL_W - CARD_W) / 2;
  const cy = (lane: number) => lane * LANE_H + (LANE_H - CARD_H) / 2;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup type="single" variant="outline" value={chain.id} onValueChange={(v) => v && setChainId(v)} aria-label="Ketju" className="flex-wrap">
          {CHAINS.map((c) => <ToggleGroupItem key={c.id} value={c.id} className="px-3">{c.name}</ToggleGroupItem>)}
        </ToggleGroup>
        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <div className="flex gap-1"><dt className="text-muted-foreground">Askelia</dt><dd className="font-semibold tabular-nums">{chain.steps.length}</dd></div>
          {(Object.keys(counts) as StepStatus[]).map((k) => counts[k] > 0 && <div key={k} className="flex items-center gap-1"><span className={cn("size-2 rounded-full", styleOf(k).dot)} aria-hidden="true" /><dt>{styleOf(k).label}</dt><dd className="font-semibold tabular-nums">{counts[k]}</dd></div>)}
          <div className="flex gap-1"><dt className="text-muted-foreground">Ketjun työ</dt><dd className="font-semibold tabular-nums">{seller ? `${fmt(effInt)} / ${fmt(effExt)}` : fmt(effExt)} htp</dd></div>
        </dl>
      </div>
      <p className="mb-4 text-sm"><span className="font-semibold">{chain.fi}</span> <span className="text-muted-foreground">· {chain.msNote}</span></p>

      {variant === "simple" ? (
        <ol className="flex flex-wrap items-center gap-y-4" aria-label={`${chain.name}: askeleet`}>
          <li className="mr-1 flex flex-col gap-1 rounded-lg border border-dashed border-border p-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Perusta</span>
            {chain.foundation.map((id) => chip(id))}
          </li>
          {chain.steps.map((s, i) => (
            <li key={s.epic} className="flex items-center">
              <ArrowRight className="mx-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              {card(s.epic, i + 1, i)}
            </li>
          ))}
          <li className="flex items-center">
            <ArrowRight className="mx-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="flex flex-col gap-1 rounded-lg border border-dashed border-border p-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Analytiikka</span>
              {chain.analytics.map((id) => chip(id))}
            </span>
          </li>
        </ol>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5"><span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Perusta</span>{chain.foundation.map((id) => chip(id))}</div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <div className="relative" style={{ width: W, height: H }}>
              {lanes.map((d, li) => (
                <div key={d} className={cn("absolute left-0 flex items-center border-b border-border last:border-b-0", li % 2 ? "bg-muted/40" : "bg-background")} style={{ top: li * LANE_H, height: LANE_H, width: W }}>
                  <span className="w-[136px] shrink-0 px-3 text-sm font-semibold">{EPIC_BY_ID[steps.find((id) => EPIC_BY_ID[id]?.duplo.id === d) ?? ""]?.duplo.fi}</span>
                </div>
              ))}
              <svg width={W} height={H} className="pointer-events-none absolute inset-0 text-muted-foreground" aria-hidden="true">
                <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="currentColor" /></marker></defs>
                {steps.slice(0, -1).map((id, i) => {
                  const a = laneOf(id), b = laneOf(steps[i + 1]);
                  const x1 = cx(i) + CARD_W, y1 = cy(a) + CARD_H / 2, x2 = cx(i + 1) - 2, y2 = cy(b) + CARD_H / 2, xm = x1 + (COL_W - CARD_W) / 2;
                  return <path key={id + i} d={a === b ? `M${x1},${y1} H${x2}` : `M${x1},${y1} H${xm} V${y2} H${x2}`} fill="none" stroke="currentColor" strokeWidth={1.5} markerEnd="url(#arr)" />;
                })}
              </svg>
              <ol aria-label={`${chain.name}: askeleet osastoittain`}>
                {steps.map((id, i) => (
                  <li key={id} className="absolute" style={{ left: cx(i), top: cy(laneOf(id)) }}>{card(id, i + 1, i, true)}</li>
                ))}
              </ol>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5"><span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Analytiikka</span>{chain.analytics.map((id) => chip(id))}</div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-1.5 rounded-lg border border-dashed border-border p-2">
        <span className="mr-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"><CornerDownRight className="size-3.5" aria-hidden="true" />Sivupolut</span>
        {chain.side.map((id) => chip(id))}
      </div>
      {note && <p className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"><CircleHelp className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{note}</p>}
    </div>
  );
}
