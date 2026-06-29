// src/middleware/cors.ts
import cors from '@fastify/cors';

export async function setupCors(app: any) {
  await app.register(cors, {
    origin: (origin: string | undefined, cb: (err: Error | null, ok?: boolean) => void) => {
      // Allow same-origin (no Origin header) and any localhost / LAN
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('space-z.ai')) {
        cb(null, true);
        return;
      }
      // Allow LAN IPs
      if (/^https?:\/\/192\.168\./.test(origin) || /^https?:\/\/10\./.test(origin)) {
        cb(null, true);
        return;
      }
      cb(null, true); // Permissive - this is a personal app
    },
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH', 'OPTIONS'],
  });
}
