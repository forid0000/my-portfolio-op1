'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  MoonStar,
  MapPin,
  Sunrise,
  Sunset,
  Sun,
  CloudSun,
  AlertTriangle,
  ShieldAlert,
  Wifi,
  WifiOff,
  Coffee,
  Utensils,
  Clock,
  Wind,
  Droplets,
  Thermometer,
} from 'lucide-react';

// --- LOCATIONS ---
// `tz` drives the live clock (prayer times are local to the location), `method` /
// `school` are Aladhan calculation settings, `region` toggles region-specific
// extras (the Bangla calendar date). "My location" (browser geolocation) is added
// at runtime and leaves method/school unset so Aladhan picks the regional default.
interface Place {
  lat: number;
  lon: number;
  tz: string;
  method?: number;
  school?: number;
  region?: 'BD';
}

// Bangladesh: University of Islamic Sciences, Karachi (method 1) + Hanafi Asr (school 1).
const bd = (lat: number, lon: number): Place => ({
  lat,
  lon,
  tz: 'Asia/Dhaka',
  method: 1,
  school: 1,
  region: 'BD',
});

// Umm Al-Qura University, Makkah (method 4) + standard Asr.
const HOLY_CITIES: Record<string, Place> = {
  Makkah: { lat: 21.3891, lon: 39.8579, tz: 'Asia/Riyadh', method: 4, school: 0 },
  Madinah: { lat: 24.5247, lon: 39.5692, tz: 'Asia/Riyadh', method: 4, school: 0 },
};

const DISTRICT_DATA: Record<string, Place> = {
  Dhaka: bd(23.8103, 90.4125),
  Chittagong: bd(22.3569, 91.7832),
  Khulna: bd(22.8456, 89.5403),
  Rajshahi: bd(24.3636, 88.6241),
  Sylhet: bd(24.8949, 91.8687),
  Barisal: bd(22.701, 90.3535),
  Rangpur: bd(25.7439, 89.2752),
  Mymensingh: bd(24.7471, 90.4203),
  Comilla: bd(23.4607, 91.1809),
  Gazipur: bd(24.0023, 90.4264),
  Narayanganj: bd(23.6238, 90.5),
  Bogra: bd(24.8481, 89.373),
  Jessore: bd(23.1634, 89.2182),
  "Cox's Bazar": bd(21.4272, 92.0058),
  Feni: bd(23.0186, 91.3966),
  Faridpur: bd(23.6071, 89.8429),
  Dinajpur: bd(25.6217, 88.6355),
  Pabna: bd(24.004, 89.25),
  Tangail: bd(24.2513, 89.9167),
  Kushtia: bd(23.9013, 89.1204),
  Noakhali: bd(22.8724, 91.0973),
  Gopalganj: bd(23.0051, 89.8267),
  Kishoreganj: bd(24.4449, 90.7765),
  Jamalpur: bd(24.9375, 89.9378),
  Sherpur: bd(25.0205, 90.0153),
  Netrokona: bd(24.8709, 90.7279),
  Munshiganj: bd(23.5422, 90.5305),
  Manikganj: bd(23.8617, 90.0003),
  Narsingdi: bd(23.9229, 90.7177),
  Bagerhat: bd(22.6516, 89.7859),
  Satkhira: bd(22.7185, 89.0705),
  Bhola: bd(22.6859, 90.6482),
  Patuakhali: bd(22.3596, 90.3299),
};

const PLACES: Record<string, Place> = { ...HOLY_CITIES, ...DISTRICT_DATA };
const HOLY_CITY_NAMES = Object.keys(HOLY_CITIES);
const DISTRICT_NAMES = Object.keys(DISTRICT_DATA).sort();

/** Select value that triggers browser geolocation. */
const GEO_KEY = '__my_location__';

// Starting location. Set NEXT_PUBLIC_PRAYER_DEFAULT_CITY to any name listed above
// (e.g. "Dhaka" or "Madinah") to change it.
const DEFAULT_CITY =
  process.env.NEXT_PUBLIC_PRAYER_DEFAULT_CITY && PLACES[process.env.NEXT_PUBLIC_PRAYER_DEFAULT_CITY]
    ? process.env.NEXT_PUBLIC_PRAYER_DEFAULT_CITY
    : 'Makkah';

