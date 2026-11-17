/**
 * The styles of the figure of a diagram and of the elements that the diagrams draw.
 *
 * Every color is a variable of the theme of Home Assistant, so that a diagram follows the light and dark themes without a reload:
 * `--primary-color` for what the setting drives, `--warning-color` for a threshold, a delay or an event, `--secondary-text-color` for
 * the axes and the context, `--divider-color` for the grid.
 */

import { css } from "lit";

/** The styles of the figure, to include in the styles of the element that shows it. */
export const diagramStyles = css`
  .diagram {
    margin: 0;
    min-width: 0;
  }
  .diagram-title {
    margin: 0 0 4px;
    color: var(--primary-text-color);
    font-size: 0.875rem;
    font-weight: 500;
  }
  .diagram-example {
    color: var(--secondary-text-color);
    font-style: italic;
    font-weight: 400;
  }
  .diagram-image {
    width: 100%;
  }
  .diagram svg {
    display: block;
    width: 100%;
    max-width: 100%;
    height: auto;
  }
  .diagram text {
    font-family: inherit;
    font-size: 8px;
    fill: var(--primary-text-color);
  }
  .diagram text.d-note {
    font-size: 7px;
    fill: var(--secondary-text-color);
  }
  .diagram text.d-example {
    font-style: italic;
  }
  .diagram .d-axis {
    fill: none;
    stroke: var(--secondary-text-color);
    stroke-width: 1;
  }
  .diagram .d-grid {
    fill: none;
    stroke: var(--divider-color);
    stroke-width: 1;
    stroke-dasharray: 2 2;
  }
  .diagram .d-ctx {
    fill: none;
    stroke: var(--secondary-text-color);
    stroke-width: 1.5;
    stroke-linejoin: round;
  }
  .diagram .d-ctx-dash {
    fill: none;
    stroke: var(--secondary-text-color);
    stroke-width: 1;
    stroke-dasharray: 3 2;
  }
  .diagram .d-main {
    fill: none;
    stroke: var(--primary-color);
    stroke-width: 2;
    stroke-linejoin: round;
  }
  .diagram .d-mark {
    fill: none;
    stroke: var(--warning-color);
    stroke-width: 1.5;
  }
  .diagram .d-limit {
    fill: none;
    stroke: var(--warning-color);
    stroke-width: 1.5;
    stroke-dasharray: 4 3;
  }
  .diagram .d-area {
    fill: var(--primary-color);
    fill-opacity: 0.35;
    stroke: none;
  }
  .diagram .d-area-warn {
    fill: var(--warning-color);
    fill-opacity: 0.3;
    stroke: none;
  }
  .diagram .d-area-ctx {
    fill: var(--secondary-text-color);
    fill-opacity: 0.15;
    stroke: none;
  }
  .diagram .d-dot {
    fill: var(--primary-color);
    stroke: none;
  }
  .diagram .d-dot-warn {
    fill: var(--warning-color);
    stroke: none;
  }
  .diagram .d-dot-ctx {
    fill: var(--secondary-text-color);
    stroke: none;
  }
  .diagram path.focus,
  .diagram line.focus {
    stroke: var(--primary-color);
    stroke-width: 3;
  }
  .diagram rect.focus,
  .diagram circle.focus {
    fill: var(--primary-color);
    fill-opacity: 0.6;
  }
  .diagram text.focus {
    fill: var(--primary-color);
    font-weight: 600;
  }
  .diagram .recede {
    opacity: 0.4;
  }
`;
