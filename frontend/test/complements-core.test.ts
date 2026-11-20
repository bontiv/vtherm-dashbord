// @vitest-environment happy-dom
/** The adapter of the store (the Marketplace or HACS), the states of the add-ons, the sanitizer of the descriptions and the model that the pages share. */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HACS, MARKETPLACE, MIN_HACS_VERSION, StoreClient, StoreError, compareVersions, detectStore, storeLink } from "../src/complements/store-client.ts";
import { displayName, isEnglishFallback } from "../src/complements/display.ts";
import { ComplementsModel } from "../src/complements/model.ts";
import { configFlowPath, deduceState, updateOf } from "../src/complements/states.ts";
import type { Complement, StoreRepository } from "../src/complements/types.ts";
import { catalogAnswer, complement as makeComplement, createFakeStore, withHandlers } from "./support/fake-store.ts";

const complement = (fields: Record<string, unknown> = {}) => makeComplement(fields) as unknown as Complement;
const repo = (fields: Partial<StoreRepository> = {}): StoreRepository => ({ id: "1", full_name: "owner/add-on", category: "integration", installed: false, status: "default", installed_version: null, available_version: null, config_flow: true, ...fields });
const hacsClient = (hass: never) => new StoreClient(hass, HACS);
const connection = (hacs = createFakeStore()) => ({ callWS: vi.fn(async (message: Record<string, unknown>) => hacs.handle(message)) }) as never;

