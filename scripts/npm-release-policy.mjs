import { createHash } from "node:crypto";

// Admission is for this exact caller, not a generic permission to publish.
const WORKFLOW_SHA256 =
  "18457351e760dcd61c72c31bc61ae56dbd1e8c5658c2a9783f3c96dbedc82630";

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
