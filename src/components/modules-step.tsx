import { useState } from "react";
import { Check, ChevronDown, CircleDot, Plus, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useConfirm } from "@/hooks/use-confirm";
import { cn } from "@/lib/utils";
import { useField, useProject } from "@/lib/project-store";
import { MODULE_DRIVERS, MODULE_PHASES, type Decision, type ModuleDef, type ModuleDriver } from "@/lib/project-types";
import { PARAMS, fmt, moduleTrig, type ScopeModel } from "@/lib/scope-model";
import { AreaF, Sel, SelF, TextF, type Mode } from "@/components/folder/shared";

type St = "sisaltyy" | "valittu" | "avoin" | "eisisally";
const ST: Record<St, { label: string; cls: string; dot: string }> = {
  sisaltyy: { label: "Sisältyy", cls: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800", dot: "bg-blue-700" },
  valittu: { label: "Optio – valittu", cls: "bg-green-50 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-800", dot: "bg-green-700" },
  avoin: { label: "Optio – avoin", cls: "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800", dot: "bg-amber-500" },
  eisisally: { label: "Ei sisälly", cls: "bg-muted text-foreground border-border", dot: "bg-zinc-400" },
};
const DRIVER_LABEL: Record<ModuleDriver, string> = { kiinteä: "Kiinteä", yhtiöt: "Yhtiöiden mukaan", maat: "Maiden mukaan", määrä: "Määrän mukaan", prosentti: "% muusta työstä" };

export function ModulesStep({ mode, model }: { mode: Mode; model: ScopeModel }) {
  const project = useProject();
  const [modules, setModules] = useField("modules");
  const [decisions, setDecisions] = useField("decisions");
  const [scopeOverride, setScopeOverride] = useField("scopeOverride");
  const [corrInt, setCorrInt] = useField("corrInt");
  const [corrExt, setCorrExt] = useField("corrExt");
  const confirm = useConfirm();
  const [openId, setOpenId] = useState<string | null>(null);
  const seller = mode === "myyja";
  const res = Object.fromEntries(model.mods.map((r) => [r.mod.id, r]));
  const patch = (id: string, ch: Partial<ModuleDef>) => setModules((ms) => ms.map((m) => (m.id === id ? { ...m, ...ch } : m)));
  const choice = (id: string) => decisions[id]?.choice ?? "avoin";
  const setChoice = (id: string, c: Decision["choice"]) => setDecisions((p) => ({ ...p, [id]: { ...(p[id] ?? { reason: "", owner: "", pros: "", cons: "" }), choice: c } }));
  const status = (m: ModuleDef): St => { const r = res[m.id]; if (!r?.isOpt) return "sisaltyy"; const c = choice(m.id); return c === "valitaan" ? "valittu" : c === "eivalita" ? "eisisally" : "avoin"; };
  const htp = (i: number, e: number) => (seller ? `${fmt(i)} / ${fmt(e)}` : fmt(e));
  const addModule = (phase: string) => {
    const n = modules.reduce((a, m) => Math.max(a, Number(m.id.replace(/\D/g, "")) || 0), 0) + 1;
    const id = `M${String(n).padStart(2, "0")}`;
    setModules((ms) => [...ms, { id, phase, name: "Uusi moduuli", desc: "", outputs: "", base: 5, driver: "kiinteä", unitLabel: "", unitRate: 0, units: null, pct: 0, scope: "O", trigger: "", custom: true }]);
    setOpenId(id);
  };
  const inc = model.mods.filter((r) => r.included);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Moduulit</h1>
          <p className="text-sm text-muted-foreground">{inc.length}/{modules.length} moduulia mukana · {model.modOpen.length} optiota avoinna · {project.customer.name}</p>
        </div>
        <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border text-right">
          {[["Moduulit", htp(model.modulesInt, model.modulesExt)], ["Prosessikartta", htp(model.processInt, model.processExt)], ["Yhteensä", htp(model.totalInt, model.totalExt)]].map(([k, v]) => (
            <div key={k} className="bg-card px-4 py-2"><dt className="text-xs text-muted-foreground">{k}{seller ? " (sis. / ulk.)" : ""}</dt><dd className="font-semibold tabular-nums">{v} htp</dd></div>
          ))}
        </dl>
      </div>

      <figure aria-labelledby="mod-cap" className="relative mb-2">
        <figcaption id="mod-cap" className="sr-only">Moduulit toteutuksen vaiheittain</figcaption>
        <ol className="mb-3 grid grid-cols-2 gap-2 xl:grid-cols-4" aria-label="Toteutuksen vaiheet">
          {MODULE_PHASES.map((ph, i) => {
            const rows = model.mods.filter((r) => r.mod.phase === ph && r.included);
            return (
              <li key={ph} className="relative flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{ph}</span>
                <span className="shrink-0 text-xs tabular-nums">{fmt(rows.reduce((a, r) => a + (seller ? r.totalInt : r.totalExt), 0))} htp</span>
              </li>
            );
          })}
        </ol>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {MODULE_PHASES.map((ph) => (
            <section key={ph} aria-label={ph} className="flex flex-col gap-2">
              {modules.filter((m) => m.phase === ph).map((m) => {
                const r = res[m.id]; const st = status(m); const trig = moduleTrig(m, project.params);
                const formula = m.driver === "prosentti" ? `${m.pct} % prosessikartan ja muiden moduulien työstä` : m.driver === "kiinteä" ? "Kiinteä työmäärä" : `${m.base ? `${fmt(m.base)} + ` : ""}${r?.units ?? 0} × ${fmt(m.unitRate)} htp / ${m.unitLabel || "yksikkö"}`;
                return (
                  <article key={m.id} className={cn("rounded-lg border bg-card p-3 transition-colors", st === "eisisally" ? "border-dashed border-border opacity-80" : "border-border", openId === m.id && "ring-1 ring-primary")}>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="min-w-0 font-semibold leading-snug"><span className="mr-1.5 font-mono text-xs text-muted-foreground">{m.id}</span>{m.name}</h3>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">{r ? (seller ? fmt(r.included ? r.totalInt : r.effInt) : fmt(r.included ? r.totalExt : r.effExt)) : 0} <span className="text-xs font-normal">htp</span></span>
                    </div>
                    {m.desc && <p className="mt-1 text-sm">{m.desc}</p>}
                    {m.outputs && <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">Tuotokset: {m.outputs}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{formula}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium", ST[st].cls)}><span className={cn("size-1.5 rounded-full", ST[st].dot)} aria-hidden="true" />{ST[st].label}</span>
                      {trig && <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs"><Sparkles className="size-3 text-primary" aria-hidden="true" />{PARAMS.find((p) => p.id === m.trigger)?.q.split(" ").slice(0, 3).join(" ")}…</span>}
                    </div>
                    {r?.isOpt && (
                      <ToggleGroup type="single" size="sm" variant="outline" value={choice(m.id)} onValueChange={(v) => v && setChoice(m.id, v as Decision["choice"])} aria-label={`Päätös: ${m.name}`} className="mt-2 w-full">
                        <ToggleGroupItem value="valitaan" className="flex-1 text-xs data-[state=on]:bg-green-700 data-[state=on]:text-white"><Check aria-hidden="true" />Valitaan</ToggleGroupItem>
                        <ToggleGroupItem value="eivalita" className="flex-1 text-xs data-[state=on]:bg-zinc-700 data-[state=on]:text-white"><X aria-hidden="true" />Ei</ToggleGroupItem>
                        <ToggleGroupItem value="avoin" className="flex-1 text-xs data-[state=on]:bg-amber-100 data-[state=on]:text-amber-950"><CircleDot aria-hidden="true" />Avoin</ToggleGroupItem>
                      </ToggleGroup>
                    )}
                    {seller && (
                      <Collapsible open={openId === m.id} onOpenChange={(o) => setOpenId(o ? m.id : null)}>
                        <CollapsibleTrigger className="group mt-2 flex w-full items-center justify-between rounded px-1 py-1 text-xs font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">
                          Muokkaa moduulia<ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 space-y-2 border-t border-border pt-2">
                          <TextF label="Nimi" id={`${m.id}-n`} value={m.name} onChange={(v) => patch(m.id, { name: v })} />
                          <AreaF label="Kuvaus" id={`${m.id}-d`} value={m.desc} onChange={(v) => patch(m.id, { desc: v })} rows={2} />
                          <AreaF label="Tuotokset" id={`${m.id}-o`} value={m.outputs} onChange={(v) => patch(m.id, { outputs: v })} rows={2} />
                          <div className="grid grid-cols-2 gap-2">
                            <SelF label="Vaihe" id={`${m.id}-ph`} value={m.phase} onChange={(v) => patch(m.id, { phase: v })} options={[...MODULE_PHASES]} />
                            <div><Label className="mb-1 text-xs text-muted-foreground" id={`${m.id}-sc-l`}>Luokka</Label>
                              <ToggleGroup type="single" size="sm" variant="outline" value={scopeOverride[m.id] ?? m.scope} onValueChange={(v) => v && setScopeOverride((p) => ({ ...p, [m.id]: v as "S" | "O" }))} aria-labelledby={`${m.id}-sc-l`}>
                                <ToggleGroupItem value="S" className="px-2 text-xs data-[state=on]:bg-blue-700 data-[state=on]:text-white">Sisältyy</ToggleGroupItem>
                                <ToggleGroupItem value="O" className="px-2 text-xs data-[state=on]:bg-amber-100 data-[state=on]:text-amber-950">Optio</ToggleGroupItem>
                              </ToggleGroup>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="col-span-2"><Label htmlFor={`${m.id}-dr`} className="mb-1 text-xs text-muted-foreground">Laskentaperuste</Label><Sel id={`${m.id}-dr`} value={m.driver} onChange={(v) => patch(m.id, { driver: v as ModuleDriver })} options={MODULE_DRIVERS.map((d) => ({ v: d, label: DRIVER_LABEL[d] }))} /></div>
                            {m.driver === "prosentti" ? (
                              <div><Label htmlFor={`${m.id}-pct`} className="mb-1 text-xs text-muted-foreground">Prosentti</Label><Input id={`${m.id}-pct`} type="number" step="1" min={0} value={m.pct} onChange={(e) => patch(m.id, { pct: Math.max(0, Number(e.target.value) || 0) })} className="h-8 text-right" /></div>
                            ) : (<>
                              <div><Label htmlFor={`${m.id}-b`} className="mb-1 text-xs text-muted-foreground">Perus htp</Label><Input id={`${m.id}-b`} type="number" step="0.5" min={0} value={m.base} onChange={(e) => patch(m.id, { base: Math.max(0, Number(e.target.value) || 0) })} className="h-8 text-right" /></div>
                              {m.driver !== "kiinteä" && <>
                                <div><Label htmlFor={`${m.id}-ur`} className="mb-1 text-xs text-muted-foreground">Htp / {m.unitLabel || "yksikkö"}</Label><Input id={`${m.id}-ur`} type="number" step="0.5" min={0} value={m.unitRate} onChange={(e) => patch(m.id, { unitRate: Math.max(0, Number(e.target.value) || 0) })} className="h-8 text-right" /></div>
                                <div><Label htmlFor={`${m.id}-ul`} className="mb-1 text-xs text-muted-foreground">Yksikkö</Label><Input id={`${m.id}-ul`} value={m.unitLabel} onChange={(e) => patch(m.id, { unitLabel: e.target.value })} className="h-8" /></div>
                                <div><Label htmlFor={`${m.id}-u`} className="mb-1 text-xs text-muted-foreground">Määrä{m.driver !== "määrä" ? " (tyhjä = lähtötiedoista)" : ""}</Label><Input id={`${m.id}-u`} type="number" min={0} value={m.units ?? ""} placeholder={String(r?.units ?? 0)} onChange={(e) => patch(m.id, { units: e.target.value === "" ? null : Math.max(0, Number(e.target.value) || 0) })} className="h-8 text-right" /></div>
                              </>}
                            </>)}
                            <div><Label htmlFor={`${m.id}-ci`} className="mb-1 text-xs text-muted-foreground">Korjaus sis.</Label><Input id={`${m.id}-ci`} type="number" step="0.5" value={corrInt[m.id] ?? 0} onChange={(e) => setCorrInt((p) => ({ ...p, [m.id]: Number(e.target.value) || 0 }))} className="h-8 text-right" /></div>
                            <div><Label htmlFor={`${m.id}-ce`} className="mb-1 text-xs text-muted-foreground">Korjaus ulk.</Label><Input id={`${m.id}-ce`} type="number" step="0.5" value={corrExt[m.id] ?? 0} onChange={(e) => setCorrExt((p) => ({ ...p, [m.id]: Number(e.target.value) || 0 }))} className="h-8 text-right" /></div>
                            <div className="col-span-2"><Label htmlFor={`${m.id}-tr`} className="mb-1 text-xs text-muted-foreground">Nostetaan lähtötiedosta</Label><Sel id={`${m.id}-tr`} value={m.trigger} onChange={(v) => patch(m.id, { trigger: v })} options={[{ v: "", label: "—" }, ...PARAMS.map((p) => ({ v: p.id, label: p.q }))]} /></div>
                          </div>
                          <Button size="sm" variant="ghost" onClick={async () => { if (await confirm({ title: `Poistetaanko moduuli ${m.name}?`, description: "Moduuli poistuu tämän projektin moduuliluettelosta.", confirmLabel: "Poista", cancelLabel: "Peruuta", destructive: true })) setModules((ms) => ms.filter((x) => x.id !== m.id)); }}><Trash2 />Poista moduuli</Button>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </article>
                );
              })}
              {seller && <Button variant="outline" size="sm" className="border-dashed" onClick={() => addModule(ph)}><Plus />Lisää moduuli</Button>}
            </section>
          ))}
        </div>
        <span className="pointer-events-none mt-3 block text-[10px] font-medium text-muted-foreground">HS Testi</span>
      </figure>
    </div>
  );
}
