(function () {
    var el = document.getElementById('typed');
    var out = document.getElementById('out');
    var msg = 'rebuilding portfolio';
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { el.textContent = msg; out.hidden = false; return; }
    var i = 0;
    function step() {
        if (i <= msg.length) { el.textContent = msg.slice(0, i); i++; setTimeout(step, 65); }
        else { setTimeout(function () { out.hidden = false; }, 350); }
    }
    setTimeout(step, 900);
})();