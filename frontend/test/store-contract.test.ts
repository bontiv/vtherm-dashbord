/**
 * The adapter of the store against the answers of the real stores.
 *
 * `shared/hacs-answers.json` holds what the real HACS of `external/hacs` answered to each command of each scenario
 * (`tests/test_hacs_contract.py` records it), and `shared/marketplace-answers.json` what the real Marketplace of Home Assistant 2026.11
 * answered (`tests/test_marketplace_contract.py`). The adapter runs the same scenarios: each command that it sends must be the recorded
 * one, in the recorded order, and it gets the recorded answer.
 */
import { describe, expect, it } from "vitest";

import hacsAnswers from "../../shared/hacs-answers.json" with { type: "json" };
import marketplaceAnswers from "../../shared/marketplace-answers.json" with { type: "json" };
import { HACS, MARKETPLACE, StoreClient, StoreError, detectStore } from "../src/complements/store-client.ts";
import type { StoreBackend } from "../src/complements/store-client.ts";
import type { Complement } from "../src/complements/types.ts";
import { complement as makeComplement } from "./support/fake-store.ts";

/** A command and what the store answered. */
interface Exchange {
  readonly request: Record<string, unknown>;
  readonly result?: unknown;
  readonly error?: { readonly code: string; readonly message: string };
}

type Scenarios = Record<string, readonly Exchange[]>;

/** A connection to Home Assistant that answers as the real store did in a scenario. */
function replay(scenarios: Scenarios, backend: StoreBackend, scenario: string) {
  const pending = [...(scenarios[scenario] ?? [])];
  expect(pending.length, `the scenario ${scenario} was recorded`).toBeGreaterThan(0);
  const callWS = async (message: Record<string, unknown>): Promise<unknown> => {
    const exchange = pending.shift();
    expect(exchange, `the store was not sent ${String(message["type"])} in the scenario ${scenario}`).toBeDefined();
    expect(message).toEqual(exchange?.request);
    if (exchange?.error !== undefined) {
      throw exchange.error;
    }
    return exchange?.result;
  };
  return { client: new StoreClient({ callWS } as never, backend), remaining: () => pending.length };
}

const addon = (slug: string): Complement => makeComplement({ slug, name: slug.split("/")[1] }) as unknown as Complement;

const categoriesOf = (scenarios: Scenarios): readonly string[] => (scenarios["ready"]?.[0]?.result as { categories: string[] }).categories;

describe("the adapter against the answers of the real HACS", () => {
  const scenarios = hacsAnswers.scenarios as unknown as Scenarios;
  const hacs = (scenario: string) => replay(scenarios, HACS, scenario);
  const categories = () => categoriesOf(scenarios);

  it("knows that HACS is absent from the error of Home Assistant", async () => {
    expect(await hacs("absent").client.status()).toEqual({ kind: "absent" });
  });

  it("reads the version and the categories of HACS", async () => {
    expect(await hacs("ready").client.status()).toEqual({ kind: "ready", store: "hacs", version: hacsAnswers.hacs_version, categories: ["integration", "plugin"], warningAccepted: true, githubConnected: true });
  });

  it("gives the reason that HACS gives when it is disabled", async () => {
    expect(await hacs("disabled").client.status()).toEqual({ kind: "disabled", store: "hacs", reason: "rate_limit" });
  });

  it("downloads a repository that HACS already has, without adding it", async () => {
    const { client, remaining } = hacs("install_present");
    const outcome = await client.install(addon("owner/present-addon"), categories());
    expect(outcome.restartRequired).toBe(true);
    expect(outcome.repository).toMatchObject({ id: "101", full_name: "owner/present-addon", installed: true, status: "pending-restart" });
    expect(remaining()).toBe(0);
  });

  it("adds a repository that HACS does not have, checks it, then downloads it", async () => {
    const { client, remaining } = hacs("install_absent");
    const outcome = await client.install(addon("owner/absent-addon"), categories());
    expect(outcome).toMatchObject({ restartRequired: true, reloadPage: false, repository: { id: "102", installed_version: "1.2.0" } });
    expect(remaining()).toBe(0);
  });

  it("notices that HACS refused the repository although it answered without error", async () => {
    const { client, remaining } = hacs("install_refused");
    await expect(client.install(addon("owner/refused-addon"), categories())).rejects.toMatchObject({ code: "add_refused" });
    expect(remaining()).toBe(0);
  });

  it("gives the message of HACS when the download fails", async () => {
    const { client, remaining } = hacs("install_download_error");
    await expect(client.install(addon("owner/failing-addon"), categories())).rejects.toMatchObject({ code: "store_error", message: "No release found" });
    expect(remaining()).toBe(0);
  });

  it("reports a command that HACS no longer knows, so that the page links to HACS", async () => {
    const { client, remaining } = hacs("install_interface_changed");
    const failure = client.install(addon("owner/new-addon"), categories());
    await expect(failure).rejects.toBeInstanceOf(StoreError);
    await expect(failure).rejects.toMatchObject({ code: "interface_changed" });
    expect(remaining()).toBe(0);
  });
});

