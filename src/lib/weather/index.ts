import { OpenMeteoProvider } from './open-meteo';
import type { WeatherProvider } from './types';

export type { WeatherNow, WeatherProvider } from './types';
export { OpenMeteoProvider } from './open-meteo';

/** Default live-weather provider for the app (Phase 1: Open-Meteo). */
export const weatherProvider: WeatherProvider = new OpenMeteoProvider();
