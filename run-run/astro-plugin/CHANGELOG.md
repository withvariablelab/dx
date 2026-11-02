# @rrlab/astro-plugin

## 0.1.2

### Patch Changes

- [#285](https://github.com/withvariablelab/dx/pull/285) [`f963159`](https://github.com/withvariablelab/dx/commit/f963159e692b572b39d486814cb292de69707077) Thanks [@rqbazan](https://github.com/rqbazan)! - `rr tsc doctor` looks for what `astro check` needs, `@astrojs/check` and `typescript`, in each package it checks instead of the directory `rr` was started from. Run at a monorepo root, it used to look for them there, and reported them missing when only the Astro package had them.

- [#285](https://github.com/withvariablelab/dx/pull/285) [`f963159`](https://github.com/withvariablelab/dx/commit/f963159e692b572b39d486814cb292de69707077) Thanks [@rqbazan](https://github.com/rqbazan)! - In a monorepo, `rr tsc` and `rr check` run `astro check` only in the Astro packages, the ones with an `astro.config.*` or with `astro` in `dependencies`, `devDependencies` or `peerDependencies`, and `tsc --noEmit` in the other packages with a `tsconfig.json`. `astro check` used to run in every one of them, so in a plain TypeScript package it booted Astro, printed Vite warnings and wrote `.astro/` into the package. Such a package needs only `typescript`, and `rr tsc doctor` there checks `tsc`.

- [#281](https://github.com/withvariablelab/dx/pull/281) [`301bfe5`](https://github.com/withvariablelab/dx/commit/301bfe5202550431cc9e725f8efe703ab7e57fb8) Thanks [@rqbazan](https://github.com/rqbazan)! - The npm description, and the README where it changed, say what the code does.
- Updated dependencies [[`301bfe5`](https://github.com/withvariablelab/dx/commit/301bfe5202550431cc9e725f8efe703ab7e57fb8)]:
  - @variablelab/clibuddy@0.8.2

## 0.1.1

### Patch Changes

- [#278](https://github.com/withvariablelab/dx/pull/278) [`b463230`](https://github.com/withvariablelab/dx/commit/b463230abf9ead24c3c5a5a89c1f94647df64d00) Thanks [@rqbazan](https://github.com/rqbazan)! - The README follows the Variable Lab README structure, and the tarball now includes the MIT `LICENSE`.
- Updated dependencies [[`b463230`](https://github.com/withvariablelab/dx/commit/b463230abf9ead24c3c5a5a89c1f94647df64d00)]:
  - @variablelab/clibuddy@0.8.1

## 0.1.0

### Minor Changes

- [#270](https://github.com/withvariablelab/dx/pull/270) [`8febcf5`](https://github.com/withvariablelab/dx/commit/8febcf53d98964d8c475e125b706ff81bd682fec) Thanks [@rqbazan](https://github.com/rqbazan)! - Add `@rrlab/astro-plugin`, which provides the `typecheck` capability through `astro check`.
  
  In an Astro project, `rr tsc` and `rr check` now type-check `.astro` files along with the rest of the project, so they replace a separate `astro check` step. `rr plugins add astro` installs it.
