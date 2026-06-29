// cs3-bridge/src/services/extensionLoader.js
// Loads provider adapters. In a real CloudStream setup this would scan .cs3
// JAR files and instantiate their MainAPI subclasses. Here we register a set
// of built-in JavaScript providers that implement the same interface.

import { VegaMoviesProvider } from './providers/vegamovies.js';
import { HDHub4uProvider } from './providers/hdhub4u.js';
import { MoviesDriveProvider } from './providers/moviesdrive.js';
import { BollyflixProvider } from './providers/bollyflix.js';
import { CastleTVProvider } from './providers/castletv.js';
import { DemoProvider } from './providers/demo.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function loadProviders(extensionsDir, logger) {
  // Built-in providers that ship with the bridge.
  const builtin = [
    new DemoProvider(),
    new VegaMoviesProvider(),
    new HDHub4uProvider(),
    new MoviesDriveProvider(),
    new BollyflixProvider(),
    new CastleTVProvider(),
  ];

  // Also scan extensions/ for .cs3 marker files. If present, register a
  // generic provider adapter that exposes their metadata. (A future JVM
  // integration can replace this branch.)
  try {
    const abs = path.isAbsolute(extensionsDir) ? extensionsDir : path.resolve(__dirname, '..', extensionsDir);
    if (fs.existsSync(abs)) {
      const files = fs.readdirSync(abs).filter(f => f.endsWith('.cs3'));
      for (const f of files) {
        const name = path.basename(f, '.cs3');
        const exists = builtin.find(p => p.name.toLowerCase() === name.toLowerCase());
        if (!exists) {
          logger.info({ file: f }, 'Detected .cs3 marker file - registered metadata-only provider');
          builtin.push({
            name,
            version: '1.0',
            language: 'en',
            categories: ['movies'],
            async search() { return []; },
            async details() { return null; },
            async episodes() { return []; },
            async streams() { return []; },
          });
        }
      }
    }
  } catch (e) {
    logger.warn({ err: e.message }, 'Failed to scan extensions directory');
  }

  return builtin;
}
