import { idfmDate } from "../../src/discord/idfm-itinerary.js";
import type { OfficialPlace } from "../../src/discord/transport-planner-types.js";

export const NOW = Date.UTC(2026, 10, 11, 7);
export const origin: OfficialPlace = { id: "stop_area:IDFM:71606", name: "Dugommier", label: "Dugommier (Paris)", ids: ["stop_area:IDFM:71606"] };
export const destination: OfficialPlace = { id: "stop_area:IDFM:69884", name: "Pointe du Lac", label: "Pointe du Lac (Créteil)", ids: ["stop_area:IDFM:69884"] };
export const area = (p: OfficialPlace) => ({ id: p.id, name: p.label, embedded_type: "stop_area", stop_area: { id: p.id } });
export const point = (id: string, name: string, parent: string) =>
  ({ id, name, embedded_type: "stop_point", stop_point: { id, stop_area: { id: parent } } });
const a = point("stop_point:IDFM:22182", origin.label, origin.id);
const b = point("stop_point:IDFM:22181", "Daumesnil (Paris)", "stop_area:IDFM:71614");
const c = point("stop_point:IDFM:463168", "Daumesnil (Paris)", "stop_area:IDFM:71614");
const d = point("stop_point:IDFM:21784", destination.label, destination.id);
const section = (type: string, from: unknown, to: unknown, departure: string, arrival: string, extra = {}) => ({
  type, from, to, departure_date_time: `20261111T${departure}00`, arrival_date_time: `20261111T${arrival}00`, ...extra,
});
export function journeyBody() {
  return {
    context: { timezone: "Europe/Paris" }, disruptions: [] as unknown[],
    journeys: [{
      type: "best", departure_date_time: "20261111T080500", arrival_date_time: "20261111T083300", duration: 1680, status: "",
      sections: [
        section("crow_fly", area(origin), a, "0805", "0805", { mode: "walking" }),
        section("public_transport", a, b, "0805", "0806", {
          display_informations: { code: "6", commercial_mode: "Métro", direction: "Nation" }, data_freshness: "base_schedule",
        }),
        section("transfer", b, c, "0806", "0809", { mode: "walking" }),
        section("waiting", undefined, undefined, "0809", "0813"),
        section("public_transport", c, d, "0813", "0833", {
          display_informations: { code: "8", commercial_mode: "Métro", direction: "Pointe du Lac (Créteil)" }, data_freshness: "base_schedule",
        }),
        section("crow_fly", d, area(destination), "0833", "0833", { mode: "walking" }),
      ] as Record<string, any>[],
    }],
  };
}
export const requestAt = idfmDate("20261111T080000")!;
export function placeBody(p: OfficialPlace) {
  return { places: [{ id: p.id, name: p.label, embedded_type: "stop_area", stop_area: { id: p.id, name: p.name, label: p.label } }] };
}
