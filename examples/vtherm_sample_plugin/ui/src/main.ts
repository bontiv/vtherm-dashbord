import { registerUiPlugin } from "@vtherm/dashboard-sdk";
import { SampleStatusWidget, SampleSyncTab, SampleTab, define } from "./elements";
import { translations } from "./translations";

// The elements must exist before the plugin registers: the dashboard creates them when it shows a contribution.
define("vtherm-sample-tab", SampleTab);
define("vtherm-sample-sync-tab", SampleSyncTab);
define("vtherm-sample-status", SampleStatusWidget);

registerUiPlugin({
  id: "vtherm_sample",
  translations,
  contributions: {
    thermostat_config: [
      // A section of the configuration of a thermostat, right after the TPI section of the dashboard.
      { id: "vtherm_sample.tab.main", title: "tab.title", icon: "mdi:flask-outline", component: "vtherm-sample-tab", placement: { after: "core_tpi.tab.main" } },
      // A section that takes the place of a native one.
      { id: "vtherm_sample.tab.sync", title: "sync.title", component: "vtherm-sample-sync-tab", placement: { replace: "core_sync_temp.tab.main" } },
    ],
    thermostat_widget: [
      { id: "vtherm_sample.widget.status", component: "vtherm-sample-status", placement: { first: true } },
      // Remove a widget of another plugin.
      { id: "vtherm_sample.remove.promo", placement: { remove: "vtherm_sample_extras.widget.promo" } },
    ],
  },
});
