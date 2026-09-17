import DefaultTheme from "vitepress/theme";

import LandingPreview from "./LandingPreview.vue";
import SiteLink from "./SiteLink.vue";
import "./style.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("LandingPreview", LandingPreview);
    app.component("SiteLink", SiteLink);
  },
};
