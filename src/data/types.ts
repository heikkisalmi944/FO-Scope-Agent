export type ParamId = "companies" | "countries" | "currencies" | "edi" | "apInvoices" | "portal" | "wms" | "budget";
/** Scenario (MS level 4) = Function */
export interface CFunc { id: string; t: string; p: string; sop: number; o: string | null; tr: ParamId[]; n: 0 | 1 }
/** Business process (MS level 3) = Epic. s = proposed scope (S = Sisältyy, O = Optio), r = rule */
export interface CEpic { id: string; t: string; d: string; s: "S" | "O"; r: string | null; tr: ParamId[]; f: CFunc[] }
/** Deliverable: [title, type code, functional area index] */
export type CDel = [string, string, number];
/** Business process area (MS level 2) = Lego */
export interface CLego { id: string; t: string; fi: string; e: CEpic[]; dl: CDel[] }
/** End-to-end process (MS level 1) = Duplo */
export interface CDuplo { id: string; fi: string; e2e: string; seq: string; d: string; l: CLego[] }
export interface Catalog { version: string; fas: string[]; duplos: CDuplo[] }
