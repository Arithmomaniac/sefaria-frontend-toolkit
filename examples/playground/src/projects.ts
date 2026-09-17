import {
  createProjectCatalog,
  type ProjectCatalog,
} from "./project-catalog.js";

const manifests = import.meta.glob("../projects/*/project.json", {
  eager: true,
  import: "default",
});
const files = import.meta.glob("../projects/**/*.{html,css,js}", {
  eager: true,
  import: "default",
  query: "?raw",
});

export const projectCatalog: ProjectCatalog = createProjectCatalog(
  manifests,
  files,
);
