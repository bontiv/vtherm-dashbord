// @vitest-environment happy-dom
/** The adapter of HACS, the states of the add-ons, the sanitizer of the descriptions and the model that the pages share. */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HacsClient, HacsError, MIN_HACS_VERSION, compareVersions, hacsLink } from "../src/complements/hacs-client.ts";
import { displayName, isEnglishFallback } from "../src/complements/display.ts";
import { ComplementsModel } from "../src/complements/model.ts";
import { configFlowPath, deduceState, updateOf } from "../src/complements/states.ts";
import type { Complement, HacsRepository } from "../src/complements/types.ts";
import { catalogAnswer, complement as makeComplement, createFakeHacs, withHandlers } from "./support/fake-hacs.ts";

const complement = (fields: Record<string, unknown> = {}) => makeComplement(fields) as unknown as Complement;
const repo = (fields: Partial<HacsRepository> = {}): HacsRepository => ({ id: "1", full_name: "owner/add-on", category: "integration", installed: false, status: "default", installed_version: null, available_version: null, config_flow: true, ...fields });
const connection = (hacs = createFakeHacs()) => ({ callWS: vi.fn(async (message: Record<string, unknown>) => hacs.handle(message)) }) as never;

describe("the adapter of HACS", () => {
  it("reads the version and the categories of HACS", async () => {
    const status = await new HacsClient(connection()).status();
    expect(status).toEqual({ kind: "ready", version: "2.0.5", categories: ["integration", "plugin", "theme"] });
  });

  it("says that HACS is absent when Home Assistant does not know its commands", async () => {
    expect(await new HacsClient(connection(createFakeHacs({ absent: true }))).status()).toEqual({ kind: "absent" });
  });

  it("gives the reason that HACS gives when it is disabled", async () => {
    expect(await new HacsClient(connection(createFakeHacs({ disabledReason: "rate_limit" }))).status()).toEqual({ kind: "disabled", reason: "rate_limit" });
  });

  it("refuses a version of HACS older than the one that was checked", async () => {
    expect(await new HacsClient(connection(createFakeHacs({ version: "1.34.0" }))).status()).toEqual({ kind: "unsupported", version: "1.34.0" });
    expect((await new HacsClient(connection(createFakeHacs({ version: MIN_HACS_VERSION }))).status()).kind).toBe("ready");
  });

  it("compares versions by their numbers", () => {
    expect(compareVersions("2.0.5", "2.0.10")).toBeLessThan(0);
    expect(compareVersions("v2.1", "2.0.9")).toBeGreaterThan(0);
    expect(compareVersions("2.0.0-beta.1", "2.0.0")).toBe(0);
  });

  it("does not understand an answer that has no version", async () => {
    const hass = { callWS: vi.fn().mockResolvedValue({ stage: "running" }) } as never;
    expect((await new HacsClient(hass).status()).kind).toBe("broken");
  });

  it("lists the repositories of some categories, and checks the shape of the answer", async () => {
    const fake = createFakeHacs({ repositories: [{ id: "1", full_name: "o/a", category: "integration" }, { id: "2", full_name: "o/b", category: "plugin" }] });
    const list = await new HacsClient(connection(fake)).list(["plugin"]);
    expect(list.map((item) => item.full_name)).toEqual(["o/b"]);
    await expect(new HacsClient(connection(createFakeHacs({ listAnswer: { not: "a list" } }))).list(["plugin"])).rejects.toMatchObject({ code: "unexpected_response" });
    await expect(new HacsClient(connection(createFakeHacs({ listAnswer: [{ foo: 1 }] }))).list(["plugin"])).rejects.toMatchObject({ code: "unexpected_response" });
  });

  it("adds a repository that HACS does not have, checks it, then downloads it", async () => {
    const fake = createFakeHacs({ addable: ["owner/add-on"] });
    const steps: string[] = [];
    const outcome = await new HacsClient(connection(fake)).install(complement({ name: "Add-on" }), ["integration"], (step) => steps.push(step));
    expect(steps).toEqual(["checking", "adding", "verifying", "downloading", "done"]);
    expect(fake.commands()).toEqual(["hacs/repositories/list", "hacs/repositories/add", "hacs/repositories/list", "hacs/repository/download", "hacs/repositories/list"]);
    expect(fake.received[1]).toMatchObject({ repository: "owner/add-on", category: "integration" });
    expect(outcome.repository.installed).toBe(true);
  });

  it("does not add a repository that HACS already has", async () => {
    const fake = createFakeHacs({ repositories: [{ id: "7", full_name: "Owner/Add-on", category: "integration" }] });
    await new HacsClient(connection(fake)).install(complement({ name: "Add-on" }), ["integration"]);
    expect(fake.commands()).not.toContain("hacs/repositories/add");
    expect(fake.received.find((message) => message["type"] === "hacs/repository/download")).toMatchObject({ repository: "7" });
  });

  it("notices that HACS silently refused the repository", async () => {
    const fake = createFakeHacs({ addable: [] });
    await expect(new HacsClient(connection(fake)).install(complement({ name: "Add-on" }), ["integration"])).rejects.toMatchObject({ code: "add_refused" });
    expect(fake.commands()).not.toContain("hacs/repository/download");
  });

  it("gives the message of HACS when the download fails", async () => {
    const fake = createFakeHacs({ repositories: [{ id: "7", full_name: "owner/add-on", category: "integration" }], downloadErrors: { "owner/add-on": "No release found" } });
    await expect(new HacsClient(connection(fake)).install(complement({ name: "Add-on" }), ["integration"])).rejects.toMatchObject({ code: "hacs_error", message: "No release found" });
  });

  it("reports a command that HACS no longer knows, so that the page can link to HACS", async () => {
    const fake = createFakeHacs({ addable: ["owner/add-on"], unknownCommands: ["hacs/repositories/add"] });
    await expect(new HacsClient(connection(fake)).install(complement({ name: "Add-on" }), ["integration"])).rejects.toMatchObject({ code: "interface_changed" });
  });

  it("refuses a category that HACS does not offer, and an add-on that is not installable", async () => {
    await expect(new HacsClient(connection()).install(complement({ hacs_category: "theme" }), ["integration"])).rejects.toBeInstanceOf(HacsError);
    await expect(new HacsClient(connection()).install(complement({ type: "blueprint", hacs_category: null }), ["integration"])).rejects.toMatchObject({ code: "unexpected_response" });
  });

  it("tells whether a restart is pending, and whether the page must be reloaded", async () => {
    const fake = createFakeHacs({ repositories: [{ id: "7", full_name: "owner/add-on", category: "integration" }, { id: "8", full_name: "owner/card", category: "plugin" }], afterDownload: (repository) => { repository.status = repository.category === "integration" ? "pending-restart" : "installed"; } });
    const integration = await new HacsClient(connection(fake)).install(complement({ name: "Add-on" }), ["integration", "plugin"]);
    expect(integration).toMatchObject({ restartRequired: true, reloadPage: false });
    const card = await new HacsClient(connection(fake)).install(complement({ name: "Card", type: "interface", hacs_category: "plugin" }), ["integration", "plugin"]);
    expect(card).toMatchObject({ restartRequired: false, reloadPage: true });
  });

  it("links to the repository in HACS, or to HACS", () => {
    expect(hacsLink(repo({ id: "42" }))).toBe("/hacs/repository/42");
    expect(hacsLink(undefined)).toBe("/hacs");
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
  const serve = (answers: Record<string, unknown>, hacs = createFakeHacs()) => {
    withHandlers(hass as never, hacs.handle, async (message) => answers[String(message["type"])]);
    model.attach(hass as never);
    return hacs;
  };

  it("reads the catalog and HACS together", async () => {
    serve({ "vtherm_dashboard/get_complements": catalogAnswer([complement() as never]) }, createFakeHacs({ repositories: [{ id: "1", full_name: "owner/add-on", category: "integration", installed: true }] }));
    await model.load();
    expect(model.response?.complements).toHaveLength(1);
    expect(model.hacs.kind).toBe("ready");
    expect(model.stateOf(model.response!.complements[0]!)).toBe("installed");
  });

  it("keeps the catalog readable without HACS, and does not install", async () => {
    serve({ "vtherm_dashboard/get_complements": catalogAnswer([complement() as never]) }, createFakeHacs({ absent: true }));
    await model.load();
    expect(model.hacs).toEqual({ kind: "absent" });
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
      serve({ "vtherm_dashboard/get_complements": catalogAnswer([makeComplement(item) as never]) }, createFakeHacs({ repositories: [{ id: "1", full_name: "owner/add-on", category: "integration", installed: true, ...repository }] }));
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
    const hacs = createFakeHacs({ repositories: [{ id: "1", full_name: "owner/add-on", category: "integration" }] });
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
    await vi.waitFor(() => expect(model.hacsLoading).toBe(true));
    const item = model.response!.complements[0]!;
    expect(model.canInstall(item)).toBe(false);
    release();
    await loading;
    expect(model.hacsLoading).toBe(false);
    expect(model.canInstall(item)).toBe(true);
  });

  it("installs an add-on, then reads everything again", async () => {
    const hacs = serve({ "vtherm_dashboard/get_complements": catalogAnswer([complement({ name: "Add-on" }) as never]) }, createFakeHacs({ addable: ["owner/add-on"], afterDownload: (repository) => { repository.status = "pending-restart"; } }));
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
    serve({ "vtherm_dashboard/get_complements": catalogAnswer([complement({ name: "Add-on" }) as never]) }, createFakeHacs({ repositories: [{ id: "7", full_name: "owner/add-on", category: "integration" }], downloadErrors: { "owner/add-on": "boom" } }));
    await model.load();
    const item = model.response!.complements[0]!;
    await model.install(item);
    expect(model.progressOf(item).error).toEqual({ code: "hacs_error", message: "boom" });
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
