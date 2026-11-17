import type { HookProps, SaveResult } from "@vtherm/dashboard-sdk";

type Props = HookProps<"thermostat_config">;

/** The icon of Home Assistant for "discard" (mdiRestore), copied to avoid a dependency on @mdi/js. */
const RESTORE = "M13,3A9,9 0 0,0 4,12H1L4.89,15.89L4.96,16.03L9,12H6A7,7 0 0,1 13,5A7,7 0 0,1 20,12A7,7 0 0,1 13,19C11.07,19 9.32,18.21 8.06,16.94L6.64,18.36C8.27,20 10.5,21 13,21A9,9 0 0,0 22,12A9,9 0 0,0 13,3Z";

/** The progress button of Home Assistant, as the actions use it. */
type ProgressButton = HTMLElement & { progress: boolean; disabled: boolean; appearance: string; actionSuccess(): void; actionError(): void };

/**
 * A section that draws the save actions at the foot of its own card, as the configuration pages of Home Assistant do. Its contribution
 * declares `save_actions: "component"`, so the dashboard draws no other card of actions under it.
 */
export class MyPluginSection extends HTMLElement {
  private controls: Props["draft"];

  /** The dashboard gives a new `draft` at each change of the draft, and none when the configuration is read-only. */
  set draft(draft: Props["draft"]) {
    this.controls = draft;
    this.render();
  }

  get draft(): Props["draft"] {
    return this.controls;
  }

  private render(): void {
    const card = document.createElement("ha-card");
    card.append(Object.assign(document.createElement("div"), { className: "card-content", textContent: "…the fields of the section…" }));
    const draft = this.controls;
    if (draft !== undefined) {
      for (const message of draft.messages) {
        card.append(Object.assign(document.createElement("ha-alert"), { alertType: message.type, textContent: message.text }));
      }
      card.append(this.actions(draft));
    }
    this.replaceChildren(card);
  }

  /** Discard on the left, a plain button with the restore icon; Save on the right, the progress button of Home Assistant. */
  private actions(draft: NonNullable<Props["draft"]>): HTMLElement {
    const actions = Object.assign(document.createElement("div"), { className: "card-actions" });
    const discard = Object.assign(document.createElement("ha-button"), { appearance: "plain", disabled: !draft.dirty || draft.saving, textContent: "Discard" });
    discard.prepend(Object.assign(document.createElement("ha-svg-icon"), { slot: "start", path: RESTORE }));
    discard.addEventListener("click", () => draft.discard());
    const save = Object.assign(document.createElement("ha-progress-button") as ProgressButton, { appearance: "filled", disabled: !draft.dirty || draft.saving, textContent: "Save" });
    save.addEventListener("click", async (event) => {
      const button = event.currentTarget as ProgressButton;
      if (button.progress) {
        return;
      }
      button.progress = true;
      const result: SaveResult = await draft.save();
      // Green with a check mark for two seconds, or red with an alert icon: a partial save is a failure too.
      if (result === "success") {
        button.actionSuccess();
      } else {
        button.actionError();
      }
      button.progress = false;
    });
    actions.append(discard, save);
    return actions;
  }
}