describe("the adapter of HACS", () => {
  it("reads the version and the categories of HACS", async () => {
    const status = await hacsClient(connection()).status();
    expect(status).toEqual({ kind: "ready", store: "hacs", version: "2.0.5", categories: ["integration", "plugin", "theme"], warningAccepted: true, githubConnected: true });
  });

  it("says that HACS is absent when Home Assistant does not know its commands", async () => {
    expect(await hacsClient(connection(createFakeStore({ absent: true }))).status()).toEqual({ kind: "absent" });
  });

  it("gives the reason that HACS gives when it is disabled", async () => {
    expect(await hacsClient(connection(createFakeStore({ disabledReason: "rate_limit" }))).status()).toEqual({ kind: "disabled", store: "hacs", reason: "rate_limit" });
  });

  it("refuses a version of HACS older than the one that was checked", async () => {
    expect(await hacsClient(connection(createFakeStore({ version: "1.34.0" }))).status()).toEqual({ kind: "unsupported", store: "hacs", version: "1.34.0" });
    expect((await hacsClient(connection(createFakeStore({ version: MIN_HACS_VERSION }))).status()).kind).toBe("ready");
  });

  it("compares versions by their numbers", () => {
    expect(compareVersions("2.0.5", "2.0.10")).toBeLessThan(0);
    expect(compareVersions("v2.1", "2.0.9")).toBeGreaterThan(0);
    expect(compareVersions("2.0.0-beta.1", "2.0.0")).toBe(0);
  });

  it("does not understand an answer that has no version", async () => {
    const hass = { callWS: vi.fn().mockResolvedValue({ stage: "running" }) } as never;
    expect((await hacsClient(hass).status()).kind).toBe("broken");
  });

  it("lists the repositories of some categories, and checks the shape of the answer", async () => {
    const fake = createFakeStore({ repositories: [{ id: "1", full_name: "o/a", category: "integration" }, { id: "2", full_name: "o/b", category: "plugin" }] });
    const list = await hacsClient(connection(fake)).list(["plugin"]);
    expect(list.map((item) => item.full_name)).toEqual(["o/b"]);
    await expect(hacsClient(connection(createFakeStore({ listAnswer: { not: "a list" } }))).list(["plugin"])).rejects.toMatchObject({ code: "unexpected_response" });
    await expect(hacsClient(connection(createFakeStore({ listAnswer: [{ foo: 1 }] }))).list(["plugin"])).rejects.toMatchObject({ code: "unexpected_response" });
  });

  it("adds a repository that HACS does not have, checks it, then downloads it", async () => {
    const fake = createFakeStore({ addable: ["owner/add-on"] });
    const steps: string[] = [];
    const outcome = await hacsClient(connection(fake)).install(complement({ name: "Add-on" }), ["integration"], (step) => steps.push(step));
    expect(steps).toEqual(["checking", "adding", "verifying", "downloading", "done"]);
    expect(fake.commands()).toEqual(["hacs/repositories/list", "hacs/repositories/add", "hacs/repositories/list", "hacs/repository/download", "hacs/repositories/list"]);
    expect(fake.received[1]).toMatchObject({ repository: "owner/add-on", category: "integration" });
    expect(outcome.repository.installed).toBe(true);
  });

  it("does not add a repository that HACS already has", async () => {
    const fake = createFakeStore({ repositories: [{ id: "7", full_name: "Owner/Add-on", category: "integration" }] });
    await hacsClient(connection(fake)).install(complement({ name: "Add-on" }), ["integration"]);
    expect(fake.commands()).not.toContain("hacs/repositories/add");
    expect(fake.received.find((message) => message["type"] === "hacs/repository/download")).toMatchObject({ repository: "7" });
  });

  it("notices that HACS silently refused the repository", async () => {
    const fake = createFakeStore({ addable: [] });
    await expect(hacsClient(connection(fake)).install(complement({ name: "Add-on" }), ["integration"])).rejects.toMatchObject({ code: "add_refused" });
    expect(fake.commands()).not.toContain("hacs/repository/download");
  });

  it("gives the message of HACS when the download fails", async () => {
    const fake = createFakeStore({ repositories: [{ id: "7", full_name: "owner/add-on", category: "integration" }], downloadErrors: { "owner/add-on": "No release found" } });
    await expect(hacsClient(connection(fake)).install(complement({ name: "Add-on" }), ["integration"])).rejects.toMatchObject({ code: "store_error", message: "No release found" });
  });

  it("reports a command that HACS no longer knows, so that the page can link to HACS", async () => {
    const fake = createFakeStore({ addable: ["owner/add-on"], unknownCommands: ["hacs/repositories/add"] });
    await expect(hacsClient(connection(fake)).install(complement({ name: "Add-on" }), ["integration"])).rejects.toMatchObject({ code: "interface_changed" });
  });

  it("refuses a category that HACS does not offer, and an add-on that is not installable", async () => {
    await expect(hacsClient(connection()).install(complement({ hacs_category: "theme" }), ["integration"])).rejects.toBeInstanceOf(StoreError);
    await expect(hacsClient(connection()).install(complement({ type: "blueprint", hacs_category: null }), ["integration"])).rejects.toMatchObject({ code: "unexpected_response" });
  });

  it("tells whether a restart is pending, and whether the page must be reloaded", async () => {
    const fake = createFakeStore({ repositories: [{ id: "7", full_name: "owner/add-on", category: "integration" }, { id: "8", full_name: "owner/card", category: "plugin" }], afterDownload: (repository) => { repository.status = repository.category === "integration" ? "pending-restart" : "installed"; } });
    const integration = await hacsClient(connection(fake)).install(complement({ name: "Add-on" }), ["integration", "plugin"]);
    expect(integration).toMatchObject({ restartRequired: true, reloadPage: false });
    const card = await hacsClient(connection(fake)).install(complement({ name: "Card", type: "interface", hacs_category: "plugin" }), ["integration", "plugin"]);
    expect(card).toMatchObject({ restartRequired: false, reloadPage: true });
  });

  it("links to the repository in HACS, or to HACS", () => {
    expect(storeLink("hacs", repo({ id: "42" }))).toBe("/hacs/repository/42");
    expect(storeLink("hacs", undefined)).toBe("/hacs");
  });
});

