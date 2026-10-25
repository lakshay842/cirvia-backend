import { loadEnvConfig, type EnvConfig } from './env.js';

let cachedConfig: EnvConfig | null = null;

export function getConfig(): EnvConfig {
  if (!cachedConfig) {
    cachedConfig = loadEnvConfig();
  }
  return cachedConfig;
}

export function resetConfigForTesting(): void {
  cachedConfig = null;
}

export type { EnvConfig };
