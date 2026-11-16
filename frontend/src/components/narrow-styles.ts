/**
 * The rules of the narrow screen, shared by the frame of the dashboard and its native pages.
 *
 * Under the threshold, the screen is a phone: every control offers a touch target of at least 44 px high, and long texts that
 * cannot be cut, such as addresses and identifiers, wrap instead of widening the page.
 */
import { css, unsafeCSS } from "lit";

/** The width under which the screen is narrow: the menu becomes a drawer, and the touch targets grow. */
export const NARROW_QUERY = "(max-width: 700px)";

/** The smallest height of a touch target on a narrow screen. */
export const TOUCH_TARGET = 44;

/**
 * The styles of the narrow screen. A component adds them first to its own `styles`.
 *
 * - Buttons, lists and text fields are at least 44 px high, and so is an element with the class `touch-target`, such as a link that
 *   is a control rather than a part of a text.
 * - A label that holds a checkbox or a radio button is the touch target of its control: it is at least 44 px high.
 * - The class `breakable` lets a long text, such as an address, wrap anywhere.
 */
export const narrowStyles = css`
  .breakable {
    overflow-wrap: anywhere;
  }
  @media ${unsafeCSS(NARROW_QUERY)} {
    button,
    select,
    textarea,
    input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]) {
      min-height: ${TOUCH_TARGET}px;
      box-sizing: border-box;
    }
    .touch-target {
      display: inline-flex;
      align-items: center;
      min-height: ${TOUCH_TARGET}px;
      box-sizing: border-box;
    }
    label:has(> input[type="checkbox"]),
    label:has(> input[type="radio"]) {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: ${TOUCH_TARGET}px;
    }
  }
`;