describe("the state of an add-on", () => {
  const ha = (fields: Partial<Complement["ha"]> = {}) => ({ found: true, loaded: false, config_entries: 0, config_flow: false, ...fields });

  it("is not installed when neither Home Assistant nor HACS has it", () => {
    expect(deduceState(complement(), undefined)).toBe("not_installed");
    expect(deduceState(complement(), repo())).toBe("not_installed");
  });

  it("requires a restart when HACS downloaded the integration and waits for it", () => {
    expect(deduceState(complement(), repo({ installed: true, status: "pending-restart" }))).toBe("restart_required");
  });

  it("is to configure once the integration is loaded, declares a config flow and has no entry", () => {
    expect(deduceState(complement({ ha: ha({ loaded: true, config_flow: true }) }), repo({ installed: true }))).toBe("to_configure");
  });

  it("is configured with at least one entry", () => {
    expect(deduceState(complement({ ha: ha({ loaded: true, config_flow: true, config_entries: 2 }) }), repo({ installed: true }))).toBe("configured");
  });

  it("is installed when it was installed without HACS, or has no config flow", () => {
    expect(deduceState(complement({ ha: ha({ loaded: true }) }), undefined)).toBe("installed");
    expect(deduceState(complement({ ha: ha({ loaded: true, config_flow: false }) }), repo({ installed: true }))).toBe("installed");
  });

  it("is to configure at once when HACS reloaded the custom components, without a restart", () => {
    expect(deduceState(complement({ ha: ha({ loaded: false, config_flow: true }) }), repo({ installed: true, status: "installed" }))).toBe("to_configure");
  });

  it("is the same after a restart that only changed what Home Assistant says", () => {
    const before = deduceState(complement({ ha: ha({ loaded: false, config_flow: true }) }), repo({ installed: true, status: "pending-restart" }));
    const after = deduceState(complement({ ha: ha({ loaded: true, config_flow: true }) }), repo({ installed: true, status: "installed" }));
    expect([before, after]).toEqual(["restart_required", "to_configure"]);
  });

  it("is installed for an interface add-on that HACS downloaded", () => {
    const card = complement({ type: "interface", hacs_category: "plugin", ha: ha() });
    expect(deduceState(card, undefined)).toBe("not_installed");
    expect(deduceState(card, repo({ category: "plugin", installed: true }))).toBe("installed");
  });

  it("is a link only for what the dashboard does not install", () => {
    expect(deduceState(complement({ type: "blueprint", hacs_category: null }), undefined)).toBe("link_only");
    expect(deduceState(complement({ type: "mystery", known_type: false, hacs_category: null }), undefined)).toBe("link_only");
  });

  it("gives the address of the config flow of Home Assistant", () => {
    expect(configFlowPath("my_domain")).toBe("/config/integrations/dashboard/add?domain=my_domain");
  });
});

describe("the name of an add-on", () => {
  it("loses the experimental prefix, whatever its case", () => {
    expect(displayName("[EXPERIMENTAL] An assistant")).toEqual({ name: "An assistant", experimental: true });
    expect(displayName("[experimental] An assistant")).toEqual({ name: "An assistant", experimental: true });
    expect(displayName("[Experimental]An assistant")).toEqual({ name: "An assistant", experimental: true });
  });

  it("is kept when there is no prefix", () => {
    expect(displayName("Versatile Card UI")).toEqual({ name: "Versatile Card UI", experimental: false });
    expect(displayName("A [EXPERIMENTAL] card").experimental).toBe(false);
  });

  it("marks an English text only for a user who reads another language", () => {
    expect(isEnglishFallback("en", "fr")).toBe(true);
    expect(isEnglishFallback("fr", "fr-CA")).toBe(false);
    expect(isEnglishFallback("en", "en-GB")).toBe(false);
  });
});

describe("the update of an add-on", () => {
  it("is offered when the available version differs from the installed one", () => {
    expect(updateOf(repo({ installed: true, installed_version: "1.2.0", available_version: "1.3.0" }))).toEqual({ installed: "1.2.0", available: "1.3.0" });
  });

  it("is not offered when the versions are equal", () => {
    expect(updateOf(repo({ installed: true, installed_version: "1.2.0", available_version: "1.2.0" }))).toBeUndefined();
    expect(updateOf(repo({ installed: true, installed_version: "1.2.0", available_version: null }))).toBeUndefined();
  });

  it("is offered when HACS says pending-upgrade", () => {
    expect(updateOf(repo({ installed: true, status: "pending-upgrade", installed_version: "1.2.0", available_version: "1.2.0" }))).toEqual({ installed: "1.2.0", available: "1.2.0" });
  });

  it("is not offered for a repository that is not installed, or unknown", () => {
    expect(updateOf(repo({ installed: false, installed_version: null, available_version: "2.0.0" }))).toBeUndefined();
    expect(updateOf(undefined)).toBeUndefined();
  });
});

