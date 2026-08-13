#!/usr/bin/env node
// Regenerates every GitHub-derived region of index.html.
//
// Why a snapshot at all: the unauthenticated GitHub API allows 60 requests per
// hour per IP. Anyone behind a shared address (a university, an office) can
// land here with the budget already spent, and the language bar is the page's
// load-bearing "real data" evidence. So the bar, the tech chips and the star
// counts are all written into the markup, render with JavaScript disabled, and
// the live API only upgrades them.
//
// Run after shipping work you want reflected:  node tools/snapshot.mjs

import { readFile, writeFile } from "node:fs/promises";

const USER = "anthrxc";
const SHOWN = ["profiler-machine", "portfolio", "v14-template"];
const FEATURE = "profiler-machine";
// Segment colours mirror --seam-glow / --seam / --ash / --edge-strong.
const COLORS = ["#b27fe0", "#8844a8", "#93999d", "#5d676f"];

const api = async (path) => {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} on ${path}`);
  return res.json();
};

const region = (html, name, body) => {
  const start = `<!-- ${name}:start -->`;
  const end = `<!-- ${name}:end -->`;
  const a = html.indexOf(start);
  const b = html.indexOf(end);
  if (a === -1 || b === -1) throw new Error(`missing ${name} markers in index.html`);
  // Preserve whatever indentation the closing marker already sits at, so
  // regenerating doesn't reflow the surrounding markup.
  const indent = (html.slice(0, b).match(/\n([ \t]*)$/) || ["", ""])[1];
  return html.slice(0, a) + start + "\n" + body + "\n" + indent + html.slice(b);
};

const repos = (await api(`/users/${USER}/repos?per_page=100`)).filter((r) => !r.fork);

const totals = {};
const perRepo = {};
for (const repo of repos) {
  const langs = await api(`/repos/${USER}/${repo.name}/languages`);
  perRepo[repo.name] = langs;
  for (const [name, bytes] of Object.entries(langs)) {
    totals[name] = (totals[name] || 0) + bytes;
  }
}

const snapshot = {
  generated: new Date().toISOString().slice(0, 10),
  stars: Object.fromEntries(SHOWN.map((n) => {
    const r = repos.find((x) => x.name === n);
    return [n, r ? r.stargazers_count : 0];
  })),
  // "Is he shipping right now" is a top-three question for a prospective
  // client, and star counts do not answer it.
  updated: Object.fromEntries(SHOWN.map((n) => {
    const r = repos.find((x) => x.name === n);
    return [n, r ? r.pushed_at.slice(0, 7) : null];
  })),
  languages: Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, bytes]) => ({ name, bytes })),
  // Languages under 5% of a repo are noise in a chip row: "Batchfile" beside
  // "Python" reads as a claimed skill rather than a byte count.
  repos: Object.fromEntries(SHOWN.map((n) => {
    const langs = perRepo[n] || {};
    const total = Object.values(langs).reduce((a, b) => a + b, 0) || 1;
    return [n, Object.entries(langs)
      .filter(([, bytes]) => bytes / total >= 0.05)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)];
  })),
};

// Top three languages plus an "Other" bucket, matching what script.js renders.
const sum = snapshot.languages.reduce((a, l) => a + l.bytes, 0);
const top = snapshot.languages.slice(0, 3).map((l) => [l.name, l.bytes]);
const rest = snapshot.languages.slice(3).reduce((a, l) => a + l.bytes, 0);
if (rest > 0) top.push(["Other", rest]);

const segs = top.map(([, bytes], i) =>
  `<span style="flex-grow:${(bytes / sum * 100).toFixed(3)};background:${COLORS[i]}"></span>`).join("");
const keys = top.map(([name, bytes], i) =>
  `<span><i style="color:${COLORS[i]}"></i><span><b>${Math.round(bytes / sum * 100)}%</b> ${name}</span></span>`).join("");

let html = await readFile("index.html", "utf8");

html = region(html, "gh-snapshot",
  `<script type="application/json" id="gh-snapshot">\n${JSON.stringify(snapshot, null, 2)}\n</script>`);

html = region(html, "lang-bar",
  `      <div class="lang-bar" id="langBar" aria-hidden="true">${segs}</div>\n` +
  `      <p class="lang-key" id="langKey">${keys}</p>`);

html = region(html, "feature-tech",
  `          <ul class="project-tech" id="featureTech" aria-label="Languages in this repository">` +
  (snapshot.repos[FEATURE] || []).map((n) => `<li>${n}</li>`).join("") +
  `</ul>`);

// Star counts live in the markup so they survive a rate-limited load. The badge
// stays hidden at zero, because a 0 next to the credibility pitch says nothing.
for (const [name, n] of Object.entries(snapshot.stars)) {
  const article = new RegExp(`(data-repo="${name}"[\\s\\S]*?<span class="stars" data-stars)( hidden)?([\\s\\S]*?<span class="stars-n">)\\d+(</span>)`);
  if (!article.test(html)) throw new Error(`could not locate star markup for ${name}`);
  html = html.replace(article, `$1${n < 1 ? " hidden" : ""}$3${n}$4`);
}

const MONTHS = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];
const monthName = (ym) => {
  if (!ym) return "n/a";
  const [y, m] = ym.split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
};
for (const [name, ym] of Object.entries(snapshot.updated)) {
  const slot = new RegExp(`(data-repo="${name}"[\\s\\S]*?<span class="project-updated" data-updated>)[^<]*(</span>)`);
  if (!slot.test(html)) throw new Error(`could not locate updated slot for ${name}`);
  html = html.replace(slot, `$1Updated ${monthName(ym)}$2`);
}

html = html.replace(
  /(<p class="projects-note" id="projectsNote">★ counts from a snapshot taken )\d{4}-\d{2}-\d{2}(<\/p>)/,
  `$1${snapshot.generated}$2`);

await writeFile("index.html", html, "utf8");
console.log(`Snapshot written: ${snapshot.languages.length} languages, stars ${JSON.stringify(snapshot.stars)}, generated ${snapshot.generated}.`);
