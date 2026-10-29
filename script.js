// SkyCast: asynchronous REST API calls with loading and error states.
"use strict";

const form = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const searchButton = document.getElementById("search-button");
const message = document.getElementById("message");
const currentCard = document.getElementById("current-weather");
const forecastGrid = document.getElementById("forecast-grid");

const weatherDescriptions = {
  0: ["Clear sky", "☀"], 1: ["Mainly clear", "🌤"], 2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁"], 45: ["Fog", "🌫"], 48: ["Rime fog", "🌫"],
  51: ["Light drizzle", "🌦"], 53: ["Drizzle", "🌦"], 55: ["Dense drizzle", "🌧"],
  56: ["Freezing drizzle", "🌧"], 57: ["Heavy freezing drizzle", "🌧"],
  61: ["Light rain", "🌦"], 63: ["Rain", "🌧"], 65: ["Heavy rain", "🌧"],
  66: ["Freezing rain", "🌧"], 67: ["Heavy freezing rain", "🌧"],
  71: ["Light snow", "🌨"], 73: ["Snow", "🌨"], 75: ["Heavy snow", "❄"],
  77: ["Snow grains", "❄"], 80: ["Rain showers", "🌦"], 81: ["Showers", "🌧"],
  82: ["Heavy showers", "🌧"], 85: ["Snow showers", "🌨"], 86: ["Heavy snow showers", "🌨"],
  95: ["Thunderstorm", "⛈"], 96: ["Thunderstorm with hail", "⛈"], 99: ["Severe thunderstorm", "⛈"]
};

function describeWeather(code) {
  return weatherDescriptions[code] || ["Weather conditions", "🌡"];
}

function setMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}). Please try again.`);
  }
  return response.json();
}

async function getCoordinates(city) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({ name: city, count: "1", language: "en", format: "json" });
  const data = await fetchJson(url);
  if (!data.results || data.results.length === 0) {
    throw new Error("City not found. Check the spelling and try again.");
  }
  return data.results[0];
}

async function getForecast(latitude, longitude) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    timezone: "auto",
    forecast_days: "5"
  });
  return fetchJson(url);
}

function formatDate(dateString, options) {
  return new Intl.DateTimeFormat("en", options).format(new Date(`${dateString}T12:00:00`));
}

function renderCurrent(place, data) {
  const current = data.current;
  const [description, icon] = describeWeather(current.weather_code);
  document.getElementById("location-name").textContent =
    [place.name, place.admin1, place.country].filter(Boolean).filter((value, index, array) => array.indexOf(value) === index).join(", ");
  document.getElementById("current-date").textContent = `Updated ${new Intl.DateTimeFormat("en", { dateStyle: "full" }).format(new Date())}`;
  document.getElementById("condition").textContent = description;
  document.getElementById("weather-icon").textContent = icon;
  document.getElementById("temperature").textContent = Math.round(current.temperature_2m);
  document.getElementById("feels-like").textContent = `${Math.round(current.apparent_temperature)}°C`;
  document.getElementById("humidity").textContent = `${current.relative_humidity_2m}%`;
  document.getElementById("wind-speed").textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  currentCard.hidden = false;
}

function renderForecast(data) {
  forecastGrid.replaceChildren();
  const daily = data.daily;

  daily.time.forEach((date, index) => {
    const [description, icon] = describeWeather(daily.weather_code[index]);
    const card = document.createElement("article");
    card.className = "forecast-card";

    const day = document.createElement("p");
    day.className = "forecast-day";
    day.textContent = index === 0 ? "TODAY" : formatDate(date, { weekday: "short" }).toUpperCase();

    const weatherIcon = document.createElement("div");
    weatherIcon.className = "forecast-icon";
    weatherIcon.setAttribute("aria-hidden", "true");
    weatherIcon.textContent = icon;

    const desc = document.createElement("p");
    desc.className = "forecast-desc";
    desc.textContent = description;

    const temps = document.createElement("p");
    temps.className = "forecast-temps";
    const high = document.createElement("span");
    high.textContent = `${Math.round(daily.temperature_2m_max[index])}°`;
    const low = document.createElement("span");
    low.textContent = `${Math.round(daily.temperature_2m_min[index])}°`;
    temps.append(high, low);

    card.append(day, weatherIcon, desc, temps);
    forecastGrid.append(card);
  });
}

async function searchWeather(city) {
  const cleanedCity = city.trim();
  if (!cleanedCity) {
    setMessage("Please enter a city name.", true);
    return;
  }

  searchButton.disabled = true;
  setMessage(`Finding weather for ${cleanedCity}…`);
  currentCard.hidden = true;
  forecastGrid.replaceChildren();

  try {
    // First API call resolves a city to latitude/longitude.
    const place = await getCoordinates(cleanedCity);
    // Second API call fetches current conditions and daily forecast.
    const forecast = await getForecast(place.latitude, place.longitude);
    if (!forecast.current || !forecast.daily) {
      throw new Error("Weather data is incomplete. Please try another city.");
    }
    renderCurrent(place, forecast);
    renderForecast(forecast);
    setMessage(`Weather loaded for ${place.name}.`);
  } catch (error) {
    setMessage(error instanceof TypeError
      ? "Network error. Check your internet connection and try again."
      : error.message || "Something went wrong. Please try again.", true);
  } finally {
    searchButton.disabled = false;
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  searchWeather(cityInput.value);
});

searchWeather(cityInput.value);
