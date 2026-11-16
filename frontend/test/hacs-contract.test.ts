/**
 * The adapter of HACS against the answers of the real HACS.
 *
 * `shared/hacs-answers.json` holds what the real HACS of `external/hacs` answered to each command of each scenario
 * (`tests/test_hacs_contract.py` records it). The adapter runs the same scenarios: each command that it sends must be the recorded one, in
 * the recorded order, and it gets the recorded answer.
 */
import { describe, expect, it } from "vitest";

import answers from "../../shared/hacs-answers.json" with { type: "json" };
import { HacsClient, HacsError } from "../src/complements/hacs-client.ts";
import type { Complement } from "../src/complements/types.ts";
import { complement as makeComplement } from "./support/fake-hacs.ts";

/** A command and what HACS answered. */
interface Exchange {
  readonly request: Record<string, unknown>;
  readonly result?: unknown;
  readonly error?: { readonly code: string; readonly message: string };
}

const scenarios = answers.scenarios as unknown as Record<string, readonly Exchange[]>;

/** A connection to Home Assistant that answers as the real HACS did in a scenario. */
function replay(scenario: string) {
  const pending = [...(scenarios[scenario] ?? [])];
  expect(pending.length, `the scenario ${scenario} was recorded`).toBeGreaterThan(0);
  const callWS = async (message: Record<string, unknown>): Promise<unknown> => {
    const exchange = pending.shift();
    expect(exchange, `HACS was not sent ${String(message["type"])} in the scenario ${scenario}`).toBeDefined();
    expect(message).toEqual(exchange?.request);
    if (exchange?.error !== undefined) {
      throw exchange.error;
    }
    return exchange?.result;
  };
  return { client: new HacsClient({ callWS } as never), remaining: () => pending.length };
}

const addon = (slug: string): Complement => makeComplement({ slug, name: slug.split("/")[1] }) as unknown as Complement;

const categories = (): readonly string[] => {
  const ready = scenarios["ready"]?.[0]?.result as { categories: string[] };
  return ready.categories;
};

describe("the adapter against the answers of the real HACS", () => {
  it("knows that HACS is absent from the error of Home Assistant", async () => {
    expect(await replay("absent").client.status()).toEqual({ kind: "absent" });
  });

  it("reads the version and the categories of HACS", async () => {
    expect(await replay("ready").client.status()).toEqual({ kind: "ready", version: answers.hacs_version, categories: ["integration", "plugin"] });
  });

  it("gives the reason that HACS gives when it is disabled", async () => {
    expect(await replay("disabled").client.status()).toEqual({ kind: "disabled", reason: "rate_limit" });
  });

  it("downloads a repository that HACS already has, without adding it", async () => {
    const { client, remaining } = replay("install_present");
    const outcome = await client.install(addon("owner/present-addon"), categories());
    expect(outcome.restartRequired).toBe(true);
    expect(outcome.repository).toMatchObject({ id: "101", full_name: "owner/present-addon", installed: true, status: "pending-restart" });
    expect(remaining()).toBe(0);
  });

  it("adds a repository that HACS does not have, checks it, then downloads it", async () => {
    const { client, remaining } = replay("install_absent");
    const outcome = await client.install(addon("owner/absent-addon"), categories());
    expect(outcome).toMatchObject({ restartRequired: true, reloadPage: false, repository: { id: "102", installed_version: "1.2.0" } });
    expect(remaining()).toBe(0);
  });

  it("notices that HACS refused the repository although it answered without error", async () => {
    const { client, remaining } = replay("install_refused");
    await expect(client.install(addon("owner/refused-addon"), categories())).rejects.toMatchObject({ code: "add_refused" });
    expect(remaining()).toBe(0);
  });

  it("gives the message of HACS when the download fails", async () => {
    const { client, remaining } = replay("install_download_error");
    await expect(client.install(addon("owner/failing-addon"), categories())).rejects.toMatchObject({ code: "hacs_error", message: "No release found" });
    expect(remaining()).toBe(0);
  });

  it("reports a command that HACS no longer knows, so that the page links to HACS", async () => {
    const { client, remaining } = replay("install_interface_changed");
    const failure = client.install(addon("owner/new-addon"), categories());
    await expect(failure).rejects.toBeInstanceOf(HacsError);
    await expect(failure).rejects.toMatchObject({ code: "interface_changed" });
    expect(remaining()).toBe(0);
  });
});
