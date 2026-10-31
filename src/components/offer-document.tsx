import { forwardRef } from "react";
import type { Project } from "@/lib/project-types";
import { DUPLOS, fiDate, fmt, lines, type ScopeModel } from "@/lib/scope-model";
import { MODULE_PHASES } from "@/lib/project-types";

const H2 = ({ n, children }: { n: number; children: string }) => <h2 className="mb-2 mt-7 border-b border-zinc-300 pb-1 text-[15px] font-semibold text-zinc-900">{n}. {children}</h2>;

/** Printable offer document (captured to PDF). Fixed light palette on purpose: it is a paper document. */
export const OfferDocument = forwardRef<HTMLDivElement, { p: Project; m: ScopeModel }>(function OfferDocument({ p, m }, ref) {
  const base = p.baselines[p.baselines.length - 1];
  const c = p.customer;
  const duplos = DUPLOS.filter((d) => m.included.some((i) => i.duplo.id === d.id));
  const assumptions = p.raid.filter((r) => r.inOffer && r.status !== "Suljettu");
  const openShown = m.openAll.slice(0, 25); const exclShown = m.excludedAll.slice(0, 30);
  const mods = m.mods.filter((r) => r.included);
  return (
    <article ref={ref} className="mx-auto w-full max-w-[820px] bg-white px-12 py-10 font-sans text-[12.5px] leading-relaxed text-zinc-800 shadow-sm ring-1 ring-zinc-200" aria-label="Tarjousdokumentti">
      <header className="flex items-start justify-between border-b-2 border-zinc-900 pb-5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Fellowmind Finland Oy Ab</div>
          <h1 className="mt-3 max-w-[520px] text-[24px] font-semibold leading-tight text-zinc-900">{p.offer.title}</h1>
          <div className="mt-2 text-[14px] text-zinc-700">{c.name}{c.opportunityName ? ` · ${c.opportunityName}` : ""}</div>
        </div>
        <svg viewBox="0 0 32 32" className="size-10 shrink-0" aria-hidden="true"><rect x="2" y="16" width="13" height="13" rx="2.5" fill="#3f3fa8" /><rect x="17" y="16" width="13" height="13" rx="2.5" fill="#3f3fa8" opacity=".6" /><rect x="9.5" y="3" width="13" height="11" rx="2.5" fill="#3f3fa8" opacity=".35" /></svg>
      </header>
      <dl className="mt-4 grid grid-cols-4 gap-4 text-[11.5px]">
        <div><dt className="text-zinc-500">Päiväys</dt><dd className="font-medium text-zinc-900">{fiDate(new Date().toISOString())}</dd></div>
        <div><dt className="text-zinc-500">Voimassa</dt><dd className="font-medium text-zinc-900">{p.offer.validUntil ? fiDate(p.offer.validUntil) : "[Lisää päivämäärä]"}</dd></div>
        <div><dt className="text-zinc-500">Lähtötaso</dt><dd className="font-medium text-zinc-900">{base ? `${base.version} (${fiDate(base.lockedAt)})` : "Ei lukittu"}</dd></div>
        <div><dt className="text-zinc-500">Yhteyshenkilö</dt><dd className="font-medium text-zinc-900">{p.offer.contactPerson || "[Lisää yhteyshenkilö]"}</dd></div>
      </dl>

      <H2 n={1}>Tausta</H2>
      <p className="whitespace-pre-line">{p.offer.background || "[Lisää tausta]"}</p>
      <H2 n={2}>Tavoitteet</H2>
      <ul className="list-disc space-y-0.5 pl-5">{(lines(p.offer.goals).length ? lines(p.offer.goals) : ["[Lisää tavoitteet]"]).map((g) => <li key={g}>{g}</li>)}</ul>
      <H2 n={3}>Toteutustapa</H2>
      <p className="whitespace-pre-line">{p.offer.approach || "[Lisää toteutustapa]"}</p>

      <H2 n={4}>Toteutuksen laajuus: prosessit</H2>
      <p className="mb-2">Laajuus on kuvattu Microsoftin Business Process Catalogin ({"Lokakuu 2026"}) prosessirakenteella. Jokainen alla mainittu prosessialue sisältää luetellut liiketoimintaprosessit niihin liittyvine konfiguraatioineen ja SOP-dokumentteineen.</p>
      <table className="w-full border-collapse text-[11.5px]">
        <thead><tr className="border-b border-zinc-400 text-left text-zinc-600"><th className="py-1.5 pr-2 font-medium">Kokonaisuus › prosessialue</th><th className="py-1.5 pr-2 text-right font-medium">Prosesseja</th><th className="py-1.5 text-right font-medium">Työmäärä (htp)</th></tr></thead>
        <tbody>
          {duplos.map((d) => {
            const rows = m.included.filter((i) => i.duplo.id === d.id);
            const legos = [...new Map(rows.map((r) => [r.lego.id, r.lego])).values()];
            return [
              <tr key={d.id} className="border-b border-zinc-300 bg-zinc-50"><td className="py-1.5 pr-2 font-semibold text-zinc-900">{d.fi} <span className="font-normal text-zinc-500">· {d.e2e}</span></td><td className="py-1.5 pr-2 text-right font-semibold">{rows.length}</td><td className="py-1.5 text-right font-semibold tabular-nums">{fmt(rows.reduce((a, r) => a + r.totalExt, 0))}</td></tr>,
              ...legos.map((l) => { const lr = rows.filter((r) => r.lego.id === l.id); return <tr key={l.id} className="border-b border-zinc-200"><td className="py-1 pl-4 pr-2">{l.fi} <span className="text-zinc-500">({l.t})</span></td><td className="py-1 pr-2 text-right">{lr.length}</td><td className="py-1 text-right tabular-nums">{fmt(lr.reduce((a, r) => a + r.totalExt, 0))}</td></tr>; }),
            ];
          })}
          <tr className="border-t-2 border-zinc-900"><td className="py-2 font-semibold text-zinc-900">Prosessit yhteensä</td><td className="py-2 pr-2 text-right font-semibold">{m.included.length}</td><td className="py-2 text-right font-semibold tabular-nums text-zinc-900">{fmt(m.processExt)}</td></tr>
        </tbody>
      </table>

      <H2 n={5}>Projektin työvaiheet ja palvelut</H2>
      {mods.length === 0 ? <p>[Valitse moduulit]</p> : (
        <table className="w-full border-collapse text-[11.5px]">
          <thead><tr className="border-b border-zinc-400 text-left text-zinc-600"><th className="py-1.5 pr-2 font-medium">Moduuli</th><th className="py-1.5 pr-2 font-medium">Tuotokset</th><th className="py-1.5 text-right font-medium">Työmäärä (htp)</th></tr></thead>
          <tbody>
            {MODULE_PHASES.filter((ph) => mods.some((r) => r.mod.phase === ph)).map((ph) => [
              <tr key={ph} className="border-b border-zinc-300 bg-zinc-50"><td colSpan={2} className="py-1.5 font-semibold text-zinc-900">{ph}</td><td className="py-1.5 text-right font-semibold tabular-nums">{fmt(mods.filter((r) => r.mod.phase === ph).reduce((a, r) => a + r.totalExt, 0))}</td></tr>,
              ...mods.filter((r) => r.mod.phase === ph).map((r) => <tr key={r.mod.id} className="border-b border-zinc-200 align-top"><td className="py-1 pl-4 pr-2"><span className="text-zinc-900">{r.mod.name}</span>{r.mod.desc ? <div className="text-zinc-600">{r.mod.desc}</div> : null}</td><td className="py-1 pr-2 text-zinc-600">{r.mod.outputs}</td><td className="py-1 text-right tabular-nums">{fmt(r.totalExt)}</td></tr>),
            ])}
            <tr className="border-t-2 border-zinc-900"><td colSpan={2} className="py-2 font-semibold text-zinc-900">Moduulit yhteensä</td><td className="py-2 text-right font-semibold tabular-nums text-zinc-900">{fmt(m.modulesExt)}</td></tr>
          </tbody>
        </table>
      )}

      <H2 n={6}>Rajaukset</H2>
      {m.excludedAll.length === 0 && m.funcExclusions.length === 0 && m.epicExclusions.length === 0 ? <p>Asiakkaan kanssa ei ole sovittu erillisiä rajauksia. Laajuuden ulkopuolelle jäävät kaikki prosessit, joita ei ole mainittu kohdassa 4.</p> : (
        <ul className="list-disc space-y-0.5 pl-5">{m.epicExclusions.map((x) => <li key={x.epic.id}>{x.epic.t} <span className="text-zinc-500">– rajattu oletusscopesta · {x.duplo.fi} › {x.lego.fi}</span>{x.reason ? <div className="text-zinc-600">{x.reason}</div> : null}</li>)}{exclShown.map((o) => <li key={o.id}>{o.name} <span className="text-zinc-500">– {o.path}</span></li>)}{m.excludedAll.length > exclShown.length && <li>ja {m.excludedAll.length - exclShown.length} muuta rajattua optiota (eritelty liitteessä A)</li>}{m.funcExclusions.map((x) => <li key={x.epic.id}>{x.epic.t} – ei sisällä: {x.funcs.map((f) => f.t).join(", ")} <span className="text-zinc-500">– {x.duplo.fi} › {x.lego.fi}</span></li>)}</ul>
      )}

      <H2 n={7}>Oletukset, riippuvuudet ja avoimet kysymykset</H2>
      {assumptions.length === 0 ? <p>[Lisää oletukset RAID-osiossa]</p> : (
        <table className="w-full border-collapse text-[11.5px]"><tbody>
          {assumptions.map((r) => <tr key={r.id} className="border-b border-zinc-200 align-top"><td className="w-32 py-1 pr-2 text-zinc-500">{r.type}</td><td className="py-1 pr-2">{r.title}{r.description ? <div className="text-zinc-600">{r.description}</div> : null}</td><td className="w-36 py-1 text-right text-zinc-600">{r.owner}{r.dueDate ? ` · ${fiDate(r.dueDate)}` : ""}</td></tr>)}
        </tbody></table>
      )}

      <H2 n={8}>Avoimet optiot</H2>
      {m.openAll.length === 0 ? <p>Kaikki optiot on päätetty.</p> : (<>
        <p className="mb-2">Seuraavat optiot voidaan lisätä laajuuteen erillisellä päätöksellä. Yhteensä {m.openAll.length} optiota, arviolta {fmt(m.openExt)} htp.</p>
        <table className="w-full border-collapse text-[11.5px]"><tbody>
          {openShown.map((o) => <tr key={o.id} className="border-b border-zinc-200"><td className="py-1 pr-2">{o.name} <span className="text-zinc-500">– {o.path}</span></td><td className="w-24 py-1 text-right tabular-nums">{fmt(o.effExt)} htp</td></tr>)}
          {m.openAll.length > openShown.length && <tr><td className="py-1 text-zinc-600" colSpan={2}>ja {m.openAll.length - openShown.length} muuta optiota (eritelty liitteessä A)</td></tr>}
        </tbody></table>
      </>)}

      <H2 n={9}>Työmääräarvio ja hinnoittelu</H2>
      <table className="w-full border-collapse text-[11.5px]"><tbody>
        {mods.length > 0 && <tr className="border-b border-zinc-200"><td className="py-1">Moduulit (projektin työvaiheet ja palvelut)</td><td className="w-28 py-1 text-right tabular-nums">{fmt(m.modulesExt)} htp</td></tr>}
        {duplos.map((d) => <tr key={d.id} className="border-b border-zinc-200"><td className="py-1">{d.fi}</td><td className="w-28 py-1 text-right tabular-nums">{fmt(m.included.filter((i) => i.duplo.id === d.id).reduce((a, r) => a + r.totalExt, 0))} htp</td></tr>)}
        <tr className="border-t-2 border-zinc-900"><td className="py-1.5 font-semibold text-zinc-900">Työmäärä yhteensä</td><td className="py-1.5 text-right font-semibold tabular-nums text-zinc-900">{fmt(m.totalExt)} htp</td></tr>
        <tr><td className="py-1.5">Hinnoittelu</td><td className="py-1.5 text-right">[Lisää hinnoittelu]</td></tr>
      </tbody></table>

      <H2 n={10}>Lähtötaso ja muutoksenhallinta</H2>
      <p>{base ? `Tarjous perustuu lähtötasoon ${base.version}, joka on lukittu ${fiDate(base.lockedAt)}. ` : ""}Laajuuteen tehtävät muutokset käsitellään muutospyyntöinä. Jokaiselle muutokselle arvioidaan työmäärä- ja aikatauluvaikutus, ja muutos toteutetaan asiakkaan hyväksynnän jälkeen.</p>

      <H2 n={11}>Hyväksyntä</H2>
      <div className="mt-6 grid grid-cols-2 gap-10 text-[11.5px]">
        {[c.name || "Asiakas", "Fellowmind Finland Oy Ab"].map((who) => <div key={who}><div className="h-10 border-b border-zinc-500" /><div className="mt-1 font-medium text-zinc-900">{who}</div><div className="text-zinc-500">Nimi, päiväys</div></div>)}
      </div>
      {(m.excludedAll.length > exclShown.length || m.openAll.length > openShown.length) && (<>
        <h2 className="mb-2 mt-10 border-b-2 border-zinc-900 pb-1 text-[15px] font-semibold text-zinc-900">Liite A. Rajaukset ja avoimet optiot</h2>
        {m.excludedAll.length > exclShown.length && (<>
          <h3 className="mb-1 mt-4 text-[13px] font-semibold text-zinc-900">A.1 Rajatut optiot ({m.excludedAll.length})</h3>
          <table className="w-full border-collapse text-[11px]"><tbody>
            {m.excludedAll.map((o) => <tr key={o.id} className="border-b border-zinc-200 align-top"><td className="py-0.5 pr-2">{o.name}</td><td className="py-0.5 text-zinc-500">{o.path}</td></tr>)}
          </tbody></table>
        </>)}
        {m.openAll.length > openShown.length && (<>
          <h3 className="mb-1 mt-4 text-[13px] font-semibold text-zinc-900">A.2 Avoimet optiot ({m.openAll.length}, yhteensä {fmt(m.openExt)} htp)</h3>
          <table className="w-full border-collapse text-[11px]"><tbody>
            {m.openAll.map((o) => <tr key={o.id} className="border-b border-zinc-200 align-top"><td className="py-0.5 pr-2">{o.name}</td><td className="py-0.5 pr-2 text-zinc-500">{o.path}</td><td className="w-20 py-0.5 text-right tabular-nums">{fmt(o.effExt)} htp</td></tr>)}
          </tbody></table>
        </>)}
      </>)}
    </article>
  );
});
