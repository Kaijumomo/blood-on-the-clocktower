import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  __setEnvOverrideForTests,
  clearFirebaseConfig,
  getConfigSource,
  isFirebaseConfigured,
  loadFirebaseConfig,
  saveFirebaseConfig,
} from "./config";

beforeEach(() => {
  localStorage.clear();
  // Override env so tests aren't shadowed by a real .env.local. Pass an
  // empty bag — readFromEnv returns null and the localStorage fallback path
  // is exercised.
  __setEnvOverrideForTests({});
});

afterEach(() => {
  __setEnvOverrideForTests(null);
});

const validCfg = {
  apiKey: "AIzaSyTEST",
  databaseURL: "https://example-default-rtdb.firebaseio.com",
  projectId: "example-project",
};

describe("FirebaseConfig", () => {
  it("returns null when nothing is stored", () => {
    expect(loadFirebaseConfig()).toBeNull();
    expect(isFirebaseConfigured()).toBe(false);
  });

  it("round-trips a valid config", () => {
    saveFirebaseConfig(validCfg);
    expect(isFirebaseConfigured()).toBe(true);
    expect(loadFirebaseConfig()).toEqual(validCfg);
  });

  it("rejects a config missing required fields", () => {
    expect(() =>
      // @ts-expect-error intentionally malformed
      saveFirebaseConfig({ apiKey: "" })
    ).toThrow(/Invalid Firebase config/);
    expect(() =>
      // @ts-expect-error intentionally malformed
      saveFirebaseConfig({ apiKey: "x", databaseURL: "" })
    ).toThrow(/Invalid Firebase config/);
  });

  it("returns null on corrupted localStorage entry", () => {
    localStorage.setItem("new-blood-fb-config", "not-json{");
    expect(loadFirebaseConfig()).toBeNull();
  });

  it("returns null when stored value is missing required fields", () => {
    localStorage.setItem(
      "new-blood-fb-config",
      JSON.stringify({ apiKey: "x" })
    );
    expect(loadFirebaseConfig()).toBeNull();
  });

  it("clearFirebaseConfig removes the entry", () => {
    saveFirebaseConfig(validCfg);
    clearFirebaseConfig();
    expect(loadFirebaseConfig()).toBeNull();
  });
});

describe("FirebaseConfig — env precedence", () => {
  it("env vars take priority over localStorage", () => {
    saveFirebaseConfig(validCfg);
    __setEnvOverrideForTests({
      VITE_FIREBASE_API_KEY: "ENV_KEY",
      VITE_FIREBASE_DATABASE_URL: "https://env-default-rtdb.firebaseio.com",
      VITE_FIREBASE_PROJECT_ID: "env-project",
    });
    const loaded = loadFirebaseConfig();
    expect(loaded?.apiKey).toBe("ENV_KEY");
    expect(loaded?.projectId).toBe("env-project");
    expect(getConfigSource()).toBe("env");
  });

  it("falls back to localStorage when env is incomplete", () => {
    saveFirebaseConfig(validCfg);
    __setEnvOverrideForTests({
      VITE_FIREBASE_API_KEY: "ENV_KEY",
      // missing databaseURL/projectId
    });
    const loaded = loadFirebaseConfig();
    expect(loaded?.apiKey).toBe(validCfg.apiKey);
    expect(getConfigSource()).toBe("localStorage");
  });

  it("getConfigSource is 'none' when neither env nor storage has config", () => {
    expect(getConfigSource()).toBe("none");
    expect(isFirebaseConfigured()).toBe(false);
  });
});
