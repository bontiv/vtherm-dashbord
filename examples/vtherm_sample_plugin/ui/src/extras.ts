import { registerUiPlugin } from "@vtherm/dashboard-sdk";
import { SamplePromoWidget, define } from "./elements";
import { translations } from "./translations";

define("vtherm-sample-promo", SamplePromoWidget);

// A second plugin, only to give the first one something to remove: a widget of the overview of a thermostat.
registerUiPlugin({
  id: "vtherm_sample_extras",
  translations,
  contributions: {
    thermostat_widget: [{ id: "vtherm_sample_extras.widget.promo", component: "vtherm-sample-promo" }],
  },
});