describe("the model", () => {
  let model: ComplementsModel;
  let hass: { callWS: ReturnType<typeof vi.fn>; callService: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    model = new ComplementsModel();
    hass = { callWS: vi.fn(), callService: vi.fn() };
  });
  const serve = (answers: Record<string, unknown>, hacs = createFakeStore()) => {
    withHandlers(hass as never, hacs.handle, async (message) => answers[String(message["type"])]);
    model.attach(hass as never);
    return hacs;
  };

  it("reads the catalog and HACS together", async () => {
    serve({ "vtherm_dashboard/get_complements": catalogAnswer([complement() as never]) }, createFakeStore({ repositories: [{ id: "1", full_name: "owner/add-on", category: "integration", installed: true }] }));
    await model.load();
    expect(model.response?.complements).toHaveLength(1);
    expect(model.store.kind).toBe("ready");
    expect(model.stateOf(model.response!.complements[0]!)).toBe("installed");
  });

  it("keeps the catalog readable without HACS, and does not install", async () => {
    serve({ "vtherm_dashboard/get_complements": catalogAnswer([complement() as never]) }, createFakeStore({ absent: true }));
    await model.load();
    expect(model.store).toEqual({ kind: "absent" });
    expect(model.canInstall(model.response!.complements[0]!)).toBe(false);
  });

  it("keeps the last catalog when a later read fails, and remembers the error", async () => {
    serve({ "vtherm_dashboard/get_complements": catalogAnswer([complement() as never]) });
    await model.load();
    hass.callWS.mockImplementation(async (message: Record<string, unknown>) => {
      if (message["type"] === "vtherm_dashboard/get_complements") {
        throw { code: "catalog_unavailable", message: "x" };
      }
      return undefined;
    });
    await model.load(true);
    expect(model.loadError).toBe("catalog_unavailable");
    expect(model.response?.complements).toHaveLength(1);
  });

  describe("what needs an action", () => {
    const ha = (fields: Partial<Complement["ha"]> = {}) => ({ found: true, loaded: true, config_entries: 0, config_flow: false, ...fields });
    const load = async (item: Record<string, unknown>, repository: Record<string, unknown>) => {
      serve({ "vtherm_dashboard/get_complements": catalogAnswer([makeComplement(item) as never]) }, createFakeStore({ repositories: [{ id: "1", full_name: "owner/add-on", category: "integration", installed: true, ...repository }] }));
      await model.load();
      return model.response!.complements[0]!;
    };

    it("is true for an add-on to configure", async () => {
      expect(model.needsAction(await load({ ha: ha({ config_flow: true }) }, {}))).toBe(true);
    });

    it("is true for an add-on that waits for a restart", async () => {
      expect(model.needsAction(await load({ ha: ha() }, { status: "pending-restart" }))).toBe(true);
    });

    it("is true for a configured add-on with an update, and gives the versions", async () => {
      const item = await load({ ha: ha({ config_entries: 1, config_flow: true }) }, { installed_version: "1.2.0", available_version: "1.3.0" });
      expect(model.stateOf(item)).toBe("configured");
      expect(model.updateOf(item)).toEqual({ installed: "1.2.0", available: "1.3.0" });
      expect(model.needsAction(item)).toBe(true);
    });

    it("is false for a configured add-on without update", async () => {
      expect(model.needsAction(await load({ ha: ha({ config_entries: 1, config_flow: true }) }, { installed_version: "1.2.0", available_version: "1.2.0" }))).toBe(false);
    });
  });

  it("keeps the criteria of the lists until it is reset", () => {
    model.criteria.set("page", { query: "a", type: "", family: "", certification: "", state: "", sort: "name" });
    expect(model.criteria.get("page")?.query).toBe("a");
    model.reset();
    expect(model.criteria.size).toBe(0);
  });

  it("shows the catalog before HACS answers, and does not install meanwhile", async () => {
    const hacs = createFakeStore({ repositories: [{ id: "1", full_name: "owner/add-on", category: "integration" }] });
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    withHandlers(hass as never, async (message) => {
      if (String(message["type"]).startsWith("hacs/")) {
        await held;
      }
      return hacs.handle(message);
    }, async (message) => (message["type"] === "vtherm_dashboard/get_complements" ? catalogAnswer([complement() as never]) : undefined));
    model.attach(hass as never);
    const loading = model.load();
    await vi.waitFor(() => expect(model.storeLoading).toBe(true));
    const item = model.response!.complements[0]!;
    expect(model.canInstall(item)).toBe(false);
    release();
    await loading;
    expect(model.storeLoading).toBe(false);
    expect(model.canInstall(item)).toBe(true);
  });

  it("installs an add-on, then reads everything again", async () => {
    const hacs = serve({ "vtherm_dashboard/get_complements": catalogAnswer([complement({ name: "Add-on" }) as never]) }, createFakeStore({ addable: ["owner/add-on"], afterDownload: (repository) => { repository.status = "pending-restart"; } }));
    await model.load();
    const item = model.response!.complements[0]!;
    expect(model.canInstall(item)).toBe(true);
    await model.install(item);
    expect(hacs.commands()).toContain("hacs/repository/download");
    expect(model.progressOf(item).outcome?.restartRequired).toBe(true);
    expect(model.stateOf(item)).toBe("restart_required");
    expect(model.canInstall(item)).toBe(false);
  });

  it("keeps the error of a failed installation, and lets the user try again", async () => {
    serve({ "vtherm_dashboard/get_complements": catalogAnswer([complement({ name: "Add-on" }) as never]) }, createFakeStore({ repositories: [{ id: "7", full_name: "owner/add-on", category: "integration" }], downloadErrors: { "owner/add-on": "boom" } }));
    await model.load();
    const item = model.response!.complements[0]!;
    await model.install(item);
    expect(model.progressOf(item).error).toEqual({ code: "store_error", message: "boom" });
    expect(model.canInstall(item)).toBe(true);
  });

  it("restarts Home Assistant, waits for the connection to come back, and reads the states again", async () => {
    serve({ "vtherm_dashboard/get_complements": catalogAnswer([complement() as never]), get_config: {} });
    await model.load();
    let calls = 0;
    const answer = hass.callWS.getMockImplementation() as (message: Record<string, unknown>) => Promise<unknown>;
    hass.callWS.mockImplementation(async (message: Record<string, unknown>) => {
      if (message["type"] === "get_config") {
        calls += 1;
        if (calls === 2 || calls === 3) {
          throw new Error("connection lost");
        }
        return {};
      }
      return answer(message);
    });
    model.restartOptions = { intervalMs: 1, timeoutMs: 100, sleep: () => Promise.resolve() };
    const reads = hass.callWS.mock.calls.filter(([message]) => message.type === "vtherm_dashboard/get_complements").length;
    await model.restartHomeAssistant();
    expect(hass.callService).toHaveBeenCalledWith("homeassistant", "restart");
    expect(model.restart).toBe("idle");
    expect(hass.callWS.mock.calls.filter(([message]) => message.type === "vtherm_dashboard/get_complements").length).toBe(reads + 1);
  });

  it("gives up when Home Assistant does not come back", async () => {
    serve({ get_config: undefined });
    hass.callWS.mockRejectedValue(new Error("lost"));
    model.restartOptions = { intervalMs: 10, timeoutMs: 30, sleep: () => Promise.resolve() };
    await model.restartHomeAssistant();
    expect(model.restart).toBe("timeout");
  });
});

