import { normalizeTransitText } from "./transport-query.js";

export const IRELAND_PROVINCES = ["Connacht", "Leinster", "Munster", "Ulster"] as const;

export interface IrelandCounty {
  code: string;
  name: string;
  province: (typeof IRELAND_PROVINCES)[number];
  osmName: string;
}

/** The NTA national GTFS covers the Republic of Ireland, not Northern Ireland. */
export const IRELAND_COUNTIES: readonly IrelandCounty[] = [
  { code: "IE-G", name: "Galway", province: "Connacht", osmName: "County Galway" },
  { code: "IE-LM", name: "Leitrim", province: "Connacht", osmName: "County Leitrim" },
  { code: "IE-MO", name: "Mayo", province: "Connacht", osmName: "County Mayo" },
  { code: "IE-RN", name: "Roscommon", province: "Connacht", osmName: "County Roscommon" },
  { code: "IE-SO", name: "Sligo", province: "Connacht", osmName: "County Sligo" },
  { code: "IE-CW", name: "Carlow", province: "Leinster", osmName: "County Carlow" },
  { code: "IE-D", name: "Dublin", province: "Leinster", osmName: "County Dublin" },
  { code: "IE-KE", name: "Kildare", province: "Leinster", osmName: "County Kildare" },
  { code: "IE-KK", name: "Kilkenny", province: "Leinster", osmName: "County Kilkenny" },
  { code: "IE-LS", name: "Laois", province: "Leinster", osmName: "County Laois" },
  { code: "IE-LD", name: "Longford", province: "Leinster", osmName: "County Longford" },
  { code: "IE-LH", name: "Louth", province: "Leinster", osmName: "County Louth" },
  { code: "IE-MH", name: "Meath", province: "Leinster", osmName: "County Meath" },
  { code: "IE-OY", name: "Offaly", province: "Leinster", osmName: "County Offaly" },
  { code: "IE-WH", name: "Westmeath", province: "Leinster", osmName: "County Westmeath" },
  { code: "IE-WX", name: "Wexford", province: "Leinster", osmName: "County Wexford" },
  { code: "IE-WW", name: "Wicklow", province: "Leinster", osmName: "County Wicklow" },
  { code: "IE-CE", name: "Clare", province: "Munster", osmName: "County Clare" },
  { code: "IE-CO", name: "Cork", province: "Munster", osmName: "County Cork" },
  { code: "IE-KY", name: "Kerry", province: "Munster", osmName: "County Kerry" },
  { code: "IE-LK", name: "Limerick", province: "Munster", osmName: "County Limerick" },
  { code: "IE-TA", name: "Tipperary", province: "Munster", osmName: "County Tipperary" },
  { code: "IE-WD", name: "Waterford", province: "Munster", osmName: "County Waterford" },
  { code: "IE-CN", name: "Cavan", province: "Ulster", osmName: "County Cavan" },
  { code: "IE-DL", name: "Donegal", province: "Ulster", osmName: "County Donegal" },
  { code: "IE-MN", name: "Monaghan", province: "Ulster", osmName: "County Monaghan" },
];

export function irelandCounties(province: string): IrelandCounty[] {
  return IRELAND_COUNTIES.filter(county => county.province === province);
}

export function irelandCountyByCode(code: string): IrelandCounty | undefined {
  return IRELAND_COUNTIES.find(county => county.code === code);
}

/** Only full county names resolve here; a bare town such as Cork remains a city search. */
export function irelandCountyFromSearch(value: string): IrelandCounty | undefined {
  const query = normalizeTransitText(value)
    .replace(/\s+(?:(?:en|in)\s+)?(?:republique d irlande|irlande|ireland)$/i, "")
    .trim();
  if (["county ofaly", "comte de ofaly", "ofaly county"].includes(query)) {
    return irelandCountyByCode("IE-OY");
  }
  return IRELAND_COUNTIES.find(county => [county.osmName, `Comté de ${county.name}`]
    .some(name => normalizeTransitText(name) === query));
}
