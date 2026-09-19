"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type LocationResult = {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  country?: string;
  admin1?: string;
};

type AirQuality = {
  current: { us_aqi: number; pm2_5: number };
  hourly: { time: string[]; us_aqi: number[]; pm2_5: number[] };
};

type ForecastData = {
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    precipitation: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    precipitation_probability: number[];
    relative_humidity_2m: number[];
    wind_speed_10m: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    precipitation_sum: number[];
    wind_speed_10m_max: number[];
    sunrise: string[];
    sunset: string[];
  };
  airQuality: AirQuality;
};

type UserSnapshot = { displayName: string; email: string } | null;

const DEFAULT_LOCATION: LocationResult = {
  name: "香港",
  admin1: "香港特别行政区",
  latitude: 22.27832,
  longitude: 114.17469,
  timezone: "Asia/Hong_Kong",
};

const INITIAL_FORECAST: ForecastData = {
  timezone: "Asia/Hong_Kong",
  current: { time: "2026-08-15T16:45", temperature_2m: 29, apparent_temperature: 34, relative_humidity_2m: 80, weather_code: 95, wind_speed_10m: 11, precipitation: 0.3 },
  hourly: {
    time: ["17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00", "00:00"],
    temperature_2m: [29, 28, 28, 27, 27, 27, 27, 26],
    weather_code: [95, 95, 96, 80, 80, 3, 3, 2],
    precipitation_probability: [86, 80, 75, 64, 48, 30, 25, 20],
    relative_humidity_2m: [80, 84, 86, 88, 89, 89, 88, 87],
    wind_speed_10m: [11, 10, 9, 8, 7, 6, 5, 5],
  },
  daily: {
    time: ["2026-08-15", "2026-08-16", "2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20", "2026-08-21"],
    weather_code: [96, 95, 96, 95, 95, 95, 95],
    temperature_2m_max: [30, 31, 30, 29, 28, 28, 28],
    temperature_2m_min: [25, 26, 26, 25, 25, 25, 25],
    precipitation_probability_max: [100, 100, 86, 89, 83, 84, 88],
    precipitation_sum: [4.2, 12.6, 5.4, 8.1, 7.8, 6.9, 5.8],
    wind_speed_10m_max: [14, 13, 9, 20, 22, 25, 21],
    sunrise: ["06:00", "06:00", "06:01", "06:01", "06:01", "06:02", "06:02"],
    sunset: ["18:55", "18:54", "18:53", "18:52", "18:51", "18:51", "18:50"],
  },
  airQuality: {
    current: { us_aqi: 42, pm2_5: 9.2 },
    hourly: { time: ["17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00", "00:00"], us_aqi: [42, 45, 48, 46, 43, 40, 38, 37], pm2_5: [9.2, 10.1, 11.4, 10.9, 9.8, 8.7, 8.2, 7.9] },
  },
};

const weatherMeta = (code: number) => {
  if (code === 0) return { icon: "☀", label: "晴朗", tone: "sunny" };
  if (code <= 3) return { icon: "◒", label: code === 1 ? "晴间多云" : "多云", tone: "cloudy" };
  if (code <= 48) return { icon: "≋", label: "有雾", tone: "mist" };
  if (code <= 57) return { icon: "∿", label: "毛毛雨", tone: "rain" };
  if (code <= 67) return { icon: "☂", label: "下雨", tone: "rain" };
  if (code <= 77) return { icon: "✧", label: "降雪", tone: "snow" };
  if (code <= 82) return { icon: "☂", label: "阵雨", tone: "rain" };
  if (code <= 86) return { icon: "✧", label: "阵雪", tone: "snow" };
  if (code === 95) return { icon: "ϟ", label: "雷雨", tone: "storm" };
  return { icon: "ϟ", label: "雷雨伴冰雹", tone: "storm" };
};

const formatDay = (date: string, index: number) => {
  if (index === 0) return "今天";
  if (index === 1) return "明天";
  return new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(new Date(`${date}T12:00:00`));
};