describe("the choice of the store", () => {
  it("uses the Marketplace when Home Assistant knows its commands, without asking HACS", async () => {
    const fake = createFakeStore({ store: "marketplace", warningAccepted: false, githubConnected: false });
    const { status, client } = await detectStore(connection(fake));
    expect(status).toEqual({ kind: "ready", store: "marketplace", version: "2026.11.0", categories: ["integration", "plugin", "theme"], warningAccepted: false, githubConnected: false });
    expect(client?.backend).toBe(MARKETPLACE);
    expect(fake.commands()).toEqual(["marketplace/info"]);
  });

  it("says that the Marketplace is not loaded, without asking HACS", async () => {
    const fake = createFakeStore({ store: "marketplace", notLoaded: true });
    expect((await detectStore(connection(fake))).status).toEqual({ kind: "not_loaded", store: "marketplace" });
    expect(fake.commands()).toEqual(["marketplace/info"]);
  });

  it("falls back on HACS when Home Assistant does not know the commands of the Marketplace", async () => {
    const fake = createFakeStore();
    const { status, client } = await detectStore(connection(fake));
    expect(status).toMatchObject({ kind: "ready", store: "hacs", warningAccepted: true, githubConnected: true });
    expect(client?.backend).toBe(HACS);
    expect(fake.commands()).toEqual(["marketplace/info", "hacs/info"]);
  });

  it("finds no store when Home Assistant knows neither", async () => {
    expect(await detectStore(connection(createFakeStore({ absent: true })))).toEqual({ status: { kind: "absent" }, client: undefined });
  });

  it("gives the reason of the Marketplace when it is disabled", async () => {
    expect((await detectStore(connection(createFakeStore({ store: "marketplace", disabledReason: "rate_limit" })))).status).toEqual({ kind: "disabled", store: "marketplace", reason: "rate_limit" });
  });

  it("does not check the version of the Marketplace against the one of HACS", async () => {
    expect((await detectStore(connection(createFakeStore({ store: "marketplace", version: "1.0.0" })))).status.kind).toBe("ready");
  });

  it("links to the page of a repository in the Marketplace, or to the Marketplace", () => {
    expect(storeLink("marketplace", repo({ id: "42" }))).toBe("/marketplace/repository/42");
    expect(storeLink("marketplace", undefined)).toBe("/marketplace");
  });
});