describe("the adapter against the answers of the real Marketplace", () => {
  const scenarios = marketplaceAnswers.scenarios as unknown as Scenarios;
  const marketplace = (scenario: string) => replay(scenarios, MARKETPLACE, scenario);
  const categories = () => categoriesOf(scenarios);

  it("knows that the Marketplace is absent from the error of Home Assistant", async () => {
    expect(await marketplace("absent").client.status()).toEqual({ kind: "absent" });
  });

  it("falls back on HACS when Home Assistant does not know the Marketplace", async () => {
    const pending = [...(scenarios["absent"] ?? []), ...((hacsAnswers.scenarios as unknown as Scenarios)["ready"] ?? [])];
    const callWS = async (message: Record<string, unknown>): Promise<unknown> => {
      const exchange = pending.shift();
      expect(message).toEqual(exchange?.request);
      if (exchange?.error !== undefined) {
        throw exchange.error;
      }
      return exchange?.result;
    };
    const { status, client } = await detectStore({ callWS } as never);
    expect(status).toMatchObject({ kind: "ready", store: "hacs" });
    expect(client?.backend).toBe(HACS);
    expect(pending).toHaveLength(0);
  });

  it("knows that the Marketplace is there but not loaded", async () => {
    expect(await marketplace("not_loaded").client.status()).toEqual({ kind: "not_loaded", store: "marketplace" });
  });

  it("reads the version, the categories, the warning and GitHub", async () => {
    expect(await marketplace("ready").client.status()).toEqual({ kind: "ready", store: "marketplace", version: marketplaceAnswers.marketplace_version, categories: ["integration", "plugin"], warningAccepted: true, githubConnected: true });
  });

  it("gives the reason that the Marketplace gives when it is disabled", async () => {
    expect(await marketplace("disabled").client.status()).toEqual({ kind: "disabled", store: "marketplace", reason: "rate_limit" });
  });

  it("installs a repository that the Marketplace already has, without adding it, and sees the restart", async () => {
    const { client, remaining } = marketplace("install_present");
    const outcome = await client.install(addon("owner/present-addon"), categories());
    expect(outcome).toMatchObject({ restartRequired: true, repository: { id: "101", installed: true, status: "pending-restart" } });
    expect(remaining()).toBe(0);
  });

  it("needs no restart for a new integration that the Marketplace loaded at once", async () => {
    const { client, remaining } = marketplace("install_without_restart");
    const outcome = await client.install(addon("owner/fresh-addon"), categories());
    expect(outcome).toMatchObject({ restartRequired: false, repository: { id: "104", installed: true, status: "installed" } });
    expect(remaining()).toBe(0);
  });

  it("adds a repository that the Marketplace does not have, checks it, then installs it", async () => {
    const { client, remaining } = marketplace("install_absent");
    const outcome = await client.install(addon("owner/absent-addon"), categories());
    expect(outcome).toMatchObject({ restartRequired: true, reloadPage: false, repository: { id: "102", installed_version: "1.2.0" } });
    expect(remaining()).toBe(0);
  });

  it("gives the message of the Marketplace when it refuses the repository", async () => {
    const { client, remaining } = marketplace("add_failed");
    await expect(client.install(addon("owner/refused-addon"), categories())).rejects.toMatchObject({ code: "store_error", message: expect.stringContaining("owner/refused-addon") });
    expect(remaining()).toBe(0);
  });

  it("goes on with a repository that the Marketplace has but did not list yet", async () => {
    const { client, remaining } = marketplace("repository_exists");
    const outcome = await client.install(addon("owner/pending-addon"), categories());
    expect(outcome.repository).toMatchObject({ id: "105", installed: true });
    expect(remaining()).toBe(0);
  });

  it("gives the message of the Marketplace when the installation fails", async () => {
    const { client, remaining } = marketplace("install_failed");
    await expect(client.install(addon("owner/failing-addon"), categories())).rejects.toMatchObject({ code: "store_error", message: expect.stringContaining("No release found") });
    expect(remaining()).toBe(0);
  });

  it("knows that GitHub is not connected, and why an addition is refused", async () => {
    const { client, remaining } = marketplace("github_not_connected");
    expect(await client.status()).toMatchObject({ kind: "ready", githubConnected: false, warningAccepted: true });
    await expect(client.install(addon("owner/new-addon"), categories())).rejects.toMatchObject({ code: "github_not_connected" });
    expect(remaining()).toBe(0);
  });

  it("knows that the warning is not accepted, and why an installation is refused", async () => {
    const { client, remaining } = marketplace("warning_not_accepted");
    expect(await client.status()).toMatchObject({ kind: "ready", warningAccepted: false, githubConnected: true });
    await expect(client.install(addon("owner/waiting-addon"), categories())).rejects.toMatchObject({ code: "warning_not_accepted" });
    expect(remaining()).toBe(0);
  });

  it("reports a command that the Marketplace no longer knows, so that the page links to the Marketplace", async () => {
    const { client, remaining } = marketplace("install_interface_changed");
    await expect(client.install(addon("owner/new-addon"), categories())).rejects.toMatchObject({ code: "interface_changed" });
    expect(remaining()).toBe(0);
  });
});
