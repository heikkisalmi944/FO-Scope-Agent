/** Fellowmind cross-functional end-to-end chains, composed of Microsoft BPC Level 3 processes (Epics). */
export interface ChainStep { epic: string; note?: string }
export interface Chain {
  id: string; name: string; fi: string; msNote: string;
  foundation: string[]; steps: ChainStep[]; side: string[]; analytics: string[];
}
const ep = (seq: string) => `${seq}.000`;
const S = (seq: string, note?: string): ChainStep => ({ epic: ep(seq), note });

export const CHAINS: Chain[] = [
  {
    id: "o2c", name: "Order to cash", fi: "Tilauksesta rahaan",
    msNote: "Microsoftin Order to cash + Inventory to deliver (lähetys) + Record to report (kirjaus)",
    foundation: ["65.05.030", "65.05.050", "65.05.100"].map(ep),
    steps: [S("65.20.025"), S("65.50.060"), S("65.20.600"), S("60.40.030"), S("60.40.040"), S("60.40.060"), S("65.30.010"), S("65.30.100"), S("65.30.130"), S("90.50.040")],
    side: ["65.50.050", "65.20.400", "65.50.080"].map(ep),
    analytics: ["65.60.100", "65.60.200"].map(ep),
  },
  {
    id: "p2p", name: "Procure to pay", fi: "Ostotarpeesta maksuun",
    msNote: "Osa Microsoftin Source to pay -ketjua + Inventory to deliver (vastaanotto) + Record to report (pankki)",
    foundation: ["75.10.010", "75.10.050", "75.30.020"].map(ep),
    steps: [S("75.40.010"), S("75.40.030"), S("75.40.050"), S("60.30.010"), S("60.30.030"), S("75.50.020"), S("75.50.090"), S("90.25.200")],
    side: ["75.40.060", "75.40.070", "75.50.070"].map(ep),
    analytics: ["75.80.010", "75.80.050"].map(ep),
  },
  {
    id: "r2r", name: "Record to report", fi: "Kirjauksesta tilinpäätökseen",
    msNote: "Microsoftin Record to report",
    foundation: ["90.10.020", "90.10.035", "90.10.040"].map(ep),
    steps: [S("90.50.040"), S("90.50.060"), S("90.60.040"), S("90.60.060"), S("90.60.080"), S("90.60.090"), S("90.60.100"), S("90.70.110")],
    side: ["90.50.043", "90.50.070", "90.60.095"].map(ep),
    analytics: ["90.70.070", "90.70.200"].map(ep),
  },
  {
    id: "p2prod", name: "Plan to produce", fi: "Suunnittelusta valmistukseen",
    msNote: "Microsoftin Forecast to plan + Plan to produce + Inventory to deliver",
    foundation: ["70.10.010", "70.10.040"].map(ep),
    steps: [
      S("50.25.625"), S("50.35.250"), S("70.20.020"), S("70.20.030"), S("70.20.040"),
      S("60.40.030", "Materiaalin otto tuotantoon on katalogissa skenaario \"Pick items to the production floor\" – tarkistettava askel."),
      S("70.30.030"), S("70.30.050"), S("70.60.020"),
      S("60.30.030", "Lähin vastine valmiin tuotteen hyllytykselle – tarkistettava askel."),
      S("70.30.070"),
    ],
    side: ["70.30.060", "70.60.060", "70.60.065"].map(ep),
    analytics: ["70.70.010", "70.70.020"].map(ep),
  },
];

/** Epic id -> chains it appears in (main or side path). */
export const CHAINS_BY_EPIC: Record<string, string[]> = {};
for (const c of CHAINS) {
  for (const id of [...c.steps.map((s) => s.epic), ...c.side]) {
    const list = (CHAINS_BY_EPIC[id] ??= []);
    if (!list.includes(c.name)) list.push(c.name);
  }
}