describe("the installation by the Marketplace", () => {
  const marketplace = (fake: ReturnType<typeof createFakeStore>) => new StoreClient(connection(fake), MARKETPLACE);

  it("adds the repository, checks it, installs it, and needs no restart for a new integration", async () => {
    const fake = createFakeStore({ store: "marketplace", addable: ["owner/add-on"] });
    const steps: string[] = [];
    const outcome = await marketplace(fake).install(complement({ name: "Add-on" }), ["integration"], (step) => steps.push(step));
    expect(steps).toEqual(["checking", "adding", "verifying", "downloading", "done"]);
    expect(fake.commands()).toEqual(["marketplace/repositories/list", "marketplace/repositories/add", "marketplace/repositories/list", "marketplace/repository/install", "marketplace/repositories/list"]);
    expect(fake.received[1]).toEqual({ type: "marketplace/repositories/add", repository: "owner/add-on", category: "integration" });
    expect(fake.received[3]).toEqual({ type: "marketplace/repository/install", repository: "1001" });
    expect(outcome).toMatchObject({ restartRequired: false, reloadPage: false });
  });

  it("says that a restart is needed when the Marketplace says so", async () => {
    const fake = createFakeStore({
      store: "marketplace",
      repositories: [{ id: "7", full_name: "owner/add-on", category: "integration" }],
      afterDownload: (repository) => {
        repository.status = "pending-restart";
      },
    });
    expect(await marketplace(fake).install(complement({ name: "Add-on" }), ["integration"])).toMatchObject({ restartRequired: true });
  });

  it("gives the message of the Marketplace when it refuses to add the repository", async () => {
    const fake = createFakeStore({ store: "marketplace" });
    await expect(marketplace(fake).install(complement({ name: "Add-on" }), ["integration"])).rejects.toMatchObject({ code: "store_error", message: "Could not add owner/add-on: the repository is not valid." });
    expect(fake.commands()).not.toContain("marketplace/repository/install");
  });

  it("installs a repository that the Marketplace knows but did not list yet", async () => {
    const fake = createFakeStore({ store: "marketplace", unlisted: [{ id: "9", full_name: "owner/add-on", category: "integration" }] });
    const outcome = await marketplace(fake).install(complement({ name: "Add-on" }), ["integration"]);
    expect(outcome.repository.id).toBe("9");
    expect(fake.commands()).toContain("marketplace/repository/install");
  });

  it("tells apart the warning not accepted and GitHub not connected from a changed interface", async () => {
    await expect(marketplace(createFakeStore({ store: "marketplace", warningAccepted: false, repositories: [{ id: "7", full_name: "owner/add-on", category: "integration" }] })).install(complement({ name: "Add-on" }), ["integration"])).rejects.toMatchObject({
      code: "warning_not_accepted",
    });
    await expect(marketplace(createFakeStore({ store: "marketplace", githubConnected: false, addable: ["owner/add-on"] })).install(complement({ name: "Add-on" }), ["integration"])).rejects.toMatchObject({ code: "github_not_connected" });
  });
});

