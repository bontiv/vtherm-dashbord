import { LitElement, css, html, nothing } from "lit";
import type { TemplateResult } from "lit";

import { defineElement } from "../components/define.ts";
import { currentState, STATE_CHANGED_EVENT } from "../state.ts";
import { t } from "../shell-translations.ts";
import { DevStore } from "./dev-store.ts";
import type { DevEntry, DevEntryProblem } from "./dev-store.ts";
import { narrowStyles } from "../components/narrow-styles.ts";

const translate = t as (key: string, params?: Readonly<Record<string, string | number>>) => string;

/**
 * The page where an administrator adds, enables, disables and removes the plugins in development.
 *
 * The entries are the ones of the browser (`DevStore`). A change applies when the page is loaded again, which this page offers.
 */
export class VThermDevPluginsPage extends LitElement {
  static override properties = {
    language: { type: String },
    entries: { state: true },
    problem: { state: true },
    changed: { state: true },
  };

  static override styles = [
    narrowStyles,
    css`
    :host {
      display: block;
      padding: 16px;
      color: var(--primary-text-color);
    }
    h1,
    h2 {
      margin: 0 0 8px;
      font-weight: 500;
    }
    table {
      width: 100%;
      margin-bottom: 16px;
      border-collapse: collapse;
    }
    th,
    td {
      padding: 6px 8px;
      text-align: left;
      border-bottom: 1px solid var(--divider-color);
    }
    form {
      display: grid;
      gap: 8px;
      max-width: 560px;
      padding: 16px;
      background-color: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
    }
    label {
      display: grid;
      gap: 2px;
      font-size: 12px;
      color: var(--secondary-text-color);
    }
    input,
    button {
      font: inherit;
      padding: 6px 8px;
      color: var(--primary-text-color);
      background-color: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 4px;
    }
    button {
      cursor: pointer;
    }
    button.primary {
      color: var(--text-primary-color);
      background-color: var(--primary-color);
      border: 0;
    }
    .error {
      color: var(--error-color);
    }
    .notice {
      display: flex;
      align-items: center;
      gap: 16px;
      margin: 0 0 16px;
      padding: 8px 12px;
      border: 1px solid var(--warning-color);
      border-radius: 4px;
    }
    .hint {
      color: var(--secondary-text-color);
    }
  `,
  ];

  /** The language of the user. It only changes to make the page draw its texts again. */
  declare language: string;
  declare entries: readonly DevEntry[];
  declare problem: DevEntryProblem | undefined;
  /** Whether an entry changed since the page was loaded. */
  declare changed: boolean;

  /** Where the entries are kept. Tests give another one. */
  store: DevStore = new DevStore();

  /** Load the page again, which applies the entries. Tests replace it. */
  reload: () => void = () => window.location.reload();

  private readonly refresh = (): void => this.requestUpdate();

  constructor() {
    super();
    this.language = "";
    this.entries = [];
    this.problem = undefined;
    this.changed = false;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.entries = this.store.list();
    window.addEventListener(STATE_CHANGED_EVENT, this.refresh);
  }

  override disconnectedCallback(): void {
    window.removeEventListener(STATE_CHANGED_EVENT, this.refresh);
    super.disconnectedCallback();
  }

  /** The plugins that the server knows without a development entry: an entry for another identifier declares the plugin itself. */
  private installedIds(): Set<string> {
    // Without the server list, the page cannot tell, so it asks for the constraint only when the plugin is unknown to the registry.
    const statuses = currentState().statuses;
    const ids = statuses.filter((status) => status.source !== "development").map((status) => status.id);
    for (const entry of this.entries) {
      // An installed plugin replaced by an entry is a development status: the entry says whether it declares the plugin.
      if (entry.dashboard_version === undefined) {
        ids.push(entry.id);
      }
    }
    return new Set(ids);
  }

  private add(event: SubmitEvent): void {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const field = (name: string): string => (form.elements.namedItem(name) as HTMLInputElement | null)?.value ?? "";
    const result = this.store.add(
      { id: field("id"), js_url: field("js_url"), dashboard_version: field("dashboard_version"), requires: field("requires"), load_after: field("load_after"), load_before: field("load_before") },
      this.installedIds(),
    );
    if (result.ok) {
      this.problem = undefined;
      this.changed = true;
      this.entries = this.store.list();
      form.reset();
    } else {
      this.problem = result.problem;
    }
  }

  private change(change: () => void): void {
    change();
    this.changed = true;
    this.entries = this.store.list();
  }

  private stateOf(entry: DevEntry): string {
    if (!entry.enabled) {
      return translate("dev.state.off");
    }
    const status = currentState().statuses.find((candidate) => candidate.id === entry.id && candidate.source === "development");
    return status === undefined ? translate("dev.state.pending") : translate(`status.state.${status.state}`);
  }

  protected override render(): TemplateResult {
    return html`<h1>${t("dev.title")}</h1>
      <p>${t("dev.intro")}</p>
      ${this.changed
        ? html`<div class="notice" role="status">${t("dev.reload_needed")} <button class="primary reload" @click=${() => this.reload()}>${t("dev.reload")}</button></div>`
        : nothing}
      ${this.entries.length === 0
        ? html`<p class="empty" role="status">${t("dev.empty")}</p>`
        : html`<table>
            <thead>
              <tr>
                <th>${t("dev.column.id")}</th>
                <th>${t("dev.column.url")}</th>
                <th>${t("dev.column.kind")}</th>
                <th>${t("dev.column.state")}</th>
                <th>${t("dev.column.actions")}</th>
              </tr>
            </thead>
            <tbody>
              ${this.entries.map(
                (entry) => html`<tr data-plugin=${entry.id}>
                  <td>${entry.id}</td>
                  <td>${entry.js_url}</td>
                  <td>${translate(entry.dashboard_version === undefined ? "dev.kind.replace" : "dev.kind.declared")}</td>
                  <td class="state">${this.stateOf(entry)}</td>
                  <td>
                    <label
                      ><input type="checkbox" class="enable" .checked=${entry.enabled} @change=${(event: Event) => this.change(() => this.store.setEnabled(entry.id, (event.target as HTMLInputElement).checked))} />
                      ${t("dev.enable")}</label
                    >
                    <button class="remove" @click=${() => this.change(() => this.store.remove(entry.id))}>${t("dev.remove")}</button>
                  </td>
                </tr>`,
              )}
            </tbody>
          </table>`}
      <h2>${t("dev.add.title")}</h2>
      <form @submit=${(event: SubmitEvent) => this.add(event)}>
        <label>${t("dev.field.id")}<input name="id" required autocomplete="off" /></label>
        <label>${t("dev.field.url")}<input name="js_url" required placeholder="http://localhost:5173/src/main.ts" autocomplete="off" /></label>
        <label>${t("dev.field.constraint")}<input name="dashboard_version" placeholder=">=0.1,<1.0" autocomplete="off" /></label>
        <label>${t("dev.field.requires")}<input name="requires" autocomplete="off" /></label>
        <label>${t("dev.field.load_after")}<input name="load_after" autocomplete="off" /></label>
        <label>${t("dev.field.load_before")}<input name="load_before" autocomplete="off" /></label>
        <span class="hint">${t("dev.field.lists_hint")}</span>
        ${this.problem === undefined ? nothing : html`<span class="error" role="alert">${translate(`dev.error.${this.problem}`)}</span>`}
        <div><button class="primary add" type="submit">${t("dev.add")}</button></div>
      </form>`;
  }
}

defineElement("vtherm-dev-plugins-page", VThermDevPluginsPage);
