import { expect, it } from "vitest";

import { normalizeProxyTarballUrls } from "../scripts/normalize-lockfile.mjs";

it("strips only proxy tarball URLs and preserves integrity", () => {
  const lockfile = `packages:
  pkg:
    resolution:
      integrity: sha512-abc
      tarball: https://packagefeedproxy.microsoft.io/npm/pkg/-/pkg-1.0.0.tgz
  external:
    resolution:
      integrity: sha512-def
      tarball: https://example.invalid/pkg/-/pkg-1.0.0.tgz
`;

  expect(normalizeProxyTarballUrls(lockfile)).toBe(`packages:
  pkg:
    resolution:
      integrity: sha512-abc
      tarball:
  external:
    resolution:
      integrity: sha512-def
      tarball: https://example.invalid/pkg/-/pkg-1.0.0.tgz
`);
});

it("strips proxy tarballs from pnpm v9 flow-style resolutions", () => {
  const lockfile = `packages:
  pkg:
    resolution: {integrity: sha512-abc, tarball: https://packagefeedproxy.microsoft.io/npm/pkg/-/pkg-1.0.0.tgz}
`;

  expect(normalizeProxyTarballUrls(lockfile)).toBe(`packages:
  pkg:
    resolution: {integrity: sha512-abc}
`);
});
