import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { EUGENE_OR } from "../../server/_core/map";
import { checkRateLimit, getClientIP } from "../../server/_core/rateLimit";

const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

type WeatherDay = {
  date: string;
  description: string;
  tempHigh: number;
  tempLow: number;
  rainProbability: number;
  rainMm: number;
  willRain: boolean;
};

export const handler: Handler = async event => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };
  if (event.httpMethod === "OPTIONS")
    return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "GET") return { statusCode: 405, headers, body: "" };

  try {
    // Rate limit: 20 weather checks per minute per IP
    const ip = getClientIP(event.headers as Record<string, string>);
    const rl = await checkRateLimit(`weather:${ip}`, 20);
    if (!rl.allowed) {
      return {
        statusCode: 429,
        headers: { ...headers, "Retry-After": "60" },
        body: JSON.stringify({ error: "Too many requests" }),
      };
    }

    const projectId = parseInt(event.queryStringParameters?.projectId ?? "0");
    const apiKey = process.env.OPENWEATHERMAP_API_KEY;

    // Fetch 7-day forecast for Eugene OR
    let forecast: WeatherDay[] = [];
    if (apiKey) {
      try {
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${EUGENE_OR.lat}&lon=${EUGENE_OR.lng}&appid=${apiKey}&units=imperial&cnt=56`
        );
        if (!res.ok)
          throw new Error(`Weather API ${res.status}: ${res.statusText}`);
        const data = (await res.json()) as any;
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
      } catch (weatherErr) {
        console.warn("[weather-schedule] API failed, using mock:", weatherErr);
        // Fall through to mock data below
      }
    }
    if (forecast.length === 0) {
      // Mock forecast when no API key or API failed
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

    // Get weather-sensitive schedule items for this project
    let adjustments: any[] = [];
    if (projectId) {
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        forecast,
        adjustments,
        alerts,
        location: EUGENE_OR,
      }),
    };
  } catch (err) {
    console.error("[weather-schedule]", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: String(err) }),
    };
  }
};
