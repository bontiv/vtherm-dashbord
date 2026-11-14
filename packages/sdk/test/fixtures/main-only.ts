/** A plugin that imports only the main entry point of the SDK, as a plugin bundle does. */
import { defineTranslations, registerUiPlugin } from "../../src/index.ts";

registerUiPlugin({ id: "mine", translations: defineTranslations({}), contributions: {} });
