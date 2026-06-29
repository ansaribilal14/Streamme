// src/middleware/auth.ts
import type { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/database.js';

export function getPinHash(): string | undefined {
  const row = getDb().prepare(`SELECT value FROM settings WHERE key = 'admin_pin_hash'`).get() as { value: string } | undefined;
  return row?.value;
}

export function setPinHash(hash: string): void {
  getDb().prepare(`
    INSERT INTO settings (key, value) VALUES ('admin_pin_hash', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(hash);
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const hash = getPinHash();
  if (!hash) return false;
  try { return await bcrypt.compare(pin, hash); } catch { return false; }
}

export function hasPinSet(): boolean {
  return !!getPinHash();
}

export async function adminGuard(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const pin = req.headers['x-admin-pin'] as string | undefined;
  if (!pin) {
    reply.code(401).send({ error: 'PIN required', code: 401 });
    return;
  }
  const ok = await verifyPin(pin);
  if (!ok) {
    reply.code(403).send({ error: 'Invalid PIN', code: 403 });
    return;
  }
}