describe("the model with the Marketplace", () => {
  let model: ComplementsModel;
  let hass: { callWS: ReturnType<typeof vi.fn>; callService: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    model = new ComplementsModel();
    hass = { callWS: vi.fn(), callService: vi.fn() };
  });
  const serve = (fake: ReturnType<typeof createFakeStore>, catalog: () => unknown = () => catalogAnswer([complement({ name: "Add-on" }) as never])) => {
    withHandlers(hass as never, fake.handle, async (message) => (message["type"] === "vtherm_dashboard/get_complements" ? catalog() : undefined));
    model.attach(hass as never);
    return fake;
  };

  it("does not install before the warning of the Marketplace is accepted", async () => {
    serve(createFakeStore({ store: "marketplace", warningAccepted: false, addable: ["owner/add-on"] }));
    await model.load();
    const item = model.response!.complements[0]!;
    expect(model.storeKind).toBe("marketplace");
    expect(model.installBlocker(item)).toBe("warning_not_accepted");
    expect(model.canInstall(item)).toBe(false);
  });

  it("without GitHub, installs only the add-ons whose repository the Marketplace knows", async () => {
    serve(createFakeStore({ store: "marketplace", githubConnected: false, repositories: [{ id: "8", full_name: "owner/known", category: "integration" }] }), () =>
      catalogAnswer([complement({ name: "Add-on" }) as never, complement({ name: "Known" }) as never]),
    );
    await model.load();
    const [unknown, known] = model.response!.complements;
    expect(model.installBlocker(unknown!)).toBe("github_not_connected");
    expect(model.canInstall(unknown!)).toBe(false);
    expect(model.installBlocker(known!)).toBeUndefined();
    expect(model.canInstall(known!)).toBe(true);
  });

  it("never blocks with HACS, which asks for neither", async () => {
    serve(createFakeStore({ addable: ["owner/add-on"] }));
    await model.load();
    const item = model.response!.complements[0]!;
    expect(model.storeKind).toBe("hacs");
    expect(model.installBlocker(item)).toBeUndefined();
    expect(model.canInstall(item)).toBe(true);
  });

  it("knows that no store answered", async () => {
    serve(createFakeStore({ absent: true }));
    await model.load();
    expect(model.storeKind).toBeUndefined();
    expect(model.installBlocker(model.response!.complements[0]!)).toBeUndefined();
  });

  it("deduces 'to configure' after an installation without restart, once Home Assistant knows the config flow", async () => {
    let installed = false;
    const fake = serve(
      createFakeStore({
        store: "marketplace",
        addable: ["owner/add-on"],
        afterDownload: () => {
          installed = true;
        },
      }),
      // The Marketplace reloaded the custom components: the server finds the integration and its config flow.
      () => catalogAnswer([complement({ name: "Add-on", ha: { found: installed, loaded: false, config_entries: 0, config_flow: installed } }) as never]),
    );
    await model.load();
    await model.install(model.response!.complements[0]!);
    const item = model.response!.complements[0]!;
    expect(fake.commands()).toContain("marketplace/repository/install");
    expect(model.progressOf(item).outcome?.restartRequired).toBe(false);
    expect(model.stateOf(item)).toBe("to_configure");
  });

  it("deduces 'restart required' when the Marketplace waits for a restart", async () => {
    serve(
      createFakeStore({
        store: "marketplace",
        addable: ["owner/add-on"],
        afterDownload: (repository) => {
          repository.status = "pending-restart";
        },
      }),
    );
    await model.load();
    await model.install(model.response!.complements[0]!);
    expect(model.stateOf(model.response!.complements[0]!)).toBe("restart_required");
  });
});
