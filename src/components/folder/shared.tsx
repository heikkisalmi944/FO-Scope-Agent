import type { ReactNode } from "react";
import { ExternalLink, FileText, Link2, Mail, Paperclip, Plus, Trash2, Video, Lock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { safeUrl } from "@/lib/safe-url";
import { ATT_KINDS, VISIBILITIES, type ParentType, type Target, type Visibility } from "@/lib/project-types";
import { DUPLOS, DUPLO_BY_ID, EPIC_BY_ID, LEGO_BY_ID, targetPath, today } from "@/lib/scope-model";
import { nextId, useList } from "@/lib/project-store";
import { DOT, STATUS_TONE, TONES, type Tone } from "@/lib/tones";

export type Mode = "myyja" | "asiakas";

export function Pill({ label, tone }: { label: string; tone?: Tone }) {
  const t = tone ?? STATUS_TONE[label] ?? "gray";
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium", TONES[t])}>
      <span className={cn("size-1.5 rounded-full", DOT[t])} aria-hidden="true" />{label}
    </span>
  );
}

export function VisBadge({ v }: { v: Visibility }) {
  return v === "Sisäinen"
    ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs"><Lock className="size-3" aria-hidden="true" />Sisäinen</span>
    : <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs"><Eye className="size-3" aria-hidden="true" />Asiakkaalle</span>;
}

export function Sel({ id, value, onChange, options, className, ariaLabel, disabled }: { id?: string; value: string; onChange: (v: string) => void; options: (string | { v: string; label: string })[]; className?: string; ariaLabel?: string; disabled?: boolean }) {
  return (
    <select id={id} aria-label={ariaLabel} disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)}
      className={cn("h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60 dark:bg-input/30", className)}>
      {options.map((o) => typeof o === "string" ? <option key={o} value={o} className="bg-[Canvas] text-[CanvasText]">{o}</option> : <option key={o.v} value={o.v} className="bg-[Canvas] text-[CanvasText]">{o.label}</option>)}
    </select>
  );
}

export function F({ label, htmlFor, children, className }: { label: string; htmlFor?: string; children: ReactNode; className?: string }) {
  return <div className={cn("min-w-0", className)}><Label htmlFor={htmlFor} className="mb-1 text-xs text-muted-foreground">{label}</Label>{children}</div>;
}
export function TextF({ label, id, value, onChange, type, disabled }: { label: string; id: string; value: string; onChange: (v: string) => void; type?: string; disabled?: boolean }) {
  return <F label={label} htmlFor={id}><Input id={id} type={type} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="h-9" /></F>;
}
export function NumF({ label, id, value, onChange, disabled }: { label: string; id: string; value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return <F label={label} htmlFor={id}><Input id={id} type="number" step="0.5" value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value) || 0)} className="h-9 text-right tabular-nums" /></F>;
}
export function AreaF({ label, id, value, onChange, rows = 4, disabled }: { label: string; id: string; value: string; onChange: (v: string) => void; rows?: number; disabled?: boolean }) {
  return <F label={label} htmlFor={id}><Textarea id={id} rows={rows} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="text-sm" /></F>;
}
export function SelF({ label, id, value, onChange, options, disabled }: { label: string; id: string; value: string; onChange: (v: string) => void; options: (string | { v: string; label: string })[]; disabled?: boolean }) {
  return <F label={label} htmlFor={id}><Sel id={id} value={value} onChange={onChange} options={options} disabled={disabled} /></F>;
}
export function VisF({ id, value, onChange, disabled }: { id: string; value: Visibility; onChange: (v: Visibility) => void; disabled?: boolean }) {
  return <SelF label="Näkyvyys" id={id} value={value} onChange={(v) => onChange(v as Visibility)} options={[...VISIBILITIES]} disabled={disabled} />;
}

/** Cascading Duplo › Lego › Epic › Function picker (Microsoft sequence IDs). */
export function TargetPicker({ idBase, value, onChange, disabled }: { idBase: string; value: Target; onChange: (t: Target) => void; disabled?: boolean }) {
  const duplo = value.duplo ?? (value.lego ? LEGO_BY_ID[value.lego]?.owner : value.epic ? EPIC_BY_ID[value.epic]?.duplo.id : "") ?? "";
  const lego = value.lego ?? (value.epic ? EPIC_BY_ID[value.epic]?.lego.id : "") ?? "";
  const legos = duplo ? DUPLO_BY_ID[duplo]?.l ?? [] : [];
  const epics = lego ? LEGO_BY_ID[lego]?.e ?? [] : [];
  const funcs = value.epic ? EPIC_BY_ID[value.epic]?.epic.f ?? [] : [];
  return (
    <fieldset className="grid gap-2 sm:grid-cols-2" disabled={disabled}>
      <legend className="sr-only">Kohde prosessikartalla</legend>
      <SelF label="Duplo" id={`${idBase}-d`} value={duplo} onChange={(v) => onChange(v ? { duplo: v } : {})} options={[{ v: "", label: "— Ei kohdistettu —" }, ...DUPLOS.map((d) => ({ v: d.id, label: `${d.fi} (${d.e2e})` }))]} />
      <SelF label="Lego" id={`${idBase}-l`} value={lego} onChange={(v) => onChange(v ? { duplo, lego: v } : { duplo })} options={[{ v: "", label: "— Koko Duplo —" }, ...legos.map((l) => ({ v: l.id, label: `${l.fi} · ${l.id.slice(0, 5)}` }))]} />
      <SelF label="Epic" id={`${idBase}-e`} value={value.epic ?? ""} onChange={(v) => onChange(v ? { duplo, lego, epic: v } : { duplo, lego })} options={[{ v: "", label: "— Koko Lego —" }, ...epics.map((e) => ({ v: e.id, label: `${e.t} · ${e.id}` }))]} />
      <SelF label="Function" id={`${idBase}-f`} value={value.func ?? ""} onChange={(v) => onChange(v ? { ...value, duplo, lego, func: v } : { duplo, lego, epic: value.epic })} options={[{ v: "", label: "— Koko Epic —" }, ...funcs.map((f) => ({ v: f.id, label: `${f.t} · ${f.id}` }))]} />
    </fieldset>
  );
}

