/** Shared state-tone map: green done, amber pending, red problem, blue active, gray inactive. */
export const TONES = {
  green: "bg-green-50 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-800",
  amber: "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800",
  red: "bg-red-50 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-800",
  blue: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800",
  gray: "bg-muted text-foreground border-border",
} as const;
export type Tone = keyof typeof TONES;
export const DOT: Record<Tone, string> = { green: "bg-green-700", amber: "bg-amber-500", red: "bg-red-700", blue: "bg-blue-700", gray: "bg-zinc-400" };

export const STATUS_TONE: Record<string, Tone> = {
  // muutokset
  Luonnos: "gray", Arvioitavana: "blue", "Asiakkaan hyväksyttävänä": "amber", Hyväksytty: "green", Hylätty: "red", Siirretty: "gray",
  // keskustelut
  Avoin: "amber", Ratkaistu: "green", "Aihio luotu": "blue", "Muutospyyntö luotu": "blue",
  // RAID
  Seurannassa: "blue", Suljettu: "gray",
  // tiketit
  Aihio: "gray", Arvioitu: "blue", "Siirretty Jiraan": "green", "Seuraava vaihe": "gray",
  // tasot
  Matala: "green", Keskitaso: "amber", Korkea: "red",
};

