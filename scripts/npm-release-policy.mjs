import { createHash } from "node:crypto";

// Admission is for this exact caller, not a generic permission to publish.
const WORKFLOW_SHA256 =
  "f7ae117990e0b35f1c36c48197c317502db81baebc979804a66723bcc4acb244";

export function validateNpmWorkflow(workflow) {
  const digest = createHash("sha256")
    .update(JSON.stringify(workflow))
    .digest("hex");
  return digest === WORKFLOW_SHA256
    ? []
    : [
        "Numbered npm workflow differs from its exact reviewed operation, source, approval, permission or artifact contract",
      ];
}
