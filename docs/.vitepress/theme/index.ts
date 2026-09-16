import DefaultTheme from "vitepress/theme";

import SiteLink from "./SiteLink.vue";
import "./style.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("SiteLink", SiteLink);
  },
};
