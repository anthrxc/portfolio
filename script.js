(function(){
  "use strict";

  // Gates the affordances that only work with JS running. Without this the
  // stack captions advertise an easter egg that can't open.
  document.documentElement.classList.add("js");

  // Guarded: unguarded at the top of the IIFE, a missing #yr threw and took
  // every feature below it down with it (meter, stars, nav indicator, copy,
  // lightbox, jokes) for the sake of a footer year.
  var yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();

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
    token("--edge-strong", "#5d676f")
  ];

  var MONTHS = ["January","February","March","April","May","June",
    "July","August","September","October","November","December"];
  function monthName(ym){
    var parts = String(ym).split("-");
    return MONTHS[Number(parts[1]) - 1] + " " + parts[0];
  }

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
      // Built as nodes, not a concatenated innerHTML string: this is the one
      // place page text comes from a data file, and the API path next to it is
      // already textContent throughout.
      var label = document.createElement("span");
      var pctEl = document.createElement("b");
      pctEl.textContent = pct.toFixed(0) + "%";
      label.appendChild(pctEl);
      label.appendChild(document.createTextNode(" " + p[0]));
      row.appendChild(label);
      key.appendChild(row);
    });
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
      // A 0-star repo says nothing useful next to the credibility pitch, so
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
      "Stars and dates from GitHub, as of " + snap.generated;
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
        var lang = card.querySelector(".lang");
        if (repo.language && lang) lang.textContent = repo.language;
        var when = card.querySelector("[data-updated]");
        if (when && repo.pushed_at) when.textContent = "Updated " + monthName(repo.pushed_at.slice(0, 7));
      });

      document.getElementById("projectsNote").textContent = "Stars and dates read live from GitHub";
    })
    .catch(function(){
      // The snapshot is already on screen and its note already says so, so a
      // failed upgrade needs no message. Nothing to do.
    });

  // ---- Active section indicator -------------------------------------------
  // Marks the nav link for whichever section the reader is currently in, so
  // the four anchors say "where am I" and not just "where can I go".
  (function activeSection(){
    var links = Array.prototype.slice
      .call(document.querySelectorAll('.nav-links a[href^="#"]'))
      .map(function(a){ return { el: a, section: document.getElementById(a.getAttribute("href").slice(1)) }; })
      .filter(function(p){ return p.section; });
    if (!links.length) return;

    var header = document.querySelector(".nav");
    var current = null;
    var queued = false;

    // Publish the real header height so scroll-margin-top tracks it instead of
    // a hardcoded literal that detunes every anchor when the pill's metrics
    // change. The CSS fallback covers the pre-script paint.
    function publishNavHeight(){
      if (!header) return;
      document.documentElement.style.setProperty("--nav-h", header.offsetHeight + "px");
    }

    function apply(next){
      if (next === current) return;
      if (current) current.el.removeAttribute("aria-current");
      if (next) next.el.setAttribute("aria-current", "location");
      current = next;
    }

    function measure(){
      queued = false;
      publishNavHeight();
      // A section counts as current once its top clears the sticky header.
      var line = window.scrollY + (header ? header.offsetHeight : 0) + 8;
      var found = null;
      links.forEach(function(p){
        if (p.section.offsetTop <= line) found = p;
      });
      // At the very bottom the last section may never reach the line.
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 2) {
        found = links[links.length - 1];
      }
      apply(found);
    }

    function schedule(){
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(measure);
    }

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("hashchange", schedule);
    measure();
  })();

  // ---- Click to copy the contact address ----------------------------------
  // Built from script rather than shipped as markup, so the no-JS page keeps
  // plain selectable text instead of a control that cannot work.
  (function copyEmail(){
    var el = document.querySelector(".contact-mail");
    if (!el || el.tagName === "BUTTON") return;
    var address = el.textContent.trim();

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "contact-mail";
    btn.textContent = address;
    // The visible address is contained in the accessible name, per SC 2.5.3.
    btn.setAttribute("aria-label", "Copy email address " + address);

    var note = document.createElement("span");
    note.className = "copy-note";
    note.setAttribute("role", "status");

    el.replaceWith(btn);
    btn.after(note);

    function selectSelf(){
      var range = document.createRange();
      range.selectNodeContents(btn);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }

    function copy(text){
      // navigator.clipboard needs a secure context; a plain-http preview on a
      // LAN or tailnet address is not one, so fall back to the old path.
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
      }
      return new Promise(function(resolve, reject){
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.top = "-1000px";
        document.body.appendChild(ta);
        ta.select();
        var ok = false;
        try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
        document.body.removeChild(ta);
        ok ? resolve() : reject(new Error("copy unavailable"));
      });
    }

    var clear = null;
    function say(msg){
      note.textContent = msg;
      clearTimeout(clear);
      clear = setTimeout(function(){ note.textContent = ""; }, 2400);
    }

    btn.addEventListener("click", function(){
      copy(address).then(function(){
        say("Copied");
      }).catch(function(){
        // Nothing was copied, so hand the address over another way rather than
        // claiming success.
        selectSelf();
        say("Press Ctrl+C to copy");
      });
    });
  })();

  // ---- Screenshot lightbox ------------------------------------------------
  // Thumbnails stay small in the card and open to viewport size on click.
  // Built from script, like the copy button: without JS the page keeps plain
  // images rather than advertising a control that cannot open anything.
  (function lightbox(){
    var figure = document.querySelector(".shots");
    if (!figure || typeof HTMLDialogElement === "undefined") return;

    var shots = Array.prototype.slice.call(figure.querySelectorAll("img"));
    if (!shots.length) return;

    var SVG_NS = "http://www.w3.org/2000/svg";
    function icon(d, extra){
      var svg = document.createElementNS(SVG_NS, "svg");
      svg.setAttribute("viewBox", "0 0 16 16");
      svg.setAttribute("aria-hidden", "true");
      var path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", d);
      svg.appendChild(path);
      if (extra){
        var p2 = document.createElementNS(SVG_NS, "path");
        p2.setAttribute("d", extra);
        svg.appendChild(p2);
      }
      return svg;
    }
    var D_EXPAND = "M6 2H2v4M10 14h4v-4M14 6V2h-4M2 10v4h4";
    var D_PREV   = "M10 3L5 8l5 5";
    var D_NEXT   = "M6 3l5 5-5 5";
    var D_CLOSE  = "M4 4l8 8M12 4l-8 8";

    // Wrap each shot in a button and mark it with a persistent zoom chip.
    var triggers = shots.map(function(img, i){
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "shot";
      btn.setAttribute("aria-label", "Expand: " + (img.dataset.label || "screenshot"));
      img.parentNode.insertBefore(btn, img);
      btn.appendChild(img);

      var chip = document.createElement("span");
      chip.className = "shot-zoom";
      chip.appendChild(icon(D_EXPAND));
      btn.appendChild(chip);

      btn.addEventListener("click", function(){ open(i); });
      return btn;
    });

    var dlg = document.createElement("dialog");
    dlg.className = "lightbox";
    dlg.setAttribute("aria-label", "Screenshot viewer");

    var frame = document.createElement("div");
    frame.className = "lb-frame";

    var big = document.createElement("img");
    big.className = "lb-img";

    var bar = document.createElement("div");
    bar.className = "lb-bar";
    var text = document.createElement("div");
    text.className = "lb-text";
    var label = document.createElement("span");
    label.className = "lb-label";
    var desc = document.createElement("p");
    desc.className = "lb-desc";
    text.appendChild(label);
    text.appendChild(desc);
    var count = document.createElement("span");
    count.className = "lb-count";
    var nav = document.createElement("div");
    nav.className = "lb-nav";

    function control(cls, aria, d, onClick){
      var b = document.createElement("button");
      b.type = "button";
      b.className = "lb-btn " + cls;
      b.setAttribute("aria-label", aria);
      b.appendChild(icon(d));
      b.addEventListener("click", onClick);
      return b;
    }
    var prevBtn  = control("lb-prev",  "Previous screenshot", D_PREV,  function(){ step(-1); });
    var nextBtn  = control("lb-next",  "Next screenshot",     D_NEXT,  function(){ step(1); });
    var closeBtn = control("lb-close", "Close viewer",        D_CLOSE, function(){ dlg.close(); });

    nav.appendChild(prevBtn);
    nav.appendChild(nextBtn);
    nav.appendChild(closeBtn);
    bar.appendChild(text);
    bar.appendChild(count);
    bar.appendChild(nav);
    frame.appendChild(big);
    frame.appendChild(bar);
    dlg.appendChild(frame);
    document.body.appendChild(dlg);

    var at = 0;
    function render(i){
      var src = shots[i];
      at = i;
      big.src = src.currentSrc || src.src;
      // Carried over so the expanded view reserves the right box before the
      // decode lands, exactly as the thumbnail does.
      if (src.getAttribute("width"))  big.setAttribute("width",  src.getAttribute("width"));
      if (src.getAttribute("height")) big.setAttribute("height", src.getAttribute("height"));
      big.alt = src.alt || "";
      label.textContent = src.dataset.label || "";
      desc.textContent = src.dataset.desc || "";
      desc.hidden = !src.dataset.desc;
      count.textContent = (i + 1) + " / " + shots.length;
      // One image means the arrows are decoration, so they go away entirely
      // rather than sitting there permanently dead.
      nav.insertBefore(prevBtn, nav.firstChild);
      prevBtn.hidden = nextBtn.hidden = shots.length < 2;
    }
    function step(d){ render((at + d + shots.length) % shots.length); }
    function open(i){
      render(i);
      dlg.showModal();
      closeBtn.focus();
    }

    dlg.addEventListener("keydown", function(e){
      if (shots.length < 2) return;
      if (e.key === "ArrowRight"){ e.preventDefault(); step(1); }
      else if (e.key === "ArrowLeft"){ e.preventDefault(); step(-1); }
    });
    // Click outside the frame closes. The dialog element itself is the
    // backdrop's hit area, so anything not inside .lb-frame counts as outside.
    dlg.addEventListener("click", function(e){
      if (!frame.contains(e.target)) dlg.close();
    });
    // Focus returns to the thumbnail that opened it, which the browser does on
    // its own only when the trigger is still focusable and in the document.
    dlg.addEventListener("close", function(){
      var t = triggers[at];
      if (t) t.focus();
    });
  })();

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

    // Roving tabindex: the row is one tab stop and arrow keys move between
    // languages. Five focusable jokes sitting between the hero and the project
    // grid made a keyboard user pay for the easter egg on the way past it.
    // Applied from script so that without JS these stay ordinary buttons
    // rather than a toolbar whose arrow-key behaviour never loads.
    var list = items[0].parentNode.parentNode;
    list.setAttribute("role", "toolbar");
    list.setAttribute("aria-label", "Languages I work in");
    list.setAttribute("aria-orientation", "horizontal");
    Array.prototype.slice.call(list.children).forEach(function(li){
      li.setAttribute("role", "presentation");
    });
    items.forEach(function(btn, i){ btn.tabIndex = i === 0 ? 0 : -1; });

    function focusItem(i){
      var n = (i + items.length) % items.length;
      items.forEach(function(b, j){ b.tabIndex = j === n ? 0 : -1; });
      items[n].focus();
    }

    list.addEventListener("keydown", function(e){
      var i = items.indexOf(document.activeElement);
      if (i === -1) return;
      var next;
      if (e.key === "ArrowRight") next = i + 1;
      else if (e.key === "ArrowLeft") next = i - 1;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = items.length - 1;
      else return;
      e.preventDefault();
      focusItem(next);
    });

    function tipOf(btn){ return btn.parentNode.querySelector(".stack-joke"); }

    // Cache the copy and clear it while closed: a role="status" region whose
    // content merely becomes visible is announced inconsistently, but one whose
    // content is inserted is announced reliably.
    items.forEach(function(btn){
      var tip = tipOf(btn);
      if (tip && !tip.dataset.joke){
        tip.dataset.joke = tip.innerHTML;
        tip.innerHTML = "";
      }
    });

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
      var tip = tipOf(btn);
      if (tip && tip.dataset.joke) tip.innerHTML = tip.dataset.joke;
      clamp(btn);
      open = btn;
    }
    function hide(btn){
      if (!btn) return;
      btn.setAttribute("aria-expanded", "false");
      var tip = tipOf(btn);
      if (tip){
        tip.style.removeProperty("--joke-shift");
        tip.innerHTML = "";
      }
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
        // than toggles, because otherwise clicking a hovered item closes it.
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
