/**
 * Utilitaire de logging conditionnel basé sur les variables d'environnement
 *
 * Usage:
 * ```typescript
 * import { createDebugLogger } from '@/shared/utils';
 *
 * const debug = createDebugLogger('PARCOURS'); // Utilise DEBUG_PARCOURS
 * debug.log('Message');
 * debug.error('Erreur');
 * debug.warn('Attention');
 * ```
 */

type LogLevel = "log" | "error" | "warn" | "info" | "debug";

interface DebugLogger {
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}

/**
 * Crée un logger conditionnel basé sur une variable d'environnement
 * @param envKey - Clé de la variable d'environnement (sans le préfixe DEBUG_)
 * @returns Logger conditionnel
 */
export function createDebugLogger(envKey: string): DebugLogger {
  const envVar = `DEBUG_${envKey}`;
  const isEnabled = process.env[envVar] === "true";

  const createLogMethod = (level: LogLevel) => {
    return (...args: unknown[]) => {
      if (isEnabled) {
        const prefix = `[${envKey}]`;
        console[level](prefix, ...args);
      }
    };
  };

  return {
    log: createLogMethod("log"),
    error: createLogMethod("error"),
    warn: createLogMethod("warn"),
    info: createLogMethod("info"),
    debug: createLogMethod("debug"),
  };
}

/**
 * Logger global activable via DEBUG_ALL=true
 */
export const globalDebug = createDebugLogger("ALL");
