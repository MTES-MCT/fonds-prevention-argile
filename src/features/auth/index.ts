/**
 * Export principal de la feature auth
 * Par défaut, réexporte tout depuis server.ts (usage serveur)
 *
 * Usage :
 * - import { ... } from '@/features/auth'           → server.ts
 * - import { ... } from '@/features/auth/client'    → client.ts
 * - import { ... } from '@/features/auth/edge'      → edge.ts
 */

export * from "./server";
