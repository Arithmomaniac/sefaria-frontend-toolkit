import { h } from "vue";
import { useData } from "vitepress";
import DefaultTheme from "vitepress/theme";

import CodeLanguageToggle from "./CodeLanguageToggle.vue";
import DocumentationDisclosure from "./DocumentationDisclosure.vue";
import HeroExample from "./HeroExample.vue";
import LandingPreview from "./LandingPreview.vue";
import PlaygroundEmbed from "./PlaygroundEmbed.vue";
import SourceCardSnippet from "./SourceCardSnippet.vue";
import SiteLink from "./SiteLink.vue";
import StatusNote from "./StatusNote.vue";
import "./style.css";

export default {
  extends: DefaultTheme,
  Layout: () => {
    const { frontmatter } = useData();
    return h(DefaultTheme.Layout, null, {
      "home-hero-info-after": () =>
        frontmatter.value.statusNote
          ? h(StatusNote, { class: "hero-status" })
          : null,
      "home-hero-after": () =>
        frontmatter.value.heroExample ? h(HeroExample) : null,
      "layout-bottom": () => [
        frontmatter.value.acknowledgement
          ? h(
              "p",
              { class: "home-acknowledgement" },
              "This project began at the Microsoft Global Hackathon 2026. Thank you to Microsoft for sponsoring the hackathon and for the time and platform that helped turn the idea into working software.",
            )
          : null,
        h(DocumentationDisclosure),
      ],
    });
  },
  enhanceApp({ app }) {
    app.component("CodeLanguageToggle", CodeLanguageToggle);
    app.component("HeroExample", HeroExample);
    app.component("LandingPreview", LandingPreview);
    app.component("PlaygroundEmbed", PlaygroundEmbed);
    app.component("SourceCardSnippet", SourceCardSnippet);
    app.component("SiteLink", SiteLink);
    app.component("StatusNote", StatusNote);
  },
};
