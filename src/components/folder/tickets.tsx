import { useState } from "react";
import * as XLSX from "xlsx";
import { ArrowRight, FileSpreadsheet, Layers, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { nextId, useList, useProject } from "@/lib/project-store";
import { LEVELS, TICKET_STATUSES, type Ticket } from "@/lib/project-types";
import { computeModel, fmt, targetLabel, today } from "@/lib/scope-model";
import { useConfirm } from "@/hooks/use-confirm";
import { cn } from "@/lib/utils";
import { AreaF, NumF, Pill, SelF, TargetPicker, TextF } from "./shared";
import type { GoFn } from "./discussions";

const SRC_VIEW: Record<string, string> = { Keskustelu: "t30", Muutos: "t40", RAID: "t50" };

export function TicketsSection({ initialId, go }: { initialId?: string; go: GoFn }) {
  const { items, add, patch, remove } = useList("tickets");
  const project = useProject();
  const confirm = useConfirm();
  const [sel, setSel] = useState<string | undefined>(initialId);
  const cur = items.find((t) => t.id === sel);

  const fromScope = () => {
    const m = computeModel(project);
    const have = new Set(items.filter((t) => t.source === "Scope").map((t) => t.sourceId));
    let n = 0; let list = items;
    for (const i of m.included) {
      if (have.has(i.epic.id)) continue;
      const id = nextId("TIK", list);
      const t: Ticket = { id, source: "Scope", sourceId: i.epic.id, issueType: "Epic", summary: i.epic.t, description: i.epic.d, acceptance: "", target: { duplo: i.duplo.id, lego: i.lego.id, epic: i.epic.id }, component: i.duplo.fi, labels: i.lego.fi.replace(/\s+/g, "_"), htpInt: +i.totalInt.toFixed(1), htpExt: +i.totalExt.toFixed(1), priority: "Normaali", status: "Aihio", createdAt: today() };
      list = [...list, t]; add(t); n++;
    }
    for (const r of m.mods.filter((x) => x.included)) {
      if (have.has(r.mod.id)) continue;
      const id = nextId("TIK", list);
      const t: Ticket = { id, source: "Scope", sourceId: r.mod.id, issueType: "Epic", summary: r.mod.name, description: `${r.mod.desc}${r.mod.outputs ? `\n\nTuotokset: ${r.mod.outputs}` : ""}`, acceptance: "", target: {}, component: "Moduulit", labels: r.mod.phase.replace(/\s+/g, "_"), htpInt: +r.totalInt.toFixed(1), htpExt: +r.totalExt.toFixed(1), priority: "Normaali", status: "Aihio", createdAt: today() };
      list = [...list, t]; add(t); n++;
    }
    toast.success(n ? `${n} Epic-aihiota muodostettu scopesta` : "Kaikilla scopen Epiceillä on jo aihio");
  };
  const exportJira = () => {
    const ready = items.filter((t) => t.status === "Hyväksytty");
    if (!ready.length) { toast.error("Ei hyväksyttyjä aihioita vietäväksi"); return; }
    const rows = ready.map((t) => ({ "Issue Type": t.issueType, Summary: t.summary, Description: `${t.description}${t.acceptance ? `\n\nAcceptance criteria:\n${t.acceptance}` : ""}`, Component: t.component, Labels: [t.labels, t.source].filter(Boolean).join(" "), Priority: t.priority === "Korkea" ? "High" : t.priority === "Matala" ? "Low" : "Medium", "Original Estimate (htp)": t.htpInt, "External ID": t.id, "Source": `${t.source} ${t.sourceId}` }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Jira");
    XLSX.writeFile(wb, `Jira_import_${project.name.replace(/[^\p{L}\p{N}]+/gu, "_")}.csv`, { bookType: "csv" });
    ready.forEach((t) => patch(t.id, { status: "Siirretty Jiraan" }));
    toast.success(`${ready.length} tikettiä viety Jira-tuontitiedostoon`);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight">Tikettijono</h1><p className="text-sm text-muted-foreground">{items.length} aihiota · {items.filter((t) => t.status === "Hyväksytty").length} hyväksytty viennille · {fmt(items.reduce((a, t) => a + t.htpInt, 0))} htp sisäinen</p></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={fromScope}><Layers />Muodosta scopesta</Button>
          <Button variant="outline" onClick={() => { const id = nextId("TIK", items); add({ id, source: "Käsin", sourceId: "", issueType: "Story", summary: "Uusi aihio", description: "", acceptance: "", target: {}, component: "", labels: "", htpInt: 0, htpExt: 0, priority: "Normaali", status: "Aihio", createdAt: today() }); setSel(id); }}><Plus />Uusi aihio</Button>
          <Button onClick={exportJira}><FileSpreadsheet />Vie hyväksytyt Jiraan (CSV)</Button>
        </div>
      </div>
      <div className="grid gap-3 overflow-x-auto pb-2 md:grid-cols-5" role="list" aria-label="Tikettijono tiloittain">
        {TICKET_STATUSES.map((s) => {
          const col = items.filter((t) => t.status === s);
          return (
            <section key={s} role="listitem" aria-labelledby={`lane-${s}`} className="min-w-52 rounded-xl border border-border bg-muted/40">
              <h2 id={`lane-${s}`} className="flex items-center justify-between px-3 py-2 text-sm font-semibold"><Pill label={s} /><span className="tabular-nums text-muted-foreground">{col.length}</span></h2>
              <ul className="max-h-[52vh] space-y-2 overflow-y-auto px-2 pb-2">
                {col.map((t) => (
                  <li key={t.id}>
                    <button type="button" onClick={() => setSel(t.id)} aria-current={sel === t.id ? "true" : undefined}
                      className={cn("w-full rounded-md border bg-card p-2.5 text-left hover:shadow-sm focus-visible:outline-2 focus-visible:outline-ring", sel === t.id ? "border-primary ring-1 ring-primary" : "border-border")}>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground"><span className="font-mono">{t.id} · {t.issueType}</span><span>{t.source}</span></div>
                      <div className="mt-0.5 text-sm font-medium leading-snug">{t.summary}</div>
                      <div className="mt-1 flex justify-between gap-2 text-[11px]"><span className="truncate">{t.component || targetLabel(t.target)}</span><span className="shrink-0 tabular-nums">{fmt(t.htpInt)} / {fmt(t.htpExt)}</span></div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      {cur && (
        <section aria-labelledby="tik-ed" className="mt-5 rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div><div className="font-mono text-xs text-muted-foreground">{cur.id} · lähde {cur.source} {cur.sourceId}</div><h2 id="tik-ed" className="text-lg font-semibold">{cur.summary}</h2></div>
            <div className="flex gap-2">
              {SRC_VIEW[cur.source] && cur.sourceId && <Button size="sm" variant="outline" onClick={() => go(SRC_VIEW[cur.source], cur.sourceId)}>{cur.sourceId}<ArrowRight /></Button>}
              <Button size="sm" variant="ghost" aria-label="Poista aihio" onClick={async () => { if (await confirm({ title: "Poistetaanko aihio?", description: cur.id, confirmLabel: "Poista", cancelLabel: "Peruuta", destructive: true })) { remove(cur.id); setSel(undefined); } }}><Trash2 /></Button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-6">
            <div className="md:col-span-6"><TextF label="Yhteenveto (Summary)" id="t-sum" value={cur.summary} onChange={(v) => patch(cur.id, { summary: v })} /></div>
            <SelF label="Jira-tyyppi" id="t-type" value={cur.issueType} onChange={(v) => patch(cur.id, { issueType: v as Ticket["issueType"] })} options={["Epic", "Story", "Task"]} />
            <SelF label="Tila" id="t-status" value={cur.status} onChange={(v) => patch(cur.id, { status: v })} options={[...TICKET_STATUSES]} />
            <SelF label="Prioriteetti" id="t-prio" value={cur.priority} onChange={(v) => patch(cur.id, { priority: v })} options={[...LEVELS.map((l) => l === "Keskitaso" ? "Normaali" : l)]} />
            <TextF label="Komponentti" id="t-comp" value={cur.component} onChange={(v) => patch(cur.id, { component: v })} />
            <NumF label="Htp sisäinen" id="t-hi" value={cur.htpInt} onChange={(v) => patch(cur.id, { htpInt: v })} />
            <NumF label="Htp ulkoinen" id="t-he" value={cur.htpExt} onChange={(v) => patch(cur.id, { htpExt: v })} />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <AreaF label="Kuvaus" id="t-desc" value={cur.description} onChange={(v) => patch(cur.id, { description: v })} rows={5} />
            <AreaF label="Hyväksymiskriteerit" id="t-acc" value={cur.acceptance} onChange={(v) => patch(cur.id, { acceptance: v })} rows={5} />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_2fr]">
            <TextF label="Tunnisteet (Labels)" id="t-lab" value={cur.labels} onChange={(v) => patch(cur.id, { labels: v })} />
            <div><div className="mb-1 text-xs text-muted-foreground">Kohde prosessikartalla</div><TargetPicker idBase="t-t" value={cur.target} onChange={(t) => patch(cur.id, { target: t })} /></div>
          </div>
        </section>
      )}
    </div>
  );
}
