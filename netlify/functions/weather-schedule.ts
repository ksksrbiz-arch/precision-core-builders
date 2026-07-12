import { EUGENE_OR } from "../../server/_core/map";
import { getSupabaseAdmin } from "../../server/_core/supabase";
import { withGuards } from "./_lib/http";

type WeatherDay = {
  date: string;
  description: string;
  tempHigh: number;
  tempLow: number;
  rainProbability: number;
  rainMm: number;
  willRain: boolean;
};

/**
 * Convert WMO Weather Interpretation Code to human-readable description.
 * Reference: https://open-meteo.com/en/docs#weathervariables
 */
function wmoCodeToDescription(code: number): string {
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

export const handler = withGuards(
  // Admin-only: the forecast is public, but this reads schedule_items (task
  // titles/types/dates) for a client-supplied projectId via the service role.
  { methods: ["GET"], auth: "admin" },
  async ({ event, json, error }) => {
    try {
      const projectId = parseInt(event.queryStringParameters?.projectId ?? "0");
      const apiKey = process.env.OPENWEATHERMAP_API_KEY;
      const db = getSupabaseAdmin();

      // Fetch 7-day forecast for Eugene OR
      // Priority: OpenWeatherMap (if key set) → Open-Meteo (free, no key needed)
      let forecast: WeatherDay[] = [];
      if (apiKey) {
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${EUGENE_OR.lat}&lon=${EUGENE_OR.lng}&appid=${apiKey}&units=imperial&cnt=56`
        );
        const data = (await res.json()) as any;
        // Group by day, take max rain probability and description
        const byDay = new Map<string, WeatherDay>();
        for (const item of data.list ?? []) {
          const date = item.dt_txt.split(" ")[0];
          const rain = item.rain?.["3h"] ?? 0;
          const pop = (item.pop ?? 0) * 100;
          if (!byDay.has(date)) {
            byDay.set(date, {
              date,
              description: item.weather[0]?.description ?? "",
              tempHigh: item.main.temp_max,
              tempLow: item.main.temp_min,
              rainProbability: pop,
              rainMm: rain,
              willRain: pop > 50,
            });
          } else {
            const existing = byDay.get(date)!;
            if (pop > existing.rainProbability) {
              existing.rainProbability = pop;
              existing.willRain = pop > 50;
            }
            existing.tempHigh = Math.max(existing.tempHigh, item.main.temp_max);
            existing.rainMm += rain;
          }
        }
        forecast = Array.from(byDay.values()).slice(0, 7);
      } else {
        // Open-Meteo: completely free, no API key required.
        // Docs: https://open-meteo.com/en/docs
        const omRes = await fetch(
          `https://api.open-meteo.com/v1/forecast` +
            `?latitude=${EUGENE_OR.lat}&longitude=${EUGENE_OR.lng}` +
            `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weathercode` +
            `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch` +
            `&timezone=America%2FLos_Angeles&forecast_days=7`
        );
        if (omRes.ok) {
          const omData = (await omRes.json()) as {
            daily: {
              time: string[];
              temperature_2m_max: number[];
              temperature_2m_min: number[];
              precipitation_sum: number[];
              precipitation_probability_max: number[];
              weathercode: number[];
            };
          };
          const d = omData.daily;
          forecast = d.time.map((date, i) => {
            const rainMm = (d.precipitation_sum[i] ?? 0) * 25.4; // Open-Meteo inches → mm (consistent with OpenWeatherMap path)
            const rainProbability = d.precipitation_probability_max[i] ?? 0;
            // WMO code ≥ 51 = drizzle/rain/snow/thunderstorm
            const wmoCode = d.weathercode[i] ?? 0;
            const description = wmoCodeToDescription(wmoCode);
            return {
              date,
              description,
              tempHigh: Math.round(d.temperature_2m_max[i] ?? 55),
              tempLow: Math.round(d.temperature_2m_min[i] ?? 40),
              rainProbability: Math.round(rainProbability),
              rainMm: Math.round(rainMm * 10) / 10,
              willRain: rainProbability > 50 || wmoCode >= 51,
            };
          });
        } else {
          // Last resort: static mock (should rarely hit this)
          forecast = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() + i);
            return {
              date: d.toISOString().split("T")[0],
              description: i % 3 === 0 ? "rain" : "partly cloudy",
              tempHigh: 58,
              tempLow: 42,
              rainProbability: i % 3 === 0 ? 80 : 20,
              rainMm: i % 3 === 0 ? 12 : 0,
              willRain: i % 3 === 0,
            };
          });
        }
      }

      // Get weather-sensitive schedule items for this project
      let adjustments: any[] = [];
      if (projectId && db) {
        const rainyDates = forecast.filter(f => f.willRain).map(f => f.date);
        if (rainyDates.length > 0) {
          const startDate = rainyDates[0] + "T00:00:00Z";
          const endDate = rainyDates[rainyDates.length - 1] + "T23:59:59Z";
          const { data: sensitiveItems } = await db
            .from("schedule_items")
            .select("*")
            .eq("project_id", projectId)
            .eq("weather_sensitive", true)
            .neq("status", "complete")
            .gte("planned_start", startDate)
            .lte("planned_start", endDate);

          adjustments = (sensitiveItems ?? []).map(item => {
            const itemDate = item.planned_start?.split("T")[0];
            const rainy = rainyDates.includes(itemDate ?? "");
            return {
              taskId: item.id,
              taskTitle: item.title,
              taskType: item.task_type,
              plannedDate: itemDate,
              recommendation: rainy
                ? item.is_outdoor
                  ? "DEFER — outdoor task scheduled on forecasted rain day"
                  : "PROCEED — indoor task, weather not a factor"
                : "PROCEED — clear weather expected",
              action: rainy && item.is_outdoor ? "defer" : "proceed",
            };
          });
        }
      }

      const alerts = forecast
        .filter(f => f.willRain)
        .map(
          f =>
            `${f.date}: ${f.description} (${Math.round(f.rainProbability)}% chance of rain)`
        );

      return json(200, {
        forecast,
        adjustments,
        alerts,
        location: EUGENE_OR,
      });
    } catch (err) {
      console.error("[weather-schedule]", err);
      return error(500, String(err));
    }
  }
);
