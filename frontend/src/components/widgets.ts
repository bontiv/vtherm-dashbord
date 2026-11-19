import { LitElement, css, html, unsafeCSS } from "lit";
import type { PropertyValues, TemplateResult } from "lit";
import { styleMap } from "lit/directives/style-map.js";

import { resolveWidgetSize } from "@vtherm/dashboard-sdk";
import type { CentralContext, ConfigValues, Hass, PlacedEntry, WidgetSize } from "@vtherm/dashboard-sdk";

import "./contribution-host.ts";
import { defineElement } from "./define.ts";
import { isDefined } from "./ha.ts";
import { NARROW_QUERY, narrowStyles } from "./narrow-styles.ts";

/** The smallest width of a column of the grid of the widgets, in pixels. */
export const WIDGET_MIN_WIDTH = 280;

/** The gap between the cards of the grid, in pixels. */
export const WIDGET_GAP = 16;

/** The unit of height of `rows`, in pixels: a gauge and two lines of text. */
export const WIDGET_ROW = 140;

/** The padding of the grid around its cards, in pixels. */
const GRID_PADDING = 16;

/**
 * The number of columns of the grid: as many columns of at least `WIDGET_MIN_WIDTH` as the width holds, at least one.
 *
 * @param width - The width of the content of the grid, in pixels.
 * @param gap - The gap between two columns, in pixels.
 */
export function gridColumns(width: number, gap: number = WIDGET_GAP): number {
  if (!Number.isFinite(width) || width <= 0) {
    return 1;
  }
  return Math.max(1, Math.floor((width + gap) / (WIDGET_MIN_WIDTH + gap)));
}

/**
 * The value of `grid-column` of a widget: its width reduced to the columns of the grid, so that the grid never gets a column that
 * overflows, or the whole row for `full`.
 *
 * @param size - The size of the widget. Without it, one column.
 * @param columns - The number of columns of the grid.
 */
export function spanOf(size: WidgetSize | undefined, columns: number): string {
  const requested = size?.columns ?? 1;
  if (requested === "full") {
    return "1 / -1";
  }
  return `span ${Math.max(1, Math.min(requested, Math.floor(columns)))}`;
}

/**
 * The minimal height of a widget that declares `rows`: `rows` units of `--vtherm-widget-row` and the gaps between them. Undefined
 * without `rows`: the height follows the content, as for the widgets written before the sizes.
 *
 * @param rows - The rows that the widget declares.
 */
export function minHeightOf(rows: WidgetSize["rows"]): string | undefined {
  return rows === undefined ? undefined : `calc(${rows} * var(--vtherm-widget-row) + ${rows - 1} * var(--vtherm-widget-gap))`;
}

/**
 * A grid of widgets: the contributions of the hook `global_widget` or `thermostat_widget`, each shown in a card with its properties.
 *
 * The grid measures its width to know its number of columns, and gives each card the width of its `size`, reduced to the grid. The
 * cards follow the order of the placements: the grid never moves a card to fill a hole (no `grid-auto-flow: dense`), so the order of
 * reading and of the keyboard is the order of the placements. On a narrow screen, every card takes one column.
 */
export class VThermWidgets extends LitElement {
  static override properties = {
    entries: { attribute: false },
    hass: { attribute: false },
    thermostatId: { type: String },
    central: { attribute: false },
    values: { attribute: false },
    centralValues: { attribute: false },
    narrow: { type: Boolean },
    language: { type: String },
    columns: { state: true },
  };

  static override styles = [
    narrowStyles,
    css`
      :host {
        --vtherm-widget-row: ${WIDGET_ROW}px;
        --vtherm-widget-gap: ${WIDGET_GAP}px;
        /* The number of columns, which the grid sets on itself once it has measured its width. */
        --vtherm-widget-columns: 1;
        display: grid;
        grid-template-columns: repeat(var(--vtherm-widget-columns, 1), minmax(0, 1fr));
        grid-auto-flow: row;
        gap: var(--vtherm-widget-gap);
        padding: ${GRID_PADDING}px;
        min-width: 0;
      }
      .widget {
        display: block;
        min-width: 0;
        overflow: hidden;
        box-sizing: border-box;
        color: var(--primary-text-color);
        background-color: var(--card-background-color);
        border: 1px solid var(--divider-color);
        border-radius: var(--ha-card-border-radius, 12px);
      }
      @media ${unsafeCSS(NARROW_QUERY)} {
        :host {
          grid-template-columns: minmax(0, 1fr);
        }
        .widget {
          grid-column: 1 / -1 !important;
        }
      }
    `,
  ];