const formatDate = (date: string) => new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date(`${date}T12:00:00`));
const getLocalHour = (time: string) => time.includes("T") ? time.slice(11, 16) : time;

async function searchLocation(query: string) {
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=zh&format=json`);
  if (!response.ok) throw new Error("城市搜索暂时不可用");
  const payload = await response.json();
  if (!payload.results?.length) throw new Error("没有找到这个城市，试试输入更完整的名称");
  return payload.results[0] as LocationResult;
}

async function fetchForecast(location: LocationResult) {
  const params = new URLSearchParams({ latitude: String(location.latitude), longitude: String(location.longitude), timezone: "auto", forecast_days: "7", current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,precipitation", hourly: "temperature_2m,weather_code,precipitation_probability,relative_humidity_2m,wind_speed_10m", daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,sunrise,sunset" });
  const airParams = new URLSearchParams({ latitude: String(location.latitude), longitude: String(location.longitude), timezone: "auto", forecast_days: "2", current: "us_aqi,pm2_5", hourly: "us_aqi,pm2_5" });
  const [weatherResponse, airResponse] = await Promise.all([
    fetch(`https://api.open-meteo.com/v1/forecast?${params}`),
    fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${airParams}`),
  ]);
  if (!weatherResponse.ok) throw new Error("天气数据暂时不可用，请稍后再试");
  const weather = (await weatherResponse.json()) as Omit<ForecastData, "airQuality">;
  const air = airResponse.ok ? await airResponse.json() as AirQuality : INITIAL_FORECAST.airQuality;
  return { ...weather, airQuality: air };
}

function Metric({ label, value, unit, icon, detail }: { label: string; value: string; unit?: string; icon: string; detail?: string }) {
  return <div className="metric-card"><span className="metric-icon" aria-hidden="true">{icon}</span><div><span className="metric-label">{label}</span><strong>{value}<em>{unit}</em></strong>{detail && <small>{detail}</small>}</div></div>;
}

function LineChart({ values, color, max, min }: { values: number[]; color: string; max?: number; min?: number }) {
  const width = 310;
  const height = 92;
  const upper = max ?? Math.max(...values, 1);
  const lower = min ?? Math.min(...values, 0);
  const span = Math.max(upper - lower, 1);
  const points = values.map((value, index) => `${(index / Math.max(values.length - 1, 1)) * width},${height - ((value - lower) / span) * (height - 10) - 5}`).join(" ");
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  return <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="天气趋势折线图"><defs><linearGradient id={`gradient-${color.replace("#", "")}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".22" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs><polygon points={areaPoints} fill={`url(#gradient-${color.replace("#", "")})`} /><polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{values.map((value, index) => <circle key={`${value}-${index}`} cx={(index / Math.max(values.length - 1, 1)) * width} cy={height - ((value - lower) / span) * (height - 10) - 5} r="3.5" fill="#fff" stroke={color} strokeWidth="2" />)}</svg>;
}

function trendSummary(forecast: ForecastData) {
  const first = forecast.daily.temperature_2m_max[0] ?? 0;
  const last = forecast.daily.temperature_2m_max.at(-1) ?? first;
  const rainDays = forecast.daily.precipitation_probability_max.filter((value) => value >= 60).length;
  const delta = Math.round(last - first);
  if (rainDays >= 5) return { title: "湿润天气将持续", copy: `未来 7 天有 ${rainDays} 天降雨概率超过 60%，体感会比温度更潮湿，出门建议随身带伞。`, tone: "rainy" };
  if (delta <= -3) return { title: "温度逐步下降", copy: `最高温度预计下降 ${Math.abs(delta)}°，早晚温差变得明显，薄外套会更舒服。`, tone: "cooling" };
  if (delta >= 3) return { title: "气温逐步回升", copy: `最高温度预计上升 ${delta}°，午后会更暖，适合把户外行程放在清晨或傍晚。`, tone: "warming" };
  return { title: "天气整体平稳", copy: "未来几天温度变化温和，降雨和风力没有明显增强，按今天的节奏安排出行即可。", tone: "steady" };
}

