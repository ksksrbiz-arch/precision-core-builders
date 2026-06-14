import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getEugeneForecast, wmoCodeToDescription } from "./weather";

describe("wmoCodeToDescription", () => {
  it("maps WMO codes to readable descriptions", () => {
    expect(wmoCodeToDescription(0)).toBe("clear sky");
    expect(wmoCodeToDescription(2)).toBe("partly cloudy");
    expect(wmoCodeToDescription(3)).toBe("overcast");
    expect(wmoCodeToDescription(61)).toBe("rain");
    expect(wmoCodeToDescription(95)).toBe("thunderstorm");
  });
});

describe("getEugeneForecast", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("parses the Open-Meteo daily payload", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        daily: {
          time: ["2026-06-14", "2026-06-15"],
          temperature_2m_max: [72, 60],
          temperature_2m_min: [50, 48],
          precipitation_probability_max: [10, 80],
          weathercode: [0, 61],
        },
      }),
    });

    const forecast = await getEugeneForecast(2);
    expect(forecast).toHaveLength(2);
    expect(forecast[0]).toMatchObject({
      date: "2026-06-14",
      description: "clear sky",
      willRain: false,
    });
    expect(forecast[1]).toMatchObject({
      description: "rain",
      rainProbability: 80,
      willRain: true,
    });
  });

  it("returns [] when the request fails", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });
    expect(await getEugeneForecast()).toEqual([]);
  });

  it("returns [] on a network error", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("network")
    );
    expect(await getEugeneForecast()).toEqual([]);
  });
});
