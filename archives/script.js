(function(){
  "use strict";

  var yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();

  var boxes = Array.prototype.slice.call(document.querySelectorAll(".box"));

  // Accordion: each box is a disclosure toggled by its label button.
  boxes.forEach(function(box){
    var btn = box.querySelector(".box-label");
    if (!btn) return;

    // reflect the server-rendered aria-expanded="true" default in the class
    if (btn.getAttribute("aria-expanded") === "true") box.classList.add("is-open");

    btn.addEventListener("click", function(){
      var willOpen = btn.getAttribute("aria-expanded") !== "true";

      // single-open: opening one drawer closes any other that's open
      if (willOpen){
        boxes.forEach(function(other){
          if (other === box) return;
          other.classList.remove("is-open");
          var ob = other.querySelector(".box-label");
          if (ob) ob.setAttribute("aria-expanded", "false");
        });
      }

      btn.setAttribute("aria-expanded", String(willOpen));
      box.classList.toggle("is-open", willOpen);
    });
  });

  // Live data: pull language, description, and license from the anthrxc-archives
  // org. The hand-written HTML stays as a fallback if the API is unreachable.
  function repoKey(box){
    var n = box.querySelector(".box-name");
    return n ? n.textContent.trim() : "";
  }

  function hydrate(repos){
    var by = {};
    repos.forEach(function(r){ by[r.name] = r; });

    boxes.forEach(function(box){
      var repo = by[repoKey(box)];
      if (!repo) return;

      if (repo.language){
        var lang = box.querySelector(".box-lang");
        if (lang) lang.textContent = repo.language;
      }

      // The authored line stays authored. The GitHub blurb is a one-line repo
      // summary; these paragraphs are the only reason this page exists, and
      // overwriting them left the jokes visible only when the fetch failed.

      // License: prefer the live SPDX id, but never overwrite an authored note
      // (e.g. reaperbot's "the first one") or blank out a repo with no license.
      var lic = box.querySelector(".box-license");
      if (lic && !lic.classList.contains("box-license--note")
          && repo.license && repo.license.spdx_id
          && repo.license.spdx_id !== "NOASSERTION"){
        lic.textContent = repo.license.spdx_id;
      }
    });
  }

  fetch("https://api.github.com/orgs/anthrxc-archives/repos?per_page=100")
    .then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); })
    .then(hydrate)
    .catch(function(){ /* keep the static fallback content */ });

  console.log("%c>x_", "color:#b27fe0;font:700 44px 'Space Mono',monospace");
  console.log(
    "%cyou came to the archives AND opened devtools. the code in here is from 2021.\nyou were warned.",
    "color:#cbd0d4;font:13px 'Space Mono',monospace;line-height:1.6"
  );
})();
