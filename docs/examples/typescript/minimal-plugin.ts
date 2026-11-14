import { defineTranslations, registerUiPlugin } from "@vtherm/dashboard-sdk";
import type { HookProps, PartialCatalog } from "@vtherm/dashboard-sdk";

// The English catalog gives the keys. The other languages can be partial.
const en = { "tab.title": "My plugin", "tab.greeting": "Thermostat {name}" } as const;
const fr = { "tab.title": "Mon plugin" } satisfies PartialCatalog<typeof en>;
const translations = defineTranslations(en, { fr });
const { t } = translations;

type Props = HookProps<"thermostat_config">;

/** The section of the configuration of a thermostat. The dashboard sets its properties. */
class MyPluginTab extends HTMLElement implements Partial<Props> {
  thermostatId?: string;

  connectedCallback(): void {
    this.textContent = t("tab.greeting", { name: this.thermostatId ?? "unknown" });
  }
}

customElements.define("my-plugin-tab", MyPluginTab);

registerUiPlugin({
  id: "my_plugin",
  translations,
  contributions: {
    thermostat_config: [
      {
        id: "my_plugin.tab.main",
        title: "tab.title",
        component: "my-plugin-tab",
        placement: { after: "core_tpi.tab.main" },
      },
    ],
  },
});
