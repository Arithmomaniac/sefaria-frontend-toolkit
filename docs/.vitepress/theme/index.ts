import { h } from "vue";
import DefaultTheme from "vitepress/theme";

import DocumentationDisclosure from "./DocumentationDisclosure.vue";
import LandingPreview from "./LandingPreview.vue";
import PlaygroundEmbed from "./PlaygroundEmbed.vue";
import SiteLink from "./SiteLink.vue";
import "./style.css";

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      "layout-bottom": () => h(DocumentationDisclosure),
    }),
  enhanceApp({ app }) {
    app.component("LandingPreview", LandingPreview);
    app.component("PlaygroundEmbed", PlaygroundEmbed);
    app.component("SiteLink", SiteLink);
  },
};
