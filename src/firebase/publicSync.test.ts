import { describe, expect, it } from "vitest";
import { MemoryRoomBackend } from "./memoryBackend";
import { subscribeToPublicLobby } from "./publicSync";
import { publicPath } from "./paths";
import { endLobby } from "./lobby";
import type { PublicLobbyRecord } from "@/stores/types";

function makePublic(over: Partial<PublicLobbyRecord> = {}): PublicLobbyRecord {
  return {
    code: "ABCD",
    scriptId: "tb",
    phase: "night",
    day: 1,
    seatOrder: ["p1"],
    players: {
      p1: {
        id: "p1",
        name: "Alice",
        seat: 0,
        alive: true,
        ghostVote: true,
        online: true,
        joinedAt: 1,
        isTraveler: false,
      },
    },
    fabled: [],
    lorics: [],
    ...over,
  };
}

describe("subscribeToPublicLobby — path safety + behavior", () => {
  it("subscribes ONLY to publicPath(code) — no other path is read", () => {
    const backend = new MemoryRoomBackend();
    const unsub = subscribeToPublicLobby(backend, "ABCD", () => {});
    expect(backend.subscribePaths).toEqual([publicPath("ABCD")]);
    // None of the private paths should ever be subscribed to.
    expect(backend.subscribePaths).not.toContain("lobbies/ABCD/storyteller");
    expect(backend.subscribePaths.some((p) => p.startsWith("lobbies/ABCD/player/"))).toBe(false);
    expect(backend.subscribePaths.some((p) => p.startsWith("lobbies/ABCD/roster"))).toBe(false);
    expect(backend.subscribePaths.some((p) => p.startsWith("lobbies/ABCD/presence"))).toBe(false);
    unsub();
  });

  it("invokes the callback with the public record when written", async () => {
    const backend = new MemoryRoomBackend();
    const seen: (PublicLobbyRecord | null)[] = [];
    const unsub = subscribeToPublicLobby(backend, "ABCD", (v) => seen.push(v));
    await backend.set(publicPath("ABCD"), makePublic({ phase: "day", day: 2 }) as never);
    const last = seen[seen.length - 1];
    expect(last).not.toBeNull();
    expect(last!.phase).toBe("day");
    expect(last!.day).toBe(2);
    unsub();
  });

  it("invokes the callback with status='ended' record intact", async () => {
    const backend = new MemoryRoomBackend();
    const seen: (PublicLobbyRecord | null)[] = [];
    const unsub = subscribeToPublicLobby(backend, "ABCD", (v) => seen.push(v));
    await backend.set(
      publicPath("ABCD"),
      makePublic({ status: "ended" }) as never
    );
    const last = seen[seen.length - 1];
    expect(last).not.toBeNull();
    expect(last!.status).toBe("ended");
    unsub();
  });

  it("unsubscribe stops further callbacks", async () => {
    const backend = new MemoryRoomBackend();
    const seen: (PublicLobbyRecord | null)[] = [];
    const unsub = subscribeToPublicLobby(backend, "ABCD", (v) => seen.push(v));
    await backend.set(publicPath("ABCD"), makePublic({ day: 1 }) as never);
    const countBeforeUnsub = seen.length;
    unsub();
    await backend.set(publicPath("ABCD"), makePublic({ day: 9 }) as never);
    expect(seen.length).toBe(countBeforeUnsub);
  });

  // E4 — ended detection via child write + path-deletion teardown
  it("endLobby child write to public/status triggers callback with status=ended", async () => {
    // endLobby writes to lobbies/ABCD/public/status (a child of public/).
    // The subscription is on public/ (the ancestor). RTDB (and MemoryRoomBackend)
    // fire ancestor watchers on descendant writes — verify the integration.
    const backend = new MemoryRoomBackend();
    await backend.set(publicPath("ABCD"), makePublic({ phase: "night" }) as never);

    const seen: (PublicLobbyRecord | null)[] = [];
    const unsub = subscribeToPublicLobby(backend, "ABCD", (v) => seen.push(v));
    // First fire: current value (phase=night, no status).
    expect(seen.length).toBe(1);
    expect(seen[0]!.phase).toBe("night");

    await endLobby(backend, "ABCD");
    unsub();

    // After endLobby, the last callback should carry status=ended.
    const last = seen[seen.length - 1];
    expect(last).not.toBeNull();
    expect(last!.status).toBe("ended");
  });

  it("endLobby path-deletion teardown: storyteller/ and player/{id}/ are null after end", async () => {
    const backend = new MemoryRoomBackend();
    // Pre-populate private paths to confirm they get deleted.
    await backend.set("lobbies/ABCD/storyteller", { secret: "data" });
    await backend.set("lobbies/ABCD/player/p1", { shownRole: "chef" });
    await backend.set("lobbies/ABCD/player/p2", { shownRole: "imp" });

    await endLobby(backend, "ABCD", ["p1", "p2"]);

    // Null-writes delete nodes in RTDB (undefined = absent).
    expect(await backend.get("lobbies/ABCD/storyteller")).toBeUndefined();
    expect(await backend.get("lobbies/ABCD/player/p1")).toBeUndefined();
    expect(await backend.get("lobbies/ABCD/player/p2")).toBeUndefined();
    // public/status was written, not deleted.
    expect(await backend.get("lobbies/ABCD/public/status")).toBe("ended");
  });
});
