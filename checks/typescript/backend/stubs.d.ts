// Server objects the backend-conventions fragments use but don't create.
import type { Express } from "express";
import type { Server } from "node:http";
import type { Pool } from "pg";
import type { Logger } from "pino";
import type { Queue } from "bullmq";
import type { SupabaseClient } from "@supabase/supabase-js";

declare global {
    const app: Express;
    const server: Server;
    const supabaseAdmin: SupabaseClient;
    const pgPool: Pool;
    const redis: { quit(): Promise<unknown> };
    const log: Logger;
    const queue: Queue;
    const job: { id: string };
    const start: number;
    const payload: Record<string, unknown>;
    function flushTelemetry(): Promise<void>;
    function sendEmail(data: unknown): Promise<void>;
    function runCleanupJob(): Promise<void>;
    function verifyAccessToken(token: string): Promise<{ userId: string }>;
}
