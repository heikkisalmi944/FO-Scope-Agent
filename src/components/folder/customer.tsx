import { useRef } from "react";
import { Building2, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useField, useList, nextId, useProject } from "@/lib/project-store";
import { importCrm } from "@/lib/excel-io";
import { MEMO_PHASES, type Customer } from "@/lib/project-types";
import { fiDate } from "@/lib/scope-model";
import { AreaF, Sel, SelF, TextF, type Mode } from "./shared";

const SOURCES = ["Dynamics 365 Sales", "Salesforce", "HubSpot", "Muu CRM", "Ei lähdejärjestelmää"];
const TARGETS = ["customer.name", "customer.businessId", "customer.industry", "customer.address", "customer.website", "customer.opportunityName", "customer.sourceAccountId", "customer.sourceOpportunityId", "customer.expectedStart", "customer.summary", "contact.name", "contact.role", "contact.email", "contact.phone", "contact.sourceId"];

export function CustomerSection({ mode }: { mode: Mode }) {
  const [c, setC] = useField("customer");
  const [map, setMap] = useField("crmMap");
  const contacts = useList("contacts");
  const project = useProject();
  const fileRef = useRef<HTMLInputElement>(null);
  const seller = mode === "myyja";
  const set = (k: keyof Customer) => (v: string) => setC((p) => ({ ...p, [k]: v }));

  const onCrm = async (f: File | undefined) => {
    if (!f) return;
    try {
      const r = await importCrm(f, project);
      setC((p) => ({ ...p, ...r.customer }));
      r.contacts.forEach((x) => contacts.add(x));
      toast.success(`CRM-tuonti: ${r.matched} kenttää tunnistettu, ${r.contacts.length} uutta yhteyshenkilöä`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "CRM-tiedoston luku epäonnistui"); }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-lg border border-border bg-muted"><Building2 className="size-5" aria-hidden="true" /></span>
          <div><h1 className="text-2xl font-semibold tracking-tight">{c.name || "Asiakas"}</h1><p className="text-sm text-muted-foreground">{c.opportunityName}{c.goDate ? ` · Go ${fiDate(c.goDate)}` : ""}</p></div>
        </div>
        {seller && (
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="sr-only" id="crm-file" onChange={(e) => onCrm(e.target.files?.[0])} />
            <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload />Tuo CRM-viennistä</Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section aria-labelledby="perus" className="rounded-xl border border-border bg-card p-5">
          <h2 id="perus" className="mb-4 text-base font-semibold">Perustiedot ja opportunity</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextF label="Asiakas" id="c-name" value={c.name} onChange={set("name")} disabled={!seller} />
            <TextF label="Y-tunnus" id="c-bid" value={c.businessId} onChange={set("businessId")} disabled={!seller} />
            <TextF label="Toimiala" id="c-ind" value={c.industry} onChange={set("industry")} disabled={!seller} />
            <TextF label="Verkkosivu" id="c-web" value={c.website} onChange={set("website")} disabled={!seller} />
            <div className="sm:col-span-2"><TextF label="Osoite" id="c-addr" value={c.address} onChange={set("address")} disabled={!seller} /></div>
            <div className="sm:col-span-2"><TextF label="Opportunity" id="c-opp" value={c.opportunityName} onChange={set("opportunityName")} disabled={!seller} /></div>
            <SelF label="Vaihe" id="c-phase" value={c.phase} onChange={set("phase")} options={[...MEMO_PHASES]} disabled={!seller} />
            <TextF label="Arvioitu aloitus" id="c-start" type="date" value={c.expectedStart} onChange={set("expectedStart")} disabled={!seller} />
            {seller && <TextF label="Go-päätös (pvm)" id="c-go" type="date" value={c.goDate} onChange={set("goDate")} />}
            {seller && <TextF label="Go-päätöksen tekijä" id="c-god" value={c.goDecider} onChange={set("goDecider")} />}
            <div className="sm:col-span-2"><AreaF label="Tilannekuva" id="c-sum" value={c.summary} onChange={set("summary")} rows={3} disabled={!seller} /></div>
          </div>
        </section>

        {seller && (
          <section aria-labelledby="lahde" className="rounded-xl border border-border bg-card p-5">
            <h2 id="lahde" className="mb-4 text-base font-semibold">Lähdejärjestelmä</h2>
            <div className="grid gap-3">
              <SelF label="CRM" id="c-src" value={c.sourceSystem} onChange={set("sourceSystem")} options={SOURCES} />
              <TextF label="Asiakkaan tunniste (account)" id="c-acc" value={c.sourceAccountId} onChange={set("sourceAccountId")} />
              <TextF label="Opportunityn tunniste" id="c-oid" value={c.sourceOpportunityId} onChange={set("sourceOpportunityId")} />
            </div>
            <h3 className="mb-2 mt-5 text-sm font-semibold">Kenttäkartoitus ({map.length})</h3>
            <div className="max-h-72 overflow-y-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <caption className="sr-only">CRM-kenttien kartoitus sovelluksen kenttiin</caption>
                <thead className="sticky top-0 bg-card"><tr className="text-left text-xs text-muted-foreground"><th className="px-2 py-1.5 font-medium">CRM-kenttä</th><th className="px-2 py-1.5 font-medium">Sovelluksen kenttä</th><th className="w-8"><span className="sr-only">Poista</span></th></tr></thead>
                <tbody className="divide-y divide-border">
                  {map.map((m, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1"><Input aria-label="CRM-kenttä" value={m.source} onChange={(e) => setMap((p) => p.map((x, j) => (j === i ? { ...x, source: e.target.value } : x)))} className="h-7 font-mono text-xs" /></td>
                      <td className="px-2 py-1"><Sel ariaLabel="Sovelluksen kenttä" value={m.target} onChange={(v) => setMap((p) => p.map((x, j) => (j === i ? { ...x, target: v } : x)))} options={TARGETS} className="h-7 font-mono text-xs" /></td>
                      <td><Button size="icon-xs" variant="ghost" aria-label={`Poista kartoitus ${m.source}`} onClick={() => setMap((p) => p.filter((_, j) => j !== i))}><Trash2 /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setMap((p) => [...p, { source: "", target: "customer.name" }])}><Plus />Lisää kenttä</Button>
          </section>
        )}
      </div>

      <section aria-labelledby="yht" className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 id="yht" className="text-base font-semibold">Yhteyshenkilöt ({contacts.items.length})</h2>
          {seller && <Button size="sm" variant="outline" onClick={() => contacts.add({ id: nextId("YHT", contacts.items), name: "", role: "", org: "Asiakas", email: "", phone: "", sourceId: "" })}><Plus />Lisää</Button>}
        </div>
        <table className="w-full text-sm">
          <caption className="sr-only">Yhteyshenkilöt</caption>
          <thead><tr className="text-left text-xs text-muted-foreground"><th className="px-5 py-2 font-medium">Nimi</th><th className="px-2 py-2 font-medium">Rooli</th><th className="px-2 py-2 font-medium">Organisaatio</th><th className="px-2 py-2 font-medium">Sähköposti</th><th className="px-2 py-2 font-medium">Puhelin</th>{seller && <th className="w-10"><span className="sr-only">Poista</span></th>}</tr></thead>
          <tbody className="divide-y divide-border">
            {contacts.items.map((x) => seller ? (
              <tr key={x.id}>
                <td className="px-5 py-1.5"><Input aria-label="Nimi" value={x.name} onChange={(e) => contacts.patch(x.id, { name: e.target.value })} className="h-8" /></td>
                <td className="px-2 py-1.5"><Input aria-label="Rooli" value={x.role} onChange={(e) => contacts.patch(x.id, { role: e.target.value })} className="h-8" /></td>
                <td className="px-2 py-1.5"><Sel ariaLabel="Organisaatio" value={x.org} onChange={(v) => contacts.patch(x.id, { org: v as "Asiakas" | "Fellowmind" })} options={["Asiakas", "Fellowmind"]} className="h-8" /></td>
                <td className="px-2 py-1.5"><Input aria-label="Sähköposti" value={x.email} onChange={(e) => contacts.patch(x.id, { email: e.target.value })} className="h-8" /></td>
                <td className="px-2 py-1.5"><Input aria-label="Puhelin" value={x.phone} onChange={(e) => contacts.patch(x.id, { phone: e.target.value })} className="h-8" /></td>
                <td><Button size="icon-sm" variant="ghost" aria-label={`Poista ${x.name}`} onClick={() => contacts.remove(x.id)}><Trash2 /></Button></td>
              </tr>
            ) : (
              <tr key={x.id}><td className="px-5 py-2 font-medium">{x.name}</td><td className="px-2 py-2">{x.role}</td><td className="px-2 py-2">{x.org}</td><td className="px-2 py-2">{x.email}</td><td className="px-2 py-2">{x.phone}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
