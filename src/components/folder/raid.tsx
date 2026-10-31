import { Fragment, useState } from "react";
import { FilePlus2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { nextId, useList } from "@/lib/project-store";
import { LEVELS, RAID_STATUSES, RAID_TYPES } from "@/lib/project-types";
import { componentOf, fiDate, targetLabel, today } from "@/lib/scope-model";
import { useConfirm } from "@/hooks/use-confirm";
import { cn } from "@/lib/utils";
import { AreaF, Attachments, ListRow, Pill, SelF, TargetPicker, TargetText, TextF, VisF, Workspace, type Mode } from "./shared";

const CELL: Record<string, string> = { "0": "bg-green-50 dark:bg-green-950", "1": "bg-amber-50 dark:bg-amber-950", "2": "bg-red-50 dark:bg-red-950" };

export function RaidSection({ mode, initialId }: { mode: Mode; initialId?: string }) {
  const { items, add, patch, remove } = useList("raid");
  const tickets = useList("tickets");
  const confirm = useConfirm();
  const seller = mode === "myyja";
  const [type, setType] = useState("kaikki");
  const [cell, setCell] = useState<string | null>(null);
  const visible = items.filter((r) => seller || r.visibility === "Asiakkaalle näkyvä");
  const list = visible.filter((r) => (type === "kaikki" || r.type === type) && (!cell || (r.type === "Riski" && `${r.probability}|${r.impact}` === cell)));
  const [sel, setSel] = useState<string | undefined>(initialId ?? list[0]?.id);
  const cur = visible.find((r) => r.id === sel);
  const risks = visible.filter((r) => r.type === "Riski" && r.status !== "Suljettu");
  const create = (t: string) => { const id = nextId("RAID", items); add({ id, type: t, title: `Uusi: ${t.toLowerCase()}`, description: "", target: {}, owner: "", probability: t === "Riski" ? "Keskitaso" : "", impact: "Keskitaso", status: "Avoin", dueDate: "", mitigation: "", inOffer: t === "Oletus" || t === "Riippuvuus", visibility: "Sisäinen" }); setSel(id); setType("kaikki"); setCell(null); };
  const toTicket = () => {
    if (!cur) return;
    const id = nextId("TIK", tickets.items);
    tickets.add({ id, source: "RAID", sourceId: cur.id, issueType: "Task", summary: cur.title, description: `${cur.description}\n\nToimenpide: ${cur.mitigation}`, acceptance: "", target: cur.target, component: componentOf(cur.target), labels: cur.type.replace(/\s+/g, "_"), htpInt: 0, htpExt: 0, priority: cur.impact === "Korkea" ? "Korkea" : "Normaali", status: "Aihio", createdAt: today() });
    toast.success(`Tikettiaihio ${id} luotu tikettijonoon`);
  };

  return (
    <Workspace title="RAID" count={`${visible.filter((r) => r.status !== "Suljettu").length} avointa · ${visible.filter((r) => r.inOffer).length} tarjouksessa`}
      toolbar={seller && RAID_TYPES.map((t) => <Button key={t} size="sm" variant="outline" onClick={() => create(t)}><Plus />{t}</Button>)}
      empty={!cur}
      list={<>
        <figure className="border-b border-border p-3" aria-labelledby="matrix-cap">
          <figcaption id="matrix-cap" className="mb-2 flex justify-between text-xs"><span className="font-semibold">Riskimatriisi</span><span className="text-muted-foreground">{risks.length} avointa riskiä</span></figcaption>
          <div className="grid grid-cols-[auto_repeat(3,1fr)] gap-1 text-[11px]">
            <span />{LEVELS.map((l) => <span key={l} className="text-center text-muted-foreground">{l}</span>)}
            {[...LEVELS].reverse().map((p, pi) => (<Fragment key={p}>
              <span className="self-center pr-1 text-right text-muted-foreground">{p}</span>
              {LEVELS.map((im, ii) => {
                const key = `${p}|${im}`; const n = risks.filter((r) => `${r.probability}|${r.impact}` === key).length;
                const sev = String(Math.min(2, Math.floor(((2 - pi) + ii) / 2)));
                return (
                  <button key={key} type="button" aria-pressed={cell === key} aria-label={`Todennäköisyys ${p}, vaikutus ${im}: ${n} riskiä`} onClick={() => setCell(cell === key ? null : key)}
                    className={cn("h-9 rounded border border-border text-sm font-semibold tabular-nums focus-visible:outline-2 focus-visible:outline-ring", CELL[sev], cell === key && "ring-2 ring-primary")}>{n || ""}</button>
                );
              })}
            </Fragment>))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>↑ Todennäköisyys</span><span>Vaikutus →</span></div>
        </figure>
        <div className="border-b border-border p-2">
          <ToggleGroup type="single" size="sm" variant="outline" value={type} onValueChange={(v) => { if (v) { setType(v); setCell(null); } }} aria-label="Suodata tyypin mukaan" className="flex-wrap">
            <ToggleGroupItem value="kaikki" className="px-2 text-xs">Kaikki</ToggleGroupItem>
            {RAID_TYPES.map((t) => <ToggleGroupItem key={t} value={t} className="px-2 text-xs">{t}</ToggleGroupItem>)}
          </ToggleGroup>
        </div>
        {list.length === 0 ? <p className="p-4 text-sm">Ei kirjauksia tällä rajauksella.</p> : list.map((r) => (
          <ListRow key={r.id} active={r.id === sel} onClick={() => setSel(r.id)}>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span className="font-mono">{r.id} · {r.type}</span><Pill label={r.status} /></div>
            <div className="mt-0.5 font-medium">{r.title}</div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">{r.impact && <span>Vaikutus: {r.impact}</span>}{r.inOffer && <span className="rounded border border-border px-1.5">Tarjouksessa</span>}{r.dueDate && <span>DL {fiDate(r.dueDate)}</span>}</div>
          </ListRow>
        ))}
      </>}
      detail={cur && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0"><div className="font-mono text-xs text-muted-foreground">{cur.id} · {cur.type}</div><h2 className="text-lg font-semibold">{cur.title}</h2><TargetText t={cur.target} /></div>
            {seller && <div className="flex gap-2"><Button size="sm" variant="outline" onClick={toTicket}><FilePlus2 />Luo tikettiaihio</Button><Button size="sm" variant="ghost" aria-label="Poista kirjaus" onClick={async () => { if (await confirm({ title: "Poistetaanko kirjaus?", description: cur.id, confirmLabel: "Poista", cancelLabel: "Peruuta", destructive: true })) { remove(cur.id); setSel(undefined); } }}><Trash2 /></Button></div>}
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="md:col-span-4"><TextF label="Otsikko" id="r-title" value={cur.title} onChange={(v) => patch(cur.id, { title: v })} disabled={!seller} /></div>
            <SelF label="Tyyppi" id="r-type" value={cur.type} onChange={(v) => patch(cur.id, { type: v })} options={[...RAID_TYPES]} disabled={!seller} />
            <SelF label="Tila" id="r-status" value={cur.status} onChange={(v) => patch(cur.id, { status: v })} options={[...RAID_STATUSES]} disabled={!seller} />
            {cur.type === "Riski" && <SelF label="Todennäköisyys" id="r-prob" value={cur.probability} onChange={(v) => patch(cur.id, { probability: v })} options={["", ...LEVELS]} disabled={!seller} />}
            <SelF label="Vaikutus" id="r-imp" value={cur.impact} onChange={(v) => patch(cur.id, { impact: v })} options={["", ...LEVELS]} disabled={!seller} />
            <TextF label="Vastuuhenkilö" id="r-owner" value={cur.owner} onChange={(v) => patch(cur.id, { owner: v })} disabled={!seller} />
            <TextF label="Määräpäivä" id="r-due" type="date" value={cur.dueDate} onChange={(v) => patch(cur.id, { dueDate: v })} disabled={!seller} />
            {seller && <VisF id="r-vis" value={cur.visibility} onChange={(v) => patch(cur.id, { visibility: v })} />}
            {seller && <div className="flex items-end gap-2 pb-2"><Checkbox id="r-offer" checked={cur.inOffer} onCheckedChange={(v) => patch(cur.id, { inOffer: v === true })} /><Label htmlFor="r-offer" className="text-sm font-normal">Näytä tarjouksessa</Label></div>}
          </div>
          <AreaF label="Kuvaus" id="r-desc" value={cur.description} onChange={(v) => patch(cur.id, { description: v })} rows={4} disabled={!seller} />
          <AreaF label={cur.type === "Riski" ? "Hallintatoimenpide" : "Toimenpide"} id="r-mit" value={cur.mitigation} onChange={(v) => patch(cur.id, { mitigation: v })} rows={3} disabled={!seller} />
          {seller && <div><div className="mb-1 text-xs text-muted-foreground">Kohde prosessikartalla</div><TargetPicker idBase="r-t" value={cur.target} onChange={(t) => patch(cur.id, { target: t })} /></div>}
          {!seller && cur.target && <p className="text-xs">{targetLabel(cur.target)}</p>}
          <Attachments parentType="RAID" parentId={cur.id} mode={mode} />
        </div>
      )} />
  );
}