  /** The widgets to show, in order. */
  declare entries: readonly PlacedEntry[];

  /** The state of Home Assistant, given to every widget. */
  declare hass: Hass | undefined;

  /** The thermostat of a thermostat widget. */
  declare thermostatId: string;

  /** The central configuration, given to the widgets of the Overview page. Undefined for the widgets of a thermostat, or without one. */
  declare central: CentralContext | undefined;

  /**
   * The values of the configuration of the thermostat and of the central configuration, given to the widgets of a thermostat: the native
   * widgets read in them what Versatile Thermostat does not publish, such as the outdoor sensor. Undefined for the Overview page.
   */
  declare values: ConfigValues | undefined;
  declare centralValues: ConfigValues | undefined;

  /** Whether the screen is narrow: every card takes one column, and the widgets are told. */
  declare narrow: boolean;

  /** Changes with the language of the user, given to every widget so that it draws its texts again. */
  declare language: string;

  /** The number of columns that the measured width holds. */
  declare columns: number;

  private resizeObserver: ResizeObserver | undefined;

  constructor() {
    super();
    this.entries = [];
    this.hass = undefined;
    this.thermostatId = "";
    this.central = undefined;
    this.values = undefined;
    this.centralValues = undefined;
    this.narrow = false;
    this.language = "";
    this.columns = 1;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver((records) => {
        const width = records[0]?.contentRect.width;
        if (width !== undefined) {
          this.columns = gridColumns(width);
        }
      });
      this.resizeObserver.observe(this);
    }
  }

  override disconnectedCallback(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    super.disconnectedCallback();
  }

  protected override firstUpdated(): void {
    // Without ResizeObserver, the width is measured once.
    if (this.resizeObserver === undefined) {
      this.columns = gridColumns(this.getBoundingClientRect().width - 2 * GRID_PADDING);
    }
  }

  /** The columns of the grid: one on a narrow screen. */
  get gridColumns(): number {
    return this.narrow ? 1 : this.columns;
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (changed.has("columns") || changed.has("narrow")) {
      this.style.setProperty("--vtherm-widget-columns", String(this.gridColumns));
    }
  }

  protected override render(): TemplateResult {
    const props = {
      hass: this.hass,
      narrow: this.narrow,
      ...(this.language === "" ? {} : { language: this.language }),
      ...(this.thermostatId === "" ? {} : { thermostatId: this.thermostatId }),
      ...(this.central === undefined ? {} : { central: this.central }),
      ...(this.thermostatId === "" || this.values === undefined ? {} : { values: this.values, centralValues: this.centralValues ?? {} }),
    };
    const card = isDefined("ha-card");
    return html`${this.entries.map((entry) => {
      const declared = (entry.contribution as { size?: WidgetSize }).size;
      const size = entry.size ?? resolveWidgetSize(declared);
      const minHeight = minHeightOf(declared?.rows);
      // No key for an absent minimal height: the card keeps the height of its content.
      const style = styleMap({ gridColumn: spanOf(size, this.gridColumns), ...(minHeight === undefined ? {} : { minHeight }) });
      const content = html`<vtherm-contribution .tag=${(entry.contribution as { component: string }).component} .contributionId=${entry.id} .props=${props}></vtherm-contribution>`;
      // The card of Home Assistant when it is defined; otherwise an element with the same border, radius and background.
      return card ? html`<ha-card class="widget" data-widget=${entry.id} style=${style}>${content}</ha-card>` : html`<div class="widget" data-widget=${entry.id} style=${style}>${content}</div>`;
    })}`;
  }
}

defineElement("vtherm-widgets", VThermWidgets);