interface PrayerTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Sunset: string;
  Maghrib: string;
  Isha: string;
  Midnight: string;
  [key: string]: string;
}
interface HijriDate {
  day: string;
  month: { en: string; ar: string };
  year: string;
}
interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  code: number;
  desc: string;
}

// --- Utilities ---
/** "Wall clock" of an IANA time zone as a Date whose local fields read that zone's time. */
const getZonedTime = (timeZone: string) => {
  try {
    return new Date(new Date().toLocaleString('en-US', { timeZone }));
  } catch {
    return new Date();
  }
};

const to12h = (time: string | undefined) => {
  if (!time) return '--:--';
  const [h, m] = time.split(':').map(Number);
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

const parseTime = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const adjustTime = (time: string, mins: number) => {
  const [h, m] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m + mins);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

const getBanglaDate = (date: Date) => {
  const weekDays = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
  const months = [
    'পৌষ',
    'মাঘ',
    'ফাল্গুন',
    'চৈত্র',
    'বৈশাখ',
    'জ্যৈষ্ঠ',
    'আষাঢ়',
    'শ্রাবণ',
    'ভাদ্র',
    'আশ্বিন',
    'কার্তিক',
    'অগ্রহায়ু',
  ];
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();
  const banglaYear = month < 3 || (month === 3 && day < 14) ? year - 594 : year - 593;
  let mIndex = (month + 10) % 12;
  if (day >= 15) mIndex = (mIndex + 1) % 12;
  if (month === 3 && day >= 14) mIndex = 4;
  const convertDigit = (n: number) => n.toString().replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);
  return `${weekDays[date.getDay()]}, ${convertDigit(day)} ${months[mIndex]} ${convertDigit(banglaYear)}`;
};

const getWeatherDesc = (code: number) => {
  if (code === 0) return 'Clear Sky';
  if (code <= 3) return 'Partly Cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 67) return 'Rainy';
  if (code <= 77) return 'Snow/Hail';
  if (code <= 82) return 'Heavy Rain';
  if (code <= 99) return 'Thunderstorm';
  return 'Unknown';
};