export function TargetText({ t }: { t: Target }) {
  const p = targetPath(t);
  return p ? <span className="text-xs text-muted-foreground">{p}</span> : null;
}

const KIND_ICON: Record<string, typeof FileText> = { Dokumentti: FileText, "Teams-tallenne": Video, Litterointi: FileText, Sähköposti: Mail, Linkki: Link2 };

export function Attachments({ parentType, parentId, mode, disabled }: { parentType: ParentType; parentId: string; mode: Mode; disabled?: boolean }) {
  const { items, add, patch, remove } = useList("attachments");
  const mine = items.filter((a) => a.parentType === parentType && a.parentId === parentId && (mode === "myyja" || a.visibility === "Asiakkaalle näkyvä"));
  return (
    <section aria-labelledby={`att-${parentId}`} className="rounded-lg border border-border">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <h3 id={`att-${parentId}`} className="flex items-center gap-1.5 text-sm font-semibold"><Paperclip className="size-4" aria-hidden="true" />Liitteet ({mine.length})</h3>
        {mode === "myyja" && !disabled && (
          <Button size="sm" variant="outline" onClick={() => add({ id: nextId("LII", items), parentType, parentId, name: "Uusi liite", kind: "Dokumentti", url: "", visibility: "Sisäinen", addedAt: today() })}><Plus />Lisää liite</Button>
        )}
      </div>
      {mine.length === 0 ? <p className="px-3 py-3 text-sm">Ei liitteitä.</p> : (
        <ul className="divide-y divide-border">
          {mine.map((a) => {
            const Icon = KIND_ICON[a.kind] ?? FileText;
            const href = a.url ? safeUrl(a.url) : null;
            return (
              <li key={a.id} className="p-3">
                {mode === "myyja" && !disabled ? (
                  <div className="grid gap-2 md:grid-cols-[1.4fr_1fr_1fr_auto]">
                    <Input aria-label="Liitteen nimi" value={a.name} onChange={(e) => patch(a.id, { name: e.target.value })} className="h-8 text-sm" />
                    <Sel ariaLabel="Liitteen tyyppi" value={a.kind} onChange={(v) => patch(a.id, { kind: v })} options={[...ATT_KINDS]} className="h-8" />
                    <Sel ariaLabel="Liitteen näkyvyys" value={a.visibility} onChange={(v) => patch(a.id, { visibility: v as Visibility })} options={[...VISIBILITIES]} className="h-8" />
                    <Button size="icon-sm" variant="ghost" aria-label={`Poista liite ${a.name}`} onClick={() => remove(a.id)}><Trash2 /></Button>
                    <Input aria-label="Liitteen linkki" placeholder="https://" value={a.url} onChange={(e) => patch(a.id, { url: e.target.value })} className="h-8 text-sm md:col-span-3" />
                    {href ? <a href={href} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 self-center text-xs font-medium text-primary hover:underline">Avaa<ExternalLink className="size-3" aria-hidden="true" /></a> : <span />}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {href ? <a href={href} target="_blank" rel="noreferrer noopener" className="min-w-0 truncate font-medium text-primary hover:underline">{a.name}</a> : <span className="min-w-0 truncate">{a.name}</span>}
                    <span className="text-xs text-muted-foreground">{a.kind}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Two-pane record workspace: list on the left, editor on the right. */
export function Workspace({ title, count, toolbar, list, detail, empty }: { title: string; count: string; toolbar?: ReactNode; list: ReactNode; detail: ReactNode; empty?: boolean }) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight">{title}</h1><p className="text-sm text-muted-foreground">{count}</p></div>
        <div className="flex flex-wrap items-center gap-2">{toolbar}</div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
        <div className="rounded-xl border border-border bg-card lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">{list}</div>
        <div className="min-w-0 rounded-xl border border-border bg-card p-5">{empty ? <p className="text-sm">Ei valittua kirjausta.</p> : detail}</div>
      </div>
    </div>
  );
}

export function ListRow({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? "true" : undefined}
      className={cn("block w-full border-b border-border px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring", active && "bg-muted")}>
      {children}
    </button>
  );
}
