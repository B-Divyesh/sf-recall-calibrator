import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('static deployment policy', () => {
  const config = JSON.parse(readFileSync(new URL('../public/staticwebapp.config.json', import.meta.url), 'utf8')) as {
    globalHeaders: Record<string, string>;
    mimeTypes: Record<string, string>;
    routes: Array<{ route: string; headers?: Record<string, string> }>;
  };

  it('ships an enforceable document, frame, permissions, and manifest policy', () => {
    expect(config.globalHeaders['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(config.globalHeaders['Content-Security-Policy']).toContain("script-src 'self'");
    expect(config.globalHeaders['Permissions-Policy']).toContain('camera=()');
    expect(config.globalHeaders['X-Frame-Options']).toBe('DENY');
    expect(config.mimeTypes['.webmanifest']).toBe('application/manifest+json');
  });

  it('keeps versioned assets immutable while allowing the worker and manifest to update', () => {
    const headersFor = (route: string) => config.routes.find((entry) => entry.route === route)?.headers?.['Cache-Control'];
    expect(headersFor('/assets/*')).toBe('public, max-age=31536000, immutable');
    expect(headersFor('/service-worker.js')).toBe('no-cache');
    expect(headersFor('/manifest.webmanifest')).toBe('no-cache');
  });
});
