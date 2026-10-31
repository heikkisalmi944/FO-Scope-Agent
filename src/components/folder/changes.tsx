import { useMemo, useState } from "react";
import { ArrowRight, Check, FilePlus2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { nextId, useField, useList } from "@/lib/project-store";
import { CHANGE_STATUSES, CHANGE_TYPES } from "@/lib/project-types";
import { componentOf, fiDate, fmt, targetLabel, today } from "@/lib/scope-model";
import { useConfirm } from "@/hooks/use-confirm";
import { cn } from "@/lib/utils";
import { AreaF, Attachments, ListRow, NumF, Pill, SelF, TargetPicker, TargetText, TextF, VisF, Workspace, type Mode } from "./shared";
import type { GoFn } from "./discussions";

const FLOW = ["Luonnos", "Arvioitavana", "Asiakkaan hyväksyttävänä", "Hyväksytty", "Siirretty"];

export function ChangesSection({ mode, initialId, go }: { mode: Mode; initialId?: string; go: GoFn }) {
  const { items, add, patch, remove } = useList("changes");
  const tickets = useList("tickets");
  const [baselines] = useField("baselines");
  const confirm = useConfirm();
  const seller = mode === "myyja";
  const [status, setStatus] = useState("kaikki");
  const visible = items.filter((c) => seller || c.visibility === "Asiakkaalle näkyvä").sort((a, b) => b.id.localeCompare(a.id));
  const list = visible.filter((c) => status === "kaikki" || c.status === status);
  const [sel, setSel] = useState<string | undefined>(initialId ?? list[0]?.id);
  const cur = visible.find((c) => c.id === sel);
  const base = baselines[baselines.length - 1];

  const sums = useMemo(() => {
    const appr = items.filter((c) => c.status === "Hyväksytty" || c.status === "Siirretty");
    const pend = items.filter((c) => ["Luonnos", "Arvioitavana", "Asiakkaan hyväksyttävänä"].includes(c.status));
    const s = (arr: typeof items, k: "htpInt" | "htpExt") => arr.reduce((a, c) => a + c[k], 0);
    return { apprInt: s(appr, "htpInt"), apprExt: s(appr, "htpExt"), pendInt: s(pend, "htpInt"), pendExt: s(pend, "htpExt"), nAppr: appr.length, nPend: pend.length };
  }, [items]);

  const create = () => { const id = nextId("MUU", items); add({ id, createdAt: today(), title: "Uusi muutospyyntö", description: "", reason: "", type: "Lisäys", target: {}, requester: "", status: "Luonnos", htpInt: 0, htpExt: 0, scheduleImpact: "", baselineVersion: base?.version ?? "", approverCustomer: "", approverFellowmind: "", approvedAt: "", discussionId: "", ticketId: "", visibility: "Sisäinen" }); setSel(id); setStatus("kaikki"); };
  const toTicket = () => {
    if (!cur) return;
    const id = nextId("TIK", tickets.items);
    tickets.add({ id, source: "Muutos", sourceId: cur.id, issueType: cur.type === "Poisto" ? "Task" : "Story", summary: cur.title, description: `${cur.description}\n\nPerustelu: ${cur.reason}`, acceptance: "", target: cur.target, component: componentOf(cur.target), labels: "Muutos", htpInt: cur.htpInt, htpExt: cur.htpExt, priority: "Normaali", status: "Hyväksytty", createdAt: today() });
    patch(cur.id, { ticketId: id });
    toast.success(`Tikettiaihio ${id} luotu tikettijonoon`);
  };

  return (
    <Workspace title="Muutokset" count={`${visible.length} muutospyyntöä`}
      toolbar={seller && <Button onClick={create}><Plus />Uusi muutospyyntö</Button>}
      empty={!cur}
      list={<>
        <dl className="grid grid-cols-3 gap-px border-b border-border bg-border text-xs">
          <div className="bg-card p-3"><dt className="text-muted-foreground">Lähtötaso {base?.version ?? "–"}</dt><dd className="text-base font-semibold tabular-nums">{base ? fmt(base.totalExt) : "–"}</dd>{seller && base && <dd className="tabular-nums">sis. {fmt(base.totalInt)}</dd>}</div>
          <div className="bg-card p-3"><dt className="text-muted-foreground">Hyväksytyt ({sums.nAppr})</dt><dd className="text-base font-semibold tabular-nums">{sums.apprExt >= 0 ? "+" : ""}{fmt(sums.apprExt)}</dd>{seller && <dd className="tabular-nums">sis. {sums.apprInt >= 0 ? "+" : ""}{fmt(sums.apprInt)}</dd>}</div>
          <div className="bg-card p-3"><dt className="text-muted-foreground">Käsittelyssä ({sums.nPend})</dt><dd className="text-base font-semibold tabular-nums">{sums.pendExt >= 0 ? "+" : ""}{fmt(sums.pendExt)}</dd>{seller && <dd className="tabular-nums">sis. {sums.pendInt >= 0 ? "+" : ""}{fmt(sums.pendInt)}</dd>}</div>
        </dl>
        {base && <div className="border-b border-border px-3 py-2 text-xs">Sovittu laajuus nyt: <span className="font-semibold tabular-nums">{fmt(base.totalExt + sums.apprExt)} htp</span> (ulkoinen)</div>}
        <div className="border-b border-border p-2">
          <ToggleGroup type="single" size="sm" variant="outline" value={status} onValueChange={(v) => v && setStatus(v)} aria-label="Suodata tilan mukaan" className="flex-wrap">
            <ToggleGroupItem value="kaikki" className="px-2 text-xs">Kaikki</ToggleGroupItem>
            {CHANGE_STATUSES.map((s) => <ToggleGroupItem key={s} value={s} className="px-2 text-xs">{s}</ToggleGroupItem>)}
          </ToggleGroup>
        </div>
        {list.length === 0 ? <p className="p-4 text-sm">Ei muutospyyntöjä tällä rajauksella.</p> : list.map((c) => (
          <ListRow key={c.id} active={c.id === sel} onClick={() => setSel(c.id)}>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span className="font-mono">{c.id} · {c.type}</span><Pill label={c.status} /></div>
            <div className="mt-0.5 font-medium">{c.title}</div>
            <div className="mt-0.5 flex justify-between gap-2 text-xs"><span className="truncate text-muted-foreground">{targetLabel(c.target)}</span><span className="shrink-0 tabular-nums">{c.htpExt >= 0 ? "+" : ""}{fmt(c.htpExt)} htp</span></div>
          </ListRow>
        ))}
      </>}
      detail={cur && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0"><div className="font-mono text-xs text-muted-foreground">{cur.id} · luotu {fiDate(cur.createdAt)}{cur.baselineVersion ? ` · lähtötaso ${cur.baselineVersion}` : ""}</div><h2 className="text-lg font-semibold">{cur.title}</h2><TargetText t={cur.target} /></div>
            <div className="flex flex-wrap gap-2">
              {cur.discussionId && <Button size="sm" variant="outline" onClick={() => go("t30", cur.discussionId)}>{cur.discussionId}<ArrowRight /></Button>}
              {seller && (cur.ticketId ? <Button size="sm" variant="outline" onClick={() => go("t60", cur.ticketId)}>{cur.ticketId}<ArrowRight /></Button> : <Button size="sm" disabled={cur.status !== "Hyväksytty"} onClick={toTicket}><FilePlus2 />Luo tikettiaihio</Button>)}
              {seller && <Button size="sm" variant="ghost" aria-label="Poista muutospyyntö" onClick={async () => { if (await confirm({ title: "Poistetaanko muutospyyntö?", description: cur.id, confirmLabel: "Poista", cancelLabel: "Peruuta", destructive: true })) { remove(cur.id); setSel(undefined); } }}><Trash2 /></Button>}
            </div>
          </div>

          <ol className="flex flex-wrap items-center gap-1" aria-label="Muutospyynnön käsittely">
            {FLOW.map((s, i) => {
              const idx = FLOW.indexOf(cur.status); const done = idx >= 0 && i < idx; const now = cur.status === s;
              return (
                <li key={s} className="flex items-center gap-1">
                  <span aria-current={now ? "step" : undefined} className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs", now ? "border-primary bg-primary text-primary-foreground" : done ? "border-border bg-muted" : "border-dashed border-border")}>{done && <Check className="size-3" aria-hidden="true" />}{s}</span>
                  {i < FLOW.length - 1 && <span className="h-px w-3 bg-border" aria-hidden="true" />}
                </li>
              );
            })}
            {cur.status === "Hylätty" && <li><Pill label="Hylätty" /></li>}
          </ol>

          {!seller && cur.status === "Asiakkaan hyväksyttävänä" && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
              <span className="flex-1">Muutos odottaa hyväksyntäänne: {fmt(cur.htpExt)} htp · {cur.scheduleImpact || "ei aikatauluvaikutusta"}</span>
              <Button size="sm" className="bg-green-700 text-white hover:bg-green-800" onClick={() => patch(cur.id, { status: "Hyväksytty", approvedAt: today() })}><Check />Hyväksy</Button>
              <Button size="sm" variant="outline" onClick={() => patch(cur.id, { status: "Hylätty" })}><X />Hylkää</Button>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-4">
            <div className="md:col-span-4"><TextF label="Otsikko" id="c-title" value={cur.title} onChange={(v) => patch(cur.id, { title: v })} disabled={!seller} /></div>
            <SelF label="Tyyppi" id="c-type" value={cur.type} onChange={(v) => patch(cur.id, { type: v })} options={[...CHANGE_TYPES]} disabled={!seller} />
            <SelF label="Tila" id="c-status" value={cur.status} onChange={(v) => patch(cur.id, { status: v, approvedAt: v === "Hyväksytty" && !cur.approvedAt ? today() : cur.approvedAt })} options={[...CHANGE_STATUSES]} disabled={!seller} />
            <TextF label="Pyytäjä" id="c-req" value={cur.requester} onChange={(v) => patch(cur.id, { requester: v })} disabled={!seller} />
            <SelF label="Lähtötaso" id="c-base" value={cur.baselineVersion} onChange={(v) => patch(cur.id, { baselineVersion: v })} options={[{ v: "", label: "—" }, ...baselines.map((b) => ({ v: b.version, label: b.version }))]} disabled={!seller} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <AreaF label="Kuvaus" id="c-desc" value={cur.description} onChange={(v) => patch(cur.id, { description: v })} rows={5} disabled={!seller} />
            <AreaF label="Perustelu" id="c-reason" value={cur.reason} onChange={(v) => patch(cur.id, { reason: v })} rows={5} disabled={!seller} />
          </div>
          <section aria-labelledby="c-imp" className="rounded-lg border border-border p-4">
            <h3 id="c-imp" className="mb-3 text-sm font-semibold">Vaikutus ja hyväksyntä</h3>
            <div className="grid gap-3 md:grid-cols-4">
              {seller && <NumF label="Htp sisäinen" id="c-hi" value={cur.htpInt} onChange={(v) => patch(cur.id, { htpInt: v })} />}
              <NumF label={seller ? "Htp ulkoinen" : "Työmäärä (htp)"} id="c-he" value={cur.htpExt} onChange={(v) => patch(cur.id, { htpExt: v })} disabled={!seller} />
              <div className={seller ? "md:col-span-2" : "md:col-span-3"}><TextF label="Aikatauluvaikutus" id="c-sch" value={cur.scheduleImpact} onChange={(v) => patch(cur.id, { scheduleImpact: v })} disabled={!seller} /></div>
              <TextF label="Hyväksyjä (asiakas)" id="c-ac" value={cur.approverCustomer} onChange={(v) => patch(cur.id, { approverCustomer: v })} disabled={!seller} />
              <TextF label="Hyväksyjä (Fellowmind)" id="c-af" value={cur.approverFellowmind} onChange={(v) => patch(cur.id, { approverFellowmind: v })} disabled={!seller} />
              <TextF label="Hyväksytty" id="c-at" type="date" value={cur.approvedAt} onChange={(v) => patch(cur.id, { approvedAt: v })} disabled={!seller} />
              {seller && <VisF id="c-vis" value={cur.visibility} onChange={(v) => patch(cur.id, { visibility: v })} />}
            </div>
          </section>
          {seller && <div><div className="mb-1 text-xs text-muted-foreground">Kohde prosessikartalla</div><TargetPicker idBase="c-t" value={cur.target} onChange={(t) => patch(cur.id, { target: t })} /></div>}
          <Attachments parentType="Muutos" parentId={cur.id} mode={mode} />
        </div>
      )} />
  );
}
