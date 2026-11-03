# biome-config

`@rrlab/biome-config` is the [Biome](https://biomejs.dev) preset of [run-run](https://github.com/withvariablelab/dx/tree/main/run-run/cli). The `biome.json` that [`@rrlab/biome-plugin`](https://www.npmjs.com/package/@rrlab/biome-plugin) writes extends it.

## Install

If you use run-run:

```sh
rr plugins add biome
```

Once you confirm, it installs this preset and writes a `biome.json` that extends it.

Without run-run, install it by hand:

```sh
pnpm add -D @rrlab/biome-config @biomejs/biome
```

Then create a `biome.json`:

```json
{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "extends": ["@rrlab/biome-config"]
}
```

It needs Biome 2.6 or later: the preset sets `markdown`, which Biome 2.6 added, and an older Biome stops on a key it doesn't know.

## What it sets

Besides the formatter and linter defaults, the preset:

- parses Markdown frontmatter, and leaves the code blocks inside Markdown unformatted;
- keeps Biome's formatter, linter and assist off the files other tools write: `.mise/locks/`, `.changeset/*.md`, every `CHANGELOG.md` and `.github/workflows/pullfrog.yml`.

It turns those files off with an `overrides` entry, not `files.includes`, so your own `files.includes` keeps working as written, `"**"` included.

## Configuration

Keys in your `biome.json` win over the preset. Add `linter.rules`, `formatter`, `files.includes` or any other setting as you need. Lists such as `files.includes` and `overrides` add to the preset's, and yours come last: to format your `CHANGELOG.md` after all, add an override that turns the formatter on for it. To chain another shared config on top, append it to the `extends` array: later entries override earlier ones, so your preferences and local keys win over this base.

## License

[MIT](https://github.com/withvariablelab/dx/blob/main/LICENSE).

<p align="center">
  <a href="https://lab.variable.land"><img src="https://cdn.jsdelivr.net/gh/withvariablelab/brand@v0.3.1/.github/readme/logo.svg" width="24" alt="" align="absmiddle">&nbsp;Variable Land</a>
</p>
