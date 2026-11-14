import { LitElement, css, html } from "lit";
import type { TemplateResult } from "lit";

import type { EngineIssue, TranslationWarning } from "@vtherm/dashboard-sdk";

import type { PluginStatus } from "../loader.ts";
import { t } from "../shell-translations.ts";
import { defineElement } from "./define.ts";

/** Translate a key whose name is built from a state or a reason. The catalog is complete for the ones that exist. */
const translate = t as (key: string, params?: Readonly<Record<string, string | number>>) => string;

function list(value: unknown): string {
  return Array.isArray(value) ? value.join(", ") : "";
}

/**
 * Explain the state of a plugin to the user.
 *
 * @param status - The status of the plugin.
 * @param dashboardVersion - The version of the dashboard, for an incompatible plugin.
 * @returns The sentences, translated. Empty for a plugin that loaded.
 */
export function describeStatus(status: PluginStatus, dashboardVersion: string): string[] {
  const details = status.details;
  const lines: string[] = [];
  switch (status.state) {
    case "missing_dependency":
      lines.push(translate("status.missing", { plugins: list(details["missing"]) }));
      break;
    case "cycle":
      lines.push(translate("status.cycle", { plugins: list(details["plugins"]) }));
      break;
    case "dashboard_incompatible":
      lines.push(translate(`status.reason.${status.reason ?? "too_old"}`, { dashboard: String(details["dashboard_version"] ?? dashboardVersion), constraint: String(details["constraint"] ?? "") }));
      break;
    case "invalid":
    case "failed":
      lines.push(
        translate(`status.reason.${status.reason ?? "invalid_url"}`, {
          url: String(details["url"] ?? status.js_url),
          fault: String(details["fault"] ?? ""),
          message: String(details["message"] ?? ""),
        }),
      );
      break;
    default:
      break;
  }
  if (status.source === "development") {
    lines.push(translate("status.url", { url: status.js_url }));
    if (status.state === "failed" && status.reason === "import_failed") {
      lines.push(...diagnoseDevelopmentFailure(status.js_url));
    }
  }
  return lines;
}

/**
 * The common causes of a module in development that does not load.
 *
 * A browser does not tell a stopped server from a missing CORS header: both are a failed import. So the page lists the causes, and
 * puts the mixed content first when the page is served over HTTPS and the module over HTTP, which a browser may block.
 *
 * @param url - The URL that was tried.
 * @param pageProtocol - The protocol of the page of the dashboard.
 */
export function diagnoseDevelopmentFailure(url: string, pageProtocol: string = window.location.protocol): string[] {
  const mixed = pageProtocol === "https:" && url.startsWith("http:");
  return [
    translate("status.dev.failed", { url }),
    ...(mixed ? [translate("status.dev.cause.mixed")] : []),
    translate("status.dev.cause.stopped"),
    translate("status.dev.cause.cors"),
  ];
}

/**
 * Tell the author of a plugin which texts are missing: the ones shown in English because the language of the user has no text, and
 * the ones that exist nowhere.
 *
 * @param warnings - The warnings of the translations of the plugin.
 */
export function describeTranslationWarnings(warnings: readonly TranslationWarning[]): string[] {
  const lines: string[] = [];
  const fallback = new Map<string, string[]>();
  for (const warning of warnings.filter((candidate) => candidate.code === "fallback")) {
    fallback.set(warning.language, [...(fallback.get(warning.language) ?? []), warning.key]);
  }
  for (const [language, keys] of fallback) {
    lines.push(translate("status.translations.fallback", { language, keys: keys.join(", ") }));
  }
  const missing = warnings.filter((candidate) => candidate.code === "missing_key").map((warning) => warning.key);
  if (missing.length > 0) {
    lines.push(translate("status.translations.missing", { keys: [...new Set(missing)].join(", ") }));
  }
  return lines;
}

/** The status of the plugins: the state and the cause of each one, its source, and the problems found with the contributions. */
export class VThermPluginStatus extends LitElement {
  static override properties = {
    language: { type: String },
    statuses: { attribute: false },
    issues: { attribute: false },
    translationWarnings: { attribute: false },
    dashboardVersion: { type: String },
  };

  static override styles = css`
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
    h2 {
      margin-top: 24px;
      font-size: 16px;
    }
    p {
      margin: 0 0 16px;
      color: var(--secondary-text-color);
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th,
    td {
      padding: 8px;
      text-align: left;
      vertical-align: top;
      border-bottom: 1px solid var(--divider-color);
    }
    th {
      color: var(--secondary-text-color);
      font-weight: 500;
    }
    .state {
      font-weight: 500;
    }
    .loaded {
      color: var(--success-color);
    }
    .failed,
    .invalid,
    .cycle,
    .missing_dependency,
    .dashboard_incompatible {
      color: var(--error-color);
    }
    .ready {
      color: var(--warning-color);
    }
    ul {
      margin: 0;
      padding-left: 20px;
    }
  `;

  /** The status of every plugin. */
  declare statuses: readonly PluginStatus[];

  /** The problems that the placement of the contributions found. */
  declare issues: readonly EngineIssue[];

  /** The warnings of the translations of a plugin. They are shown for the plugins in development, whose author can fix them. */
  declare translationWarnings: ReadonlyMap<string, readonly TranslationWarning[]>;

  /** The version of the dashboard. */
  declare dashboardVersion: string;

  /** The language of the user. It only changes to make the component draw its texts again. */
  declare language: string;

  constructor() {
    super();
    this.language = "";
    this.statuses = [];
    this.issues = [];
    this.translationWarnings = new Map();
    this.dashboardVersion = "";
  }

  protected override render(): TemplateResult {
    return html`<h1>${t("status.title")}</h1>
      <p>${t("status.intro")}</p>
      ${this.statuses.length === 0
        ? html`<p role="status">${t("status.empty")}</p>`
        : html`<table>
            <thead>
              <tr>
                <th>${t("status.column.plugin")}</th>
                <th>${t("status.column.source")}</th>
                <th>${t("status.column.state")}</th>
                <th>${t("status.column.details")}</th>
              </tr>
            </thead>
            <tbody>
              ${this.statuses.map(
                (status) => html`<tr data-plugin=${status.id}>
                  <td>${status.id}</td>
                  <td>${translate(`status.source.${status.source}`)}</td>
                  <td class="state ${status.state}">${translate(`status.state.${status.state}`)}</td>
                  <td>
                    ${[...describeStatus(status, this.dashboardVersion), ...(status.source === "development" ? describeTranslationWarnings(this.translationWarnings.get(status.id) ?? []) : [])].map(
                      (line) => html`<div>${line}</div>`,
                    )}
                  </td>
                </tr>`,
              )}
            </tbody>
          </table>`}
      <h2>${t("status.issues.title")}</h2>
      ${this.issues.length === 0
        ? html`<p>${t("status.issues.none")}</p>`
        : html`<ul>
            ${this.issues.map((issue) => html`<li data-code=${issue.code}><strong>${issue.pluginId}</strong> (${issue.level}, ${issue.code}): ${issue.message}</li>`)}
          </ul>`}`;
  }
}

defineElement("vtherm-plugin-status", VThermPluginStatus);
