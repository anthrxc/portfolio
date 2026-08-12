(function(){
  "use strict";

  // Gates the affordances that only work with JS running — without this the
  // stack captions advertise an easter egg that can't open.
  document.documentElement.classList.add("js");

  document.getElementById("yr").textContent = new Date().getFullYear();

  // Segment colours are read off the design tokens so the bar can never drift
  // from the palette the rest of the page uses.
  var css = getComputedStyle(document.documentElement);
  function token(name, fallback){
    return (css.getPropertyValue(name) || "").trim() || fallback;
  }
  var LANG_COLORS = [
    token("--seam-glow", "#b27fe0"),
    token("--seam", "#8844a8"),
    token("--ash", "#93999d"),
    token("--edge-strong", "#5b656d")
  ];

  function snapshot(){
    var el = document.getElementById("gh-snapshot");
    if (!el) return null;
    try { return JSON.parse(el.textContent); } catch (e) { return null; }
  }
  var snap = snapshot();

  // ---- Language mix -------------------------------------------------------
  // Rendered from the embedded snapshot on first paint. The GitHub API is
  // capped at 60 requests/hour per IP for anonymous callers, so a visitor on a
  // shared address would otherwise meet an empty band where the page's only
  // piece of live evidence should be.
  function renderLangs(langs){
    if (!langs || !langs.length) return;

    var sum = langs.reduce(function(a, l){ return a + l.bytes; }, 0);
    if (!sum) return;

    var top = langs.slice(0, 3).map(function(l){ return [l.name, l.bytes]; });
    var rest = langs.slice(3).reduce(function(a, l){ return a + l.bytes; }, 0);
    if (rest > 0) top.push(["Other", rest]);

    var bar = document.getElementById("langBar");
    var key = document.getElementById("langKey");
    bar.innerHTML = ""; key.innerHTML = "";

    top.forEach(function(p, i){
      var pct = p[1] / sum * 100;
      var c = LANG_COLORS[i] || LANG_COLORS[LANG_COLORS.length - 1];

      var seg = document.createElement("span");
      seg.style.flexGrow = pct;
      seg.style.background = c;
      bar.appendChild(seg);

      // A swatch per row: the mapping stops depending on segment order, and on
      // telling two adjacent hues apart in a 6px strip.
      var row = document.createElement("span");
      var dot = document.createElement("i");
      dot.style.color = c;
      row.appendChild(dot);
      var label = document.createElement("span");
      label.innerHTML = "<b>" + pct.toFixed(0) + "%</b> " + p[0];
      row.appendChild(label);
      key.appendChild(row);
    });

    document.getElementById("langMix").hidden = false;
  }

  function renderTech(names){
    var list = document.getElementById("featureTech");
    if (!list || !names || !names.length) return;
    list.innerHTML = "";
    names.forEach(function(n){
      var li = document.createElement("li");
      li.textContent = n;
      list.appendChild(li);
    });
  }

  function applyStars(stars){
    if (!stars) return;
    Array.prototype.slice.call(document.querySelectorAll(".project")).forEach(function(card){
      var n = stars[card.dataset.repo];
      if (typeof n !== "number") return;
      card.querySelector(".stars-n").textContent = n;
      // A 0-star repo says nothing useful next to the credibility pitch —
      // only show the star badge once there's at least one star.
      var starsEl = card.querySelector(".stars");
      if (starsEl) starsEl.hidden = n < 1;
    });
  }

  if (snap){
    renderLangs(snap.languages);
    renderTech(snap.repos && snap.repos["profiler-machine"]);
    applyStars(snap.stars);
    document.getElementById("projectsNote").textContent =
      "★ counts from a snapshot taken " + snap.generated;
  }

  // ---- Live upgrade -------------------------------------------------------
  // One request, not one per repo. Stars and primary language refresh; the
  // authored descriptions are never touched, because the API blurb is not the
  // copy this page was written with.
  fetch("https://api.github.com/users/anthrxc/repos?per_page=100")
    .then(function(r){ if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function(data){
      var by = {};
      data.forEach(function(r){ by[r.name] = r; });

      Array.prototype.slice.call(document.querySelectorAll(".project")).forEach(function(card){
        var repo = by[card.dataset.repo];
        if (!repo) return;
        var n = repo.stargazers_count || 0;
        card.querySelector(".stars-n").textContent = n;
        var starsEl = card.querySelector(".stars");
        if (starsEl) starsEl.hidden = n < 1;
        if (repo.language) card.querySelector(".lang").textContent = repo.language;
      });

      document.getElementById("projectsNote").textContent = "★ counts live from the GitHub API";
    })
    .catch(function(){
      // The snapshot is already on screen; say so rather than blanking it.
      if (!snap){
        document.getElementById("projectsNote").textContent =
          "★ counts unavailable right now";
      }
    });

  // ---- Stack easter egg ---------------------------------------------------
  // A real button per language: the joke is announced when it opens rather
  // than read out unconditionally as a description, and the dashed caption
  // gives it an affordance instead of hiding it behind a blind hover.
  (function stackJokes(){
    var items = Array.prototype.slice.call(document.querySelectorAll(".stack-item"));
    if (!items.length) return;

    var coarse = window.matchMedia("(hover:none), (pointer:coarse)").matches;
    var open = null;
    var intent = null;

    function tipOf(btn){ return btn.parentNode.querySelector(".stack-joke"); }

    function clamp(btn){
      var tip = tipOf(btn);
      if (!tip) return;
      tip.style.setProperty("--joke-shift", "0px");
      // clientWidth is the actual painted content width (excludes scrollbar),
      // so clamping to it prevents the bubble from adding horizontal scroll.
      var vw = document.documentElement.clientWidth;
      var r = tip.getBoundingClientRect();
      var pad = 8, shift = 0;
      if (r.left < pad) shift = pad - r.left;
      else if (r.right > vw - pad) shift = (vw - pad) - r.right;
      tip.style.setProperty("--joke-shift", Math.round(shift) + "px");
    }
    function show(btn){
      if (open && open !== btn) hide(open);
      btn.setAttribute("aria-expanded", "true");
      clamp(btn);
      open = btn;
    }
    function hide(btn){
      if (!btn) return;
      btn.setAttribute("aria-expanded", "false");
      var tip = tipOf(btn);
      if (tip) tip.style.removeProperty("--joke-shift");
      if (open === btn) open = null;
    }
    function toggle(btn){
      (btn.getAttribute("aria-expanded") === "true" ? hide : show)(btn);
    }

    items.forEach(function(btn){
      if (coarse){
        btn.addEventListener("click", function(){ toggle(btn); });
      } else {
        // Hover has usually opened it already, so activation confirms rather
        // than toggles — otherwise clicking a hovered item closes it.
        btn.addEventListener("click", function(){ clearTimeout(intent); show(btn); });
        // A short delay so sweeping the cursor across the row doesn't fire all
        // five bubbles in sequence.
        btn.addEventListener("pointerenter", function(){
          clearTimeout(intent);
          intent = setTimeout(function(){ show(btn); }, 90);
        });
        btn.addEventListener("pointerleave", function(){ clearTimeout(intent); hide(btn); });
        btn.addEventListener("focus", function(){ clearTimeout(intent); show(btn); });
        btn.addEventListener("blur", function(){ hide(btn); });
      }
    });

    document.addEventListener("keydown", function(e){
      // Escape closes the bubble and leaves focus where it was; blurring here
      // used to send a keyboard user back to the top of the document.
      if (e.key === "Escape" && open) hide(open);
    });
    document.addEventListener("pointerdown", function(e){
      if (open && !open.parentNode.contains(e.target)) hide(open);
    });
    window.addEventListener("resize", function(){ if (open) clamp(open); });
  })();
})();
