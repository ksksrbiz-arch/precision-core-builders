/**
 * Open-Meteo weather helper — completely free, no API key required.
 * Used by proactive automations (daily briefing) to correlate the forecast
 * with weather-sensitive scheduled work.
 * Docs: https://open-meteo.com/en/docs
 */
import { EUGENE_OR } from "./map";

export type ForecastDay = {
  date: string; // YYYY-MM-DD
  description: string;
  tempHigh: number;
  tempLow: number;
  rainProbability: number; // %
  willRain: boolean;
};

/**
 * Convert a WMO Weather Interpretation Code to a human-readable description.
 * Reference: https://open-meteo.com/en/docs#weathervariables
 */
export function wmoCodeToDescription(code: number): string {
  if (code === 0) return "clear sky";
  if (code <= 2) return "partly cloudy";
  if (code === 3) return "overcast";
  if (code <= 49) return "foggy";
  if (code <= 59) return "drizzle";
  if (code <= 69) return "rain";
  if (code <= 79) return "snow";
  if (code <= 84) return "rain showers";
  if (code <= 94) return "snow showers";
  return "thunderstorm";
}

type OpenMeteoDaily = {
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
    weathercode?: number[];
  };
};

/**
 * Fetch the multi-day daily forecast for the firm's home base (Eugene, OR).
 * Returns [] on any error so callers can degrade gracefully.
 */
export async function getEugeneForecast(days = 7): Promise<ForecastDay[]> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${EUGENE_OR.lat}&longitude=${EUGENE_OR.lng}` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode` +
        `&temperature_unit=fahrenheit&precipitation_unit=inch` +
        `&timezone=America%2FLos_Angeles&forecast_days=${days}`
    );
    if (!res.ok) return [];
    const data = (await res.json()) as OpenMeteoDaily;
    const d = data.daily;
    if (!d?.time) return [];
    return d.time.map((date, i) => {
      const wmoCode = d.weathercode?.[i] ?? 0;
      const rainProbability = d.precipitation_probability_max?.[i] ?? 0;
      return {
        date,
        description: wmoCodeToDescription(wmoCode),
        tempHigh: Math.round(d.temperature_2m_max?.[i] ?? 55),
        tempLow: Math.round(d.temperature_2m_min?.[i] ?? 40),
        rainProbability: Math.round(rainProbability),
        willRain: rainProbability > 50 || wmoCode >= 51,
      };
    });
  } catch {
    return [];
  }
}
