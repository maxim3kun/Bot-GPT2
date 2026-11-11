export interface WeatherRequest {
  place?: string;
  territory?: "fr" | "qc";
  when?: string;
  atDestination?: boolean;
}
export interface WeatherPlace {
  id: string; name: string; label: string; latitude: number; longitude: number; timezone: string;
}
export interface WeatherPeriod { start: number; end: number; timezone: string; target?: number }
export interface ForecastPoint {
  at: number; temperature?: number;
  precipitation: Array<{ hours: number; millimeters: number }>;
}
export interface WeatherForecast {
  updated: number; checked: number; deprecated: boolean; points: ForecastPoint[];
}
export type WeatherFailure = "configuration" | "unavailable" | "quota" | "invalid" | "busy" | "horizon" | "stale";
export class WeatherError extends Error {
  constructor(readonly code: WeatherFailure) { super(`Weather: ${code}`); }
}
export interface WeatherProvider { forecast(place: WeatherPlace): Promise<WeatherForecast> }
