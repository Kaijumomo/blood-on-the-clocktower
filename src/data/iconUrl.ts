// Resolves a role id (or a RoleDef) to an icon image URL.
//
// Default source: the BOTC wiki's stable icon convention. Override at build
// time with `VITE_ICON_BASE_URL` (e.g. point at a self-hosted CDN). If a
// RoleDef carries its own `iconUrl`, that always wins.
//
// Icon loads are lazy and per-component; missing files should fall back to
// the existing text token via the consumer's `onError` handler.

import type { RoleDef } from "@/stores/types";

const DEFAULT_BASE = "https://wiki.bloodontheclocktower.com/images/icons/";

function readBaseUrl(): string {
  // Vite injects env vars onto import.meta.env. Cast through unknown to keep
  // tsc happy without importing vite/client globally.
  const meta = import.meta as unknown as {
    env?: Record<string, string | undefined>;
  };
  const fromEnv = meta.env?.VITE_ICON_BASE_URL;
  const base =
    fromEnv && fromEnv.trim().length > 0 ? fromEnv.trim() : DEFAULT_BASE;
  return base.endsWith("/") ? base : `${base}/`;
}

export function iconUrlFor(roleOrId: string | RoleDef): string {
  if (typeof roleOrId !== "string") {
    if (roleOrId.iconUrl) return roleOrId.iconUrl;
    return iconUrlFor(roleOrId.id);
  }
  const id = roleOrId.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return `${readBaseUrl()}icon_${id}.png`;
}