export default function WeatherDashboard({ user, signInHref, signOutHref }: { user: UserSnapshot; signInHref: string; signOutHref: string }) {
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [forecast, setForecast] = useState<ForecastData>(INITIAL_FORECAST);
  const [query, setQuery] = useState("香港");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [favorites, setFavorites] = useState<string[]>([]);

  const loadWeather = async (nextLocation: LocationResult) => {
    setIsLoading(true); setError("");
    try { const nextForecast = await fetchForecast(nextLocation); setForecast(nextForecast); setLocation(nextLocation); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "天气数据暂时不可用"); }
    finally { setIsLoading(false); }
  };

  // 远程天气请求需要在客户端挂载后进行，避免把实时数据写入服务端渲染结果。
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadWeather(DEFAULT_LOCATION); }, []);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("isobar-favorites");
      if (saved) queueMicrotask(() => setFavorites(JSON.parse(saved) as string[]));
    } catch {
      // 本地偏好不可用时继续使用空收藏夹。
    }
  }, []);

  const currentMeta = weatherMeta(forecast.current.weather_code);
  const firstDate = forecast.daily.time[0] ?? new Date().toISOString().slice(0, 10);
  const hourlyStart = useMemo(() => { const currentHour = forecast.current.time.slice(0, 13); const match = forecast.hourly.time.findIndex((time) => time >= currentHour); return match >= 0 ? match : 0; }, [forecast]);
  const hours = forecast.hourly.time.slice(hourlyStart, hourlyStart + 8).map((time, index) => ({ time, temperature: forecast.hourly.temperature_2m[hourlyStart + index], code: forecast.hourly.weather_code[hourlyStart + index], rain: forecast.hourly.precipitation_probability[hourlyStart + index], humidity: forecast.hourly.relative_humidity_2m[hourlyStart + index], wind: forecast.hourly.wind_speed_10m[hourlyStart + index], air: forecast.airQuality.hourly.us_aqi[index] ?? forecast.airQuality.current.us_aqi }));
  const trend = trendSummary(forecast);
  const isFavorite = favorites.includes(location.name);

  const toggleFavorite = () => {
    const next = isFavorite ? favorites.filter((name) => name !== location.name) : [...favorites, location.name];
    setFavorites(next); window.localStorage.setItem("isobar-favorites", JSON.stringify(next));
  };

  const submitSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const cleaned = query.trim(); if (!cleaned) return;
    try { const nextLocation = await searchLocation(cleaned); await loadWeather(nextLocation); }
    catch (searchError) { setError(searchError instanceof Error ? searchError.message : "搜索失败"); }
  };

  const aqiLabel = forecast.airQuality.current.us_aqi <= 50 ? "优" : forecast.airQuality.current.us_aqi <= 100 ? "良" : "需要留意";
  const chartSeries = [
    { label: "温度", value: `${Math.round(forecast.current.temperature_2m)}°`, unit: "℃", detail: "接下来 8 小时", values: hours.map((hour) => hour.temperature), color: "#ff8b68", max: 35, min: 20, icon: "◒" },
    { label: "湿度", value: `${Math.round(forecast.current.relative_humidity_2m)}`, unit: "%", detail: "空气中的水分", values: hours.map((hour) => hour.humidity), color: "#6b9cff", max: 100, min: 40, icon: "◌" },
    { label: "风速", value: `${Math.round(forecast.current.wind_speed_10m)}`, unit: " km/h", detail: "平均风力", values: hours.map((hour) => hour.wind), color: "#63b7a5", max: 30, min: 0, icon: "≋" },
    { label: "空气质量", value: `${Math.round(forecast.airQuality.current.us_aqi)}`, unit: " AQI", detail: `当前${aqiLabel}`, values: hours.map((hour) => hour.air), color: "#9b83d4", max: 150, min: 0, icon: "✦" },
  ];

  return <main className="app-shell">
    <header className="app-header">
      <a className="brand" href="#top" aria-label="isobar 天气首页"><span className="brand-symbol"><i /><i /><i /></span><span>isobar<span className="brand-dot">.</span></span></a>
      <nav className="primary-nav" aria-label="主导航"><a className="active" href="#today">概览</a><a href="#forecast">7 天预报</a><a href="#insights">趋势分析</a><a href="#favorites">收藏夹</a></nav>
      <div className="header-actions"><form className="searchbox" onSubmit={submitSearch}><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="搜索城市" placeholder="搜索城市" /><button type="submit" aria-label="搜索" disabled={isLoading}>↵</button></form><button className="icon-button favorite-button" onClick={() => document.getElementById("favorites")?.scrollIntoView({ behavior: "smooth" })} aria-label="查看收藏夹">♡<span>{favorites.length}</span></button>{user ? <button className="account-chip" onClick={() => setProfileOpen(true)}><span className="avatar">{user.displayName.slice(0, 1).toUpperCase()}</span><span className="account-name">{user.displayName}</span></button> : <button className="sign-in-button" onClick={() => { setAuthMode("login"); setAuthOpen(true); }}>登录 / 注册</button>}</div>
    </header>

    <section className="hero" id="top"><div><p className="eyebrow"><span className="eyebrow-dot" /> 实时天气 · {location.timezone.replace("_", " ")}</p><h1>{location.name}，<br /><span>今天适合怎样出门？</span></h1><p className="hero-copy">用一眼就能读懂的天气，把每天的决定变得轻一点。</p></div><div className="hero-side"><div className="location-pill"><span className="location-pin">⌖</span><span><strong>{location.name}</strong><small>{location.admin1 || location.country || "已定位城市"}</small></span><span className="live-pulse" title="数据正在更新" /></div><button className={`save-location ${isFavorite ? "saved" : ""}`} onClick={toggleFavorite}>{isFavorite ? "已收藏" : "收藏这个城市"} <span>{isFavorite ? "★" : "＋"}</span></button></div></section>

    <section className="current-layout" id="today"><article className={`current-card ${currentMeta.tone}`}><div className="card-heading"><span>现在 · {getLocalHour(forecast.current.time)}</span><span className="status-chip">{isLoading ? "同步中" : "已更新"}</span></div><div className="current-main"><div><p className="date-line">{formatDate(firstDate)}</p><div className="temperature"><span>{Math.round(forecast.current.temperature_2m)}</span><sup>°</sup></div><p className="condition"><span className="condition-icon">{currentMeta.icon}</span>{currentMeta.label}</p><p className="feels">体感温度 {Math.round(forecast.current.apparent_temperature)}° · 降雨量 {forecast.current.precipitation.toFixed(1)} mm</p></div><div className="weather-orbit" aria-hidden="true"><span className="orbit-ring ring-one" /><span className="orbit-ring ring-two" /><span className="orbit-star star-one">✦</span><span className="orbit-star star-two">·</span><span className="orbit-weather">{currentMeta.icon}</span></div></div><div className="metric-row"><Metric label="湿度" value={String(Math.round(forecast.current.relative_humidity_2m))} unit="%" icon="◌" detail="相对湿度" /><Metric label="风速" value={String(Math.round(forecast.current.wind_speed_10m))} unit=" km/h" icon="≋" detail="当前风力" /><Metric label="降雨量" value={forecast.current.precipitation.toFixed(1)} unit=" mm" icon="⌁" detail="过去一小时" /><Metric label="空气质量" value={String(Math.round(forecast.airQuality.current.us_aqi))} unit=" AQI" icon="✦" detail={aqiLabel} /></div></article><aside className="insight-card"><div className="card-heading"><span>出门提示</span><span className="mini-icon">✦</span></div><div className="insight-graphic" aria-hidden="true"><span className="sun-shape" /><span className="cloud-shape cloud-a" /><span className="cloud-shape cloud-b" /><span className="rain-line rain-a" /><span className="rain-line rain-b" /><span className="rain-line rain-c" /></div><div className="insight-copy"><p className="insight-kicker">雨势提醒</p><h2>{forecast.daily.precipitation_probability_max[0] >= 70 ? "今天会下雨，记得带伞。" : "今天适合轻装出门。"}</h2><p>未来几小时降雨概率 {Math.round(hours[0]?.rain ?? forecast.daily.precipitation_probability_max[0])}%</p></div><div className="insight-footer"><span>日出 {getLocalHour(forecast.daily.sunrise[0])}</span><span>日落 {getLocalHour(forecast.daily.sunset[0])}</span></div></aside></section>

    {error && <p className="error-banner" role="alert">{error}</p>}
    <section className="section-block hourly-block"><div className="section-heading"><div><p className="section-label">下一步</p><h2>未来 24 小时</h2></div><span>每小时更新</span></div><div className="hourly-strip">{hours.map((hour, index) => { const meta = weatherMeta(hour.code); return <div className={`hour-card ${index === 0 ? "selected" : ""}`} key={`${hour.time}-${index}`}><span className="hour-time">{index === 0 ? "现在" : getLocalHour(hour.time)}</span><span className={`hour-icon ${meta.tone}`}>{meta.icon}</span><strong>{Math.round(hour.temperature)}°</strong><span className="hour-rain"><i style={{ height: `${Math.max(5, hour.rain)}%` }} />{Math.round(hour.rain)}%</span></div>; })}</div></section>

    <section className="section-block charts-block" id="insights"><div className="section-heading"><div><p className="section-label">看见变化</p><h2>天气数据图表</h2></div><span>未来 8 小时走势</span></div><div className="chart-grid">{chartSeries.map((chart) => <article className="chart-card" key={chart.label}><div className="chart-top"><span className="chart-icon" style={{ color: chart.color }}>{chart.icon}</span><div><span>{chart.label}</span><strong>{chart.value}<em>{chart.unit}</em></strong></div><span className="chart-detail">{chart.detail}</span></div><LineChart values={chart.values.length ? chart.values : [0]} color={chart.color} max={chart.max} min={chart.min} /><div className="chart-axis"><span>现在</span><span>+4 小时</span><span>+8 小时</span></div></article>)}</div></section>

    <section className="section-block trend-layout"><article className={`trend-card ${trend.tone}`}><div className="section-heading"><div><p className="section-label">天气观察</p><h2>{trend.title}</h2></div><span>未来 7 天</span></div><p>{trend.copy}</p><div className="trend-bars">{forecast.daily.temperature_2m_max.map((value, index) => <div className="trend-bar" key={`${value}-${index}`}><span style={{ height: `${Math.max(22, Math.min(100, value * 2.2))}%` }} /><small>{formatDay(forecast.daily.time[index], index)}</small></div>)}</div></article><article className="air-card"><div className="section-heading"><div><p className="section-label">空气质量</p><h2>今天呼吸起来 {aqiLabel}</h2></div><span>{Math.round(forecast.airQuality.current.us_aqi)} AQI</span></div><div className="air-gauge"><div className="gauge-ring" style={{ ["--gauge" as string]: `${Math.min(100, forecast.airQuality.current.us_aqi)}%` }}><strong>{Math.round(forecast.airQuality.current.us_aqi)}</strong><small>AQI</small></div><div><p>PM2.5 <strong>{forecast.airQuality.current.pm2_5.toFixed(1)}</strong> μg/m³</p><p className="air-copy">空气状态适合正常户外活动，敏感人群可留意午后风向变化。</p></div></div></article></section>

    <section className="section-block week-block" id="forecast"><div className="section-heading"><div><p className="section-label">慢慢看</p><h2>未来 7 天</h2></div><span>最高 / 最低温度</span></div><div className="week-list">{forecast.daily.time.map((day, index) => { const meta = weatherMeta(forecast.daily.weather_code[index]); return <div className={`day-row ${index === 0 ? "today" : ""}`} key={day}><div className="day-name"><strong>{formatDay(day, index)}</strong><small>{day.slice(5).replace("-", "/")}</small></div><span className={`day-icon ${meta.tone}`}>{meta.icon}</span><span className="day-label">{meta.label}</span><div className="temp-range"><span>{Math.round(forecast.daily.temperature_2m_min[index])}°</span><div><i style={{ left: `${Math.min(84, Math.max(5, forecast.daily.temperature_2m_min[index] * 2))}%`, right: `${Math.max(5, 100 - forecast.daily.temperature_2m_max[index] * 2)}%` }} /></div><strong>{Math.round(forecast.daily.temperature_2m_max[index])}°</strong></div><span className="rain-chance">{Math.round(forecast.daily.precipitation_probability_max[index])}% <small>降雨</small></span><span className="rain-total">{(forecast.daily.precipitation_sum[index] ?? 0).toFixed(1)} mm</span></div>; })}</div></section>

    <section className="section-block favorites-block" id="favorites"><div className="section-heading"><div><p className="section-label">你的城市</p><h2>收藏夹</h2></div><span>{favorites.length ? `${favorites.length} 个城市` : "还没有收藏"}</span></div>{favorites.length ? <div className="favorite-list">{favorites.map((name) => <button className="favorite-city" key={name} onClick={() => { setQuery(name); void (async () => { const next = await searchLocation(name); await loadWeather(next); })(); }}><span className="favorite-pin">⌖</span><span><strong>{name}</strong><small>点击查看实时天气</small></span><span>→</span></button>)}</div> : <div className="empty-favorites"><span>♡</span><p>把常看的城市放在这里，下一次打开会更快。</p><button onClick={toggleFavorite}>收藏 {location.name}</button></div>}</section>

    <footer className="footer" id="about"><div><span className="footer-mark">isobar.</span><p>把天气变成更轻松的决定。</p></div><div className="source-note"><span>数据来源</span><a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a><small>免费公开天气模型 · {isLoading ? "正在同步" : "刚刚更新"}</small></div></footer>

    {(authOpen || profileOpen) && <div className="modal-backdrop" role="presentation"><section className="account-modal" role="dialog" aria-modal="true" aria-labelledby="account-title">{profileOpen && user ? <><button className="modal-close" onClick={() => setProfileOpen(false)} aria-label="关闭">×</button><p className="section-label">个人中心</p><h2 id="account-title">你好，{user.displayName}</h2><p className="modal-copy">你的天气偏好和收藏城市都在这里。我们会把常用位置记在当前设备上。</p><div className="profile-card"><span className="avatar large">{user.displayName.slice(0, 1).toUpperCase()}</span><div><strong>{user.displayName}</strong><small>{user.email}</small></div></div><div className="profile-stats"><span><strong>{favorites.length}</strong><small>收藏城市</small></span><span><strong>7</strong><small>天预报</small></span><span><strong>4</strong><small>数据维度</small></span></div><a className="modal-secondary" href={signOutHref} target="_top">退出登录</a></> : <><button className="modal-close" onClick={() => setAuthOpen(false)} aria-label="关闭">×</button><div className="auth-tabs"><button className={authMode === "login" ? "active" : ""} onClick={() => setAuthMode("login")}>登录</button><button className={authMode === "register" ? "active" : ""} onClick={() => setAuthMode("register")}>注册</button></div><p className="section-label">{authMode === "login" ? "欢迎回来" : "创建你的天气空间"}</p><h2 id="account-title">{authMode === "login" ? "登录后，收藏你的城市。" : "注册一个更懂你的天气账号。"}</h2><p className="modal-copy">登录和注册使用 ChatGPT 账号，安全、快速，不需要额外记住一组密码。</p><a className="modal-primary" href={signInHref} target="_top">使用 ChatGPT {authMode === "login" ? "登录" : "注册并登录"} <span>→</span></a><p className="modal-footnote">继续即表示你同意天气服务的使用条款。</p></>}</section></div>}
  </main>;
}
