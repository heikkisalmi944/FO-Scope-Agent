import { useState } from "react";
import { ArrowRight, FilePlus2, GitPullRequestArrow, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { nextId, useField, useList } from "@/lib/project-store";
import { DISC_STATUSES } from "@/lib/project-types";
import { componentOf, fiDate, targetLabel, today } from "@/lib/scope-model";
import { useConfirm } from "@/hooks/use-confirm";
import { AreaF, Attachments, ListRow, Pill, SelF, TargetPicker, TargetText, TextF, VisBadge, VisF, Workspace, type Mode } from "./shared";

export type GoFn = (view: string, id?: string) => void;


export function DiscussionsSection({ mode, initialId, go }: { mode: Mode; initialId?: string; go: GoFn }) {
  const { items, add, patch, remove } = useList("discussions");
  const tickets = useList("tickets");
  const changes = useList("changes");
  const [baselines] = useField("baselines");
  const confirm = useConfirm();
  const [status, setStatus] = useState("kaikki");
  const visible = items.filter((d) => mode === "myyja" || d.visibility === "Asiakkaalle näkyvä").sort((a, b) => b.date.localeCompare(a.date));
  const list = visible.filter((d) => status === "kaikki" || d.status === status);
  const [sel, setSel] = useState<string | undefined>(initialId ?? list[0]?.id);
  const cur = visible.find((d) => d.id === sel);
  const seller = mode === "myyja";
  const create = () => { const id = nextId("KES", items); add({ id, date: today(), title: "Uusi keskustelu", target: {}, body: "", author: "", status: "Avoin", visibility: "Sisäinen", ticketId: "", changeId: "" }); setSel(id); setStatus("kaikki"); };

  const toTicket = () => {
    if (!cur) return;
    const id = nextId("TIK", tickets.items);
    tickets.add({ id, source: "Keskustelu", sourceId: cur.id, issueType: "Story", summary: cur.title, description: cur.body, acceptance: "", target: cur.target, component: componentOf(cur.target), labels: "", htpInt: 0, htpExt: 0, priority: "Normaali", status: "Aihio", createdAt: today() });
    patch(cur.id, { ticketId: id, status: "Aihio luotu" });
    toast.success(`Tikettiaihio ${id} luotu tikettijonoon`);
  };
  const toChange = () => {
    if (!cur) return;
    const id = nextId("MUU", changes.items);
    changes.add({ id, createdAt: today(), title: cur.title, description: cur.body, reason: "", type: "Muutos", target: cur.target, requester: cur.author, status: "Luonnos", htpInt: 0, htpExt: 0, scheduleImpact: "", baselineVersion: baselines[baselines.length - 1]?.version ?? "", approverCustomer: "", approverFellowmind: "", approvedAt: "", discussionId: cur.id, ticketId: "", visibility: cur.visibility });
    patch(cur.id, { changeId: id, status: "Muutospyyntö luotu" });
    toast.success(`Muutospyyntö ${id} luotu`);
  };

  return (
    <Workspace title="Prosessikeskustelut" count={`${visible.length} keskustelua · ${visible.filter((d) => d.status === "Avoin").length} avoinna`}
      toolbar={seller && <Button onClick={create}><Plus />Uusi keskustelu</Button>}
      empty={!cur}
      list={<>
        <div className="border-b border-border p-2">
          <ToggleGroup type="single" size="sm" variant="outline" value={status} onValueChange={(v) => v && setStatus(v)} aria-label="Suodata tilan mukaan" className="flex-wrap">
            <ToggleGroupItem value="kaikki" className="px-2 text-xs">Kaikki</ToggleGroupItem>
            {DISC_STATUSES.map((s) => <ToggleGroupItem key={s} value={s} className="px-2 text-xs">{s}</ToggleGroupItem>)}
          </ToggleGroup>
        </div>
        {list.length === 0 ? <p className="p-4 text-sm">Ei keskusteluja tällä rajauksella.</p> : list.map((d) => (
          <ListRow key={d.id} active={d.id === sel} onClick={() => setSel(d.id)}>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{fiDate(d.date)} · {d.author}</span><Pill label={d.status} /></div>
            <div className="mt-0.5 font-medium">{d.title}</div>
            <div className="mt-0.5 flex items-center justify-between gap-2"><span className="truncate text-xs text-muted-foreground">{targetLabel(d.target)}</span>{seller && d.visibility === "Sisäinen" && <VisBadge v={d.visibility} />}</div>
          </ListRow>
        ))}
      </>}
      detail={cur && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0"><div className="font-mono text-xs text-muted-foreground">{cur.id}</div><h2 className="text-lg font-semibold">{cur.title}</h2><TargetText t={cur.target} /></div>
            {seller && (
              <div className="flex flex-wrap gap-2">
                {cur.ticketId ? <Button size="sm" variant="outline" onClick={() => go("t60", cur.ticketId)}>{cur.ticketId}<ArrowRight /></Button> : <Button size="sm" onClick={toTicket}><FilePlus2 />Luo Jira-aihio</Button>}
                {cur.changeId ? <Button size="sm" variant="outline" onClick={() => go("t40", cur.changeId)}>{cur.changeId}<ArrowRight /></Button> : <Button size="sm" variant="outline" onClick={toChange}><GitPullRequestArrow />Tee muutospyyntö</Button>}
                <Button size="sm" variant="ghost" aria-label="Poista keskustelu" onClick={async () => { if (await confirm({ title: "Poistetaanko keskustelu?", description: cur.id, confirmLabel: "Poista", cancelLabel: "Peruuta", destructive: true })) { remove(cur.id); setSel(undefined); } }}><Trash2 /></Button>
              </div>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="md:col-span-4"><TextF label="Aihe" id="d-title" value={cur.title} onChange={(v) => patch(cur.id, { title: v })} disabled={!seller} /></div>
            <TextF label="Päivä" id="d-date" type="date" value={cur.date} onChange={(v) => patch(cur.id, { date: v })} disabled={!seller} />
            <TextF label="Esittäjä" id="d-auth" value={cur.author} onChange={(v) => patch(cur.id, { author: v })} disabled={!seller} />
            <SelF label="Tila" id="d-status" value={cur.status} onChange={(v) => patch(cur.id, { status: v })} options={[...DISC_STATUSES]} disabled={!seller} />
            {seller && <VisF id="d-vis" value={cur.visibility} onChange={(v) => patch(cur.id, { visibility: v })} />}
          </div>
          <AreaF label="Keskustelu" id="d-body" value={cur.body} onChange={(v) => patch(cur.id, { body: v })} rows={7} disabled={!seller} />
          {seller && <div><div className="mb-1 text-xs text-muted-foreground">Prosessi</div><TargetPicker idBase="d-t" value={cur.target} onChange={(t) => patch(cur.id, { target: t })} /></div>}
          <Attachments parentType="Keskustelu" parentId={cur.id} mode={mode} />
        </div>
      )} />
  );
}
