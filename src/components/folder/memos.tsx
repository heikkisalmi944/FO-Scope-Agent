import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { nextId, useList } from "@/lib/project-store";
import { MEMO_PHASES, MEMO_TYPES } from "@/lib/project-types";
import { fiDate, today } from "@/lib/scope-model";
import { useConfirm } from "@/hooks/use-confirm";
import { AreaF, Attachments, ListRow, SelF, TargetPicker, TargetText, TextF, VisBadge, VisF, Workspace, type Mode } from "./shared";

export function MemosSection({ mode, initialId }: { mode: Mode; initialId?: string }) {
  const { items, add, patch, remove } = useList("memos");
  const atts = useList("attachments");
  const confirm = useConfirm();
  const [phase, setPhase] = useState<string>("kaikki");
  const visible = items.filter((m) => mode === "myyja" || m.visibility === "Asiakkaalle näkyvä").sort((a, b) => b.date.localeCompare(a.date));
  const list = visible.filter((m) => phase === "kaikki" || m.phase === phase);
  const [sel, setSel] = useState<string | undefined>(initialId ?? list[0]?.id);
  const cur = visible.find((m) => m.id === sel);
  const seller = mode === "myyja";
  const create = () => { const id = nextId("MUI", items); add({ id, date: today(), title: "Uusi muistio", phase: "Scope-työpaja", type: "Palaveri", visibility: "Sisäinen", participants: "", body: "", target: {}, source: "Käsin" }); setSel(id); setPhase("kaikki"); };

  return (
    <Workspace title="Muistiot" count={`${visible.length} muistiota · ${atts.items.filter((a) => a.parentType === "Muistio").length} liitettä`}
      toolbar={seller && <Button onClick={create}><Plus />Uusi muistio</Button>}
      empty={!cur}
      list={<>
        <div className="border-b border-border p-2">
          <ToggleGroup type="single" size="sm" variant="outline" value={phase} onValueChange={(v) => v && setPhase(v)} aria-label="Suodata vaiheen mukaan" className="flex-wrap">
            <ToggleGroupItem value="kaikki" className="px-2 text-xs">Kaikki</ToggleGroupItem>
            {MEMO_PHASES.filter((p) => visible.some((m) => m.phase === p)).map((p) => <ToggleGroupItem key={p} value={p} className="px-2 text-xs">{p}</ToggleGroupItem>)}
          </ToggleGroup>
        </div>
        {list.length === 0 ? <p className="p-4 text-sm">Ei muistioita tällä rajauksella.</p> : list.map((m) => (
          <ListRow key={m.id} active={m.id === sel} onClick={() => setSel(m.id)}>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{fiDate(m.date)} · {m.type}</span>{seller && <VisBadge v={m.visibility} />}</div>
            <div className="mt-0.5 font-medium">{m.title}</div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs"><span className="rounded border border-border px-1.5">{m.phase}</span>{atts.items.some((a) => a.parentId === m.id) && <span>{atts.items.filter((a) => a.parentId === m.id).length} liitettä</span>}</div>
          </ListRow>
        ))}
      </>}
      detail={cur && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div><div className="font-mono text-xs text-muted-foreground">{cur.id} · lähde: {cur.source}</div><h2 className="text-lg font-semibold">{cur.title}</h2><TargetText t={cur.target} /></div>
            {seller && <Button size="sm" variant="ghost" onClick={async () => { if (await confirm({ title: "Poistetaanko muistio?", description: `${cur.id} ja sen liitteet poistetaan projektista.`, confirmLabel: "Poista", cancelLabel: "Peruuta", destructive: true })) { atts.items.filter((a) => a.parentId === cur.id).forEach((a) => atts.remove(a.id)); remove(cur.id); setSel(undefined); } }}><Trash2 />Poista</Button>}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-3"><TextF label="Otsikko" id="m-title" value={cur.title} onChange={(v) => patch(cur.id, { title: v })} disabled={!seller} /></div>
            <TextF label="Päivä" id="m-date" type="date" value={cur.date} onChange={(v) => patch(cur.id, { date: v })} disabled={!seller} />
            <SelF label="Vaihe" id="m-phase" value={cur.phase} onChange={(v) => patch(cur.id, { phase: v })} options={[...MEMO_PHASES]} disabled={!seller} />
            <SelF label="Tyyppi" id="m-type" value={cur.type} onChange={(v) => patch(cur.id, { type: v })} options={[...MEMO_TYPES]} disabled={!seller} />
            <div className="md:col-span-2"><TextF label="Osallistujat" id="m-part" value={cur.participants} onChange={(v) => patch(cur.id, { participants: v })} disabled={!seller} /></div>
            {seller && <VisF id="m-vis" value={cur.visibility} onChange={(v) => patch(cur.id, { visibility: v })} />}
          </div>
          <AreaF label="Muistio" id="m-body" value={cur.body} onChange={(v) => patch(cur.id, { body: v })} rows={8} disabled={!seller} />
          {seller && <div><div className="mb-1 text-xs text-muted-foreground">Kohdistus prosessikartalle</div><TargetPicker idBase="m-t" value={cur.target} onChange={(t) => patch(cur.id, { target: t })} /></div>}
          <Attachments parentType="Muistio" parentId={cur.id} mode={mode} />
        </div>
      )} />
  );
}
