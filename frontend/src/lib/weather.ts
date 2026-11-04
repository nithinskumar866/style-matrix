import type { Weather } from "@/types";

const GEOLOCATION_TIMEOUT_MS = 10000;

const getPosition = () =>
  new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location isn't available in this browser"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: GEOLOCATION_TIMEOUT_MS });
  });

// Weather codes from https://open-meteo.com/en/docs
const conditionFor = (code: number): Weather["condition"] => {
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return "rain";
  return code <= 1 ? "clear" : "cloudy";
};

export async function getCurrentWeather(): Promise<Weather> {
  const { coords } = await getPosition();
  // About 1 km of precision is plenty for the weather, and shares less about the user
  const params = new URLSearchParams({
    latitude: coords.latitude.toFixed(2),
    longitude: coords.longitude.toFixed(2),
    current: "temperature_2m,weather_code",
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!response.ok) throw new Error("The weather service didn't respond");
  const data = await response.json();

  return {
    temperature: data.current.temperature_2m,
    condition: conditionFor(data.current.weather_code),
  };
}
