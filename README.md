# Portfolio Website

My portfolio, at [anthrxc.is-a.dev](https://anthrxc.is-a.dev). Hand-written
HTML, CSS and JavaScript. No framework, no build step.

## Snapshot data

The language bar, star counts, tech chips and per-project dates are written
into `index.html` rather than fetched at runtime, so the page renders its real
data with no network call and with JavaScript disabled. The GitHub API only
upgrades what is already on screen.

Regenerate after shipping work worth reflecting:

```
node tools/snapshot.mjs
```

One run costs roughly 2 + N requests across every public repo. Anonymous
GitHub allows 60 per hour; set `GITHUB_TOKEN` to raise that to 5000.

## MIT License

This repository and its contents are licensed under the MIT License, found
[here](https://github.com/anthrxc/portfolio/blob/main/LICENSE.md).