// --- Main Component ---
export default function PrayerClient() {
  const [now, setNow] = useState<Date | null>(null);
  const [isSynced, setIsSynced] = useState(true);
  const [selectedCity, setSelectedCity] = useState(DEFAULT_CITY);
  const [geoPlace, setGeoPlace] = useState<Place | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const place: Place =
    selectedCity === GEO_KEY && geoPlace
      ? geoPlace
      : (PLACES[selectedCity] ?? PLACES[DEFAULT_CITY]);
  const { lat, lon, tz, method, school } = place;

  const [timings, setTimings] = useState<PrayerTimings | null>(null);
  const [hijri, setHijri] = useState<HijriDate | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  // Time Sync & Clock Tick (follows the selected location's time zone)
  useEffect(() => {
    setNow(getZonedTime(tz));
    const tick = () => setNow(getZonedTime(tz));
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [tz]);

  // Browser geolocation ("My location"). Coordinates are rounded to ~1 km before
  // they are used, and only sent to the prayer-time and weather APIs.
  const requestLocation = () => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGeoError('Geolocation is not supported by this browser.');
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const round = (n: number) => Math.round(n * 100) / 100;
        setGeoPlace({
          lat: round(pos.coords.latitude),
          lon: round(pos.coords.longitude),
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        });
        setSelectedCity(GEO_KEY);
        setLocating(false);
      },
      () => {
        setGeoError('Location permission was denied or is unavailable.');
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    );
  };

  // Handle Location Change (INSTANT UPDATE for listed cities)
  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const city = e.target.value;
    if (city === GEO_KEY) {
      requestLocation();
      return;
    }
    setGeoError(null);
    setSelectedCity(city);
  };

  // Data Fetch (Prayer)
  useEffect(() => {
    const fetchPrayer = async () => {
      try {
        // Use the /today endpoint to completely bypass client-side timezone bugs
        const params = new URLSearchParams({ latitude: String(lat), longitude: String(lon) });
        if (method !== undefined) params.set('method', String(method));
        if (school !== undefined) params.set('school', String(school));
        const res = await fetch(`https://api.aladhan.com/v1/timings/today?${params.toString()}`);
        const json = await res.json();
        if (json.data) {
          setTimings(json.data.timings);
          setHijri(json.data.date.hijri);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchPrayer();
  }, [lat, lon, method, school]); // Re-run when the location or calculation settings change

  // Weather Fetch (Detailed)
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m`
        );
        const data = await res.json();
        if (data.current) {
          setWeather({
            temp: Math.round(data.current.temperature_2m),
            feelsLike: Math.round(data.current.apparent_temperature),
            humidity: data.current.relative_humidity_2m,
            windSpeed: data.current.wind_speed_10m,
            code: data.current.weather_code,
            desc: getWeatherDesc(data.current.weather_code),
          });
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchWeather();
  }, [lat, lon]); // Re-run when the location changes

  const { status, displayEvents } = useMemo(() => {
    if (!timings || !now) return { status: null, displayEvents: [] };

    const events = [
      {
        id: 'tahajjud',
        name: 'Tahajjud',
        time: adjustTime(timings.Fajr, -90),
        icon: MoonStar,
        type: 'optional',
      },
      {
        id: 'sahur',
        name: 'Sahur Ends',
        time: timings.Fajr,
        icon: Coffee,
        type: 'alert',
      },
      {
        id: 'fajr',
        name: 'Fajr',
        time: timings.Fajr,
        icon: Sunrise,
        type: 'fard',
      },
      {
        id: 'sunrise',
        name: 'Sunrise',
        time: timings.Sunrise,
        icon: Sun,
        type: 'forbidden',
      },
      {
        id: 'ishraq',
        name: 'Ishraq',
        time: adjustTime(timings.Sunrise, 15),
        icon: Sun,
        type: 'optional',
      },
      {
        id: 'zawaal',
        name: 'Zawaal',
        time: adjustTime(timings.Dhuhr, -10),
        icon: ShieldAlert,
        type: 'forbidden',
      },
      {
        id: 'dhuhr',
        name: 'Dhuhr',
        time: timings.Dhuhr,
        icon: Sun,
        type: 'fard',
      },
      { id: 'asr', name: 'Asr', time: timings.Asr, icon: Sun, type: 'fard' },
      {
        id: 'sunset',
        name: 'Sunset',
        time: timings.Maghrib,
        icon: Sunset,
        type: 'forbidden',
      },
      {
        id: 'maghrib',
        name: 'Maghrib',
        time: timings.Maghrib,
        icon: Utensils,
        type: 'fard',
      },
      {
        id: 'isha',
        name: 'Isha',
        time: timings.Isha,
        icon: MoonStar,
        type: 'fard',
      },
      {
        id: 'midnight',
        name: 'Midnight',
        time: timings.Midnight,
        icon: Clock,
        type: 'optional',
      },
    ];

    const nowMins = now.getHours() * 60 + now.getMinutes();
    let activeIndex = events.length - 1;
    for (let i = 0; i < events.length - 1; i++) {
      if (nowMins >= parseTime(events[i].time) && nowMins < parseTime(events[i + 1].time)) {
        activeIndex = i;
        break;
      }
    }
    if (nowMins < parseTime(events[0].time)) activeIndex = events.length - 1;

    const activeEvent = events[activeIndex];
    const nextEvent = events[(activeIndex + 1) % events.length];

    let nextMins = parseTime(nextEvent.time);
    if (nextMins < nowMins) nextMins += 1440;

    const diff = nextMins * 60 - (nowMins * 60 + now.getSeconds());
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;

    const startMins = parseTime(activeEvent.time);
    let total = nextMins - startMins;
    if (total < 0) total += 1440;
    const elapsed = (nowMins < startMins ? nowMins + 1440 : nowMins) - startMins;
    const progress = Math.min(100, Math.max(0, (elapsed / total) * 100));

    const count = events.length;
    const indices = [
      (activeIndex - 2 + count) % count,
      (activeIndex - 1 + count) % count,
      activeIndex,
      (activeIndex + 1) % count,
      (activeIndex + 2) % count,
      (activeIndex + 3) % count,
    ];

    return {
      status: {
        ...activeEvent,
        timeLeft: `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`,
        progress,
        nextName: nextEvent.name,
        nextTime: nextEvent.time,
        isForbidden: activeEvent.type === 'forbidden',
      },
      displayEvents: indices.map((i) => ({
        ...events[i],
        isRef: i === activeIndex,
      })),
    };
  }, [now, timings]);

  if (!now)
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse">
        Initializing Clock...
      </div>
    );

  return (
    // MAIN CONTAINER: Fixed Height for Desktop [650px]
    <div className="w-full h-full lg:h-[650px] flex flex-col lg:flex-row bg-background/50 rounded-3xl overflow-hidden border border-border/10 shadow-sm">
      {/* === LEFT: DASHBOARD (45%) === */}
      <div className="lg:w-[45%] relative flex flex-col items-center justify-center p-6 bg-gradient-to-br from-secondary/5 to-transparent border-b lg:border-b-0 lg:border-r border-border/10">
        {/* TOP HEADER: DATES */}
        <div className="w-full flex justify-between items-start absolute top-4 md:top-8 px-4 md:px-8">
          <div className="flex flex-col">
            <h2 className="text-xl md:text-4xl font-black tracking-tighter text-foreground">
              {now.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
              })}
            </h2>
            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 mt-1">
              {place.region === 'BD' && (
                <>
                  <span className="text-[10px] md:text-base text-muted-foreground font-bangla font-medium">
                    {getBanglaDate(now)}
                  </span>
                  <span className="hidden md:inline text-border/40">|</span>
                </>
              )}
              <span className="text-[10px] md:text-base text-muted-foreground font-mono">
                {hijri ? `${hijri.day} ${hijri.month.en} ${hijri.year}` : '...'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-secondary/20 px-2 py-1 rounded text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {isSynced ? (
              <Wifi className="w-3 h-3 md:w-4 md:h-4 text-primary" />
            ) : (
              <WifiOff className="w-3 h-3 md:w-4 md:h-4 text-destructive" />
            )}
            {isSynced ? 'LIVE' : 'SYS'}
          </div>
        </div>

        {/* TIMER CIRCLE */}
        <div className="relative w-56 h-56 md:w-80 md:h-80 flex items-center justify-center mt-6 md:mt-12">
          <div className="absolute inset-0 rounded-full border-[8px] md:border-[12px] border-secondary/10" />
          <div
            className="absolute inset-0 rounded-full transition-all duration-1000 ease-linear"
            style={{
              background: `conic-gradient(${status?.isForbidden ? 'var(--destructive)' : 'var(--success)'} ${status?.progress || 0}%, transparent 0)`,
              maskImage: 'radial-gradient(transparent 68%, black 69%)',
              WebkitMaskImage: 'radial-gradient(transparent 68%, black 69%)',
            }}
          />
          <div className="flex flex-col items-center z-10 text-center">
            <span
              className={`text-[9px] md:text-xs font-bold uppercase tracking-widest mb-1 md:mb-3 ${status?.isForbidden ? 'text-destructive' : 'text-primary'}`}
            >
              {status?.isForbidden ? 'FORBIDDEN' : 'REMAINING'}
            </span>
            <span className="text-4xl md:text-6xl font-mono font-black tracking-tighter tabular-nums text-foreground">
              {status?.timeLeft}
            </span>
            {status && (
              <div className="mt-2 md:mt-4 flex items-center gap-2 bg-secondary/20 px-3 py-1 md:px-4 md:py-1.5 rounded-full border border-border/5">
                <span className="text-[9px] md:text-xs uppercase text-muted-foreground font-bold">
                  Next:
                </span>
                <span className="text-[10px] md:text-sm font-bold text-foreground">
                  {status.nextName}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM CONTROLS (EXPANDED WEATHER) */}
        <div className="absolute bottom-4 md:bottom-8 left-0 right-0 flex flex-col items-center gap-2">
          {/* Location Selector */}
          <div className="flex items-center gap-2 bg-secondary/10 md:backdrop-blur-sm px-1 py-1 rounded-full border border-border/10">
            <select
              value={selectedCity}
              onChange={handleCityChange}
              aria-label="Location"
              className="bg-transparent text-[10px] md:text-xs pl-3 pr-1 py-1 md:py-1.5 rounded-full appearance-none focus:outline-none cursor-pointer font-bold uppercase"
            >
              <option value={GEO_KEY} className="bg-background">
                {locating ? 'Locating...' : 'My location'}
              </option>
              <optgroup label="Makkah & Madinah" className="bg-background">
                {HOLY_CITY_NAMES.map((d) => (
                  <option key={d} value={d} className="bg-background">
                    {d}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Bangladesh" className="bg-background">
                {DISTRICT_NAMES.map((d) => (
                  <option key={d} value={d} className="bg-background">
                    {d}
                  </option>
                ))}
              </optgroup>
            </select>
            <MapPin className="w-3 h-3 md:w-4 md:h-4 text-primary mr-2" />
          </div>
          {geoError && <p className="text-[10px] md:text-xs text-destructive">{geoError}</p>}

          {/* Detailed Weather Stats */}
          {weather && (
            <div className="flex items-center gap-3 md:gap-4 text-[10px] md:text-xs font-bold text-muted-foreground bg-secondary/5 px-4 py-2 rounded-xl border border-border/5">
              <div className="flex items-center gap-1.5">
                <CloudSun className="w-3 h-3 md:w-4 md:h-4 text-warning" />
                <span className="text-foreground">{weather.temp}°</span>
                <span className="font-normal opacity-70">({weather.desc})</span>
              </div>
              <div className="w-px h-3 bg-border/20" />
              <div className="flex items-center gap-1.5">
                <Thermometer className="w-3 h-3 md:w-4 md:h-4 text-warning" />
                <span>Feel {weather.feelsLike}°</span>
              </div>
              <div className="w-px h-3 bg-border/20 hidden md:block" />
              <div className="hidden md:flex items-center gap-1.5">
                <Droplets className="w-3 h-3 md:w-4 md:h-4 text-info" />
                <span>{weather.humidity}%</span>
              </div>
              <div className="hidden md:flex items-center gap-1.5">
                <Wind className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
                <span>{weather.windSpeed}km</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* === RIGHT: ROTARY SCHEDULE (55%) === */}
      <div className="lg:w-[55%] relative flex flex-col justify-center bg-card/30">
        <div className="w-full max-w-sm md:max-w-md mx-auto px-4 space-y-2 py-4">
          {displayEvents.map((event, i) => {
            const isCenter = event.isRef;
            return (
              <div
                key={`${event.id}-${i}`}
                className={`flex items-center justify-between px-4 md:px-6 rounded-xl border border-transparent transition-all duration-500 ${isCenter ? 'bg-primary/10 border-primary/20 py-3 md:py-5 scale-100 opacity-100 shadow-md' : 'py-1.5 md:py-3 scale-95 opacity-50 grayscale'} ${event.type === 'forbidden' && isCenter ? 'bg-destructive/10 border-destructive/20' : ''}`}
              >
                <div className="flex items-center gap-3 md:gap-5">
                  <div
                    className={`p-1.5 md:p-3 rounded-lg ${isCenter ? (event.type === 'forbidden' ? 'bg-destructive text-primary-foreground' : 'bg-primary text-primary-foreground') : 'bg-secondary/20'}`}
                  >
                    <event.icon className="w-3.5 h-3.5 md:w-6 md:h-6" />
                  </div>
                  <span
                    className={`text-xs md:text-lg font-bold uppercase ${isCenter ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    {event.name}
                  </span>
                </div>
                <span
                  className={`font-mono font-bold ${isCenter ? 'text-xl md:text-3xl text-foreground' : 'text-sm md:text-lg text-muted-foreground'}`}
                >
                  {to12h(event.time)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
