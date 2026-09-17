import DefaultTheme from "vitepress/theme";

import LandingPreview from "./LandingPreview.vue";
import PlaygroundEmbed from "./PlaygroundEmbed.vue";
import SiteLink from "./SiteLink.vue";
import "./style.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("LandingPreview", LandingPreview);
    app.component("PlaygroundEmbed", PlaygroundEmbed);
    app.component("SiteLink", SiteLink);
  },
};
