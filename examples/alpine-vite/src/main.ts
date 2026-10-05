import Alpine from "alpinejs";
import "@sefaria/web-components";

import { createAlpineSourceCardExample } from "./source-card-example.js";
import "./style.css";

Alpine.data("sourceCardExample", () => createAlpineSourceCardExample());
Alpine.start();
