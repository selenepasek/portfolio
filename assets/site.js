(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function initMenu() {
    var btn = $('[data-menu-toggle]');
    var panel = $('[data-menu-panel]');
    if (!btn || !panel) return;
    btn.addEventListener('click', function () {
      var open = panel.hasAttribute('hidden');
      if (open) { panel.removeAttribute('hidden'); } else { panel.setAttribute('hidden', ''); }
      btn.setAttribute('aria-expanded', String(open));
    });
  }

  function initReveal() {
    var items = $$('.reveal');
    if (!items.length) return;
    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var d = parseInt(e.target.getAttribute('data-delay') || '0', 10);
        setTimeout(function () { e.target.classList.add('is-in'); }, d);
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }

  function initScramble() {
    var pool = '/\\|_-+*·≈∿░▒▚▞';
    $$('[data-scramble]').forEach(function (el) {
      var label = el.textContent.trim();
      var timer = null;
      el.setAttribute('data-label', label);

      function run() {
        if (reduced || timer) return;
        var step = 0;
        timer = setInterval(function () {
          step += 1;
          var settled = step * 1.7;
          el.textContent = label.split('').map(function (ch, n) {
            if (ch === ' ') return ' ';
            if (n < settled) return ch;
            return pool.charAt(Math.floor(Math.random() * pool.length));
          }).join('');
          if (settled > label.length) {
            clearInterval(timer);
            timer = null;
            el.textContent = label;
          }
        }, 26);
      }

      var host = el.closest('a, button') || el;
      host.addEventListener('mouseenter', run);
      host.addEventListener('focus', run);
    });
  }

  function initPointer() {
    var stage = $('[data-pointer-stage]');
    if (!stage || reduced) return;
    var glow = $('[data-glow]', stage);
    var blob = $('[data-blob]');
    var tx = 0.5, ty = 0.4, cx = 0.5, cy = 0.4, raf = null;

    stage.addEventListener('pointermove', function (e) {
      var r = stage.getBoundingClientRect();
      tx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      ty = Math.min(1, Math.max(0, (e.clientY - r.top) / Math.min(r.height, 1000)));
      if (!raf) raf = requestAnimationFrame(tick);
    });

    function tick() {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      if (glow) glow.style.transform = 'translate3d(' + (cx * stage.offsetWidth) + 'px,' + (cy * 900) + 'px,0)';
      if (blob) blob.style.transform = 'translate3d(' + ((cx - 0.5) * -38).toFixed(1) + 'px,' + ((cy - 0.5) * -30).toFixed(1) + 'px,0) rotate(' + ((cx - 0.5) * 9).toFixed(2) + 'deg)';
      raf = (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) ? requestAnimationFrame(tick) : null;
    }
  }

  function initAccordion() {
    var cards = $$('[data-acc]');
    if (!cards.length) return;

    function close(card) {
      card.setAttribute('aria-expanded', 'false');
      card.classList.remove('border-lilac', 'bg-lilac/[0.07]');
      card.classList.add('border-line', 'bg-panel/60');
      var body = $('[data-acc-body]', card); if (body) body.hidden = true;
      var sign = $('[data-acc-sign]', card); if (sign) sign.textContent = '+';
    }
    function open(card) {
      card.setAttribute('aria-expanded', 'true');
      card.classList.add('border-lilac', 'bg-lilac/[0.07]');
      card.classList.remove('border-line', 'bg-panel/60');
      var body = $('[data-acc-body]', card); if (body) body.hidden = false;
      var sign = $('[data-acc-sign]', card); if (sign) sign.textContent = '−';
    }

    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        var wasOpen = card.getAttribute('aria-expanded') === 'true';
        cards.forEach(close);
        if (!wasOpen) open(card);
      });
    });
  }

  function initTopology() {
    var map = $('[data-topology]');
    if (!map) return;

    var nodes = $$('[data-node]', map);
    var links = $$('[data-link]', map);
    var path = (map.getAttribute('data-path') || '').split(',').filter(Boolean);
    var runBtn = $('[data-trace-run]');
    var log = $('[data-trace-log]');
    var idle = $('[data-trace-idle]');
    var done = $('[data-trace-done]');
    var selected = map.getAttribute('data-start') || (nodes[0] && nodes[0].getAttribute('data-node'));
    var reached = {};
    var timer = null;

    function centre(el) {
      return { x: el.offsetLeft, y: el.offsetTop };
    }

    function drawLinks() {
      links.forEach(function (link) {
        var a = $('[data-node="' + link.getAttribute('data-from') + '"]', map);
        var b = $('[data-node="' + link.getAttribute('data-to') + '"]', map);
        if (!a || !b) return;
        var pa = centre(a), pb = centre(b);
        var dx = pb.x - pa.x, dy = pb.y - pa.y;
        link.style.left = pa.x + 'px';
        link.style.top = (pa.y - 1) + 'px';
        link.style.width = Math.sqrt(dx * dx + dy * dy).toFixed(1) + 'px';
        link.style.transform = 'rotate(' + (Math.atan2(dy, dx) * 180 / Math.PI).toFixed(2) + 'deg)';
      });
    }

    function paint() {
      nodes.forEach(function (n) {
        var id = n.getAttribute('data-node');
        var on = id === selected;
        var hot = !!reached[id];
        n.setAttribute('aria-pressed', String(on));
        n.style.borderColor = on ? '#5E42D3' : (hot ? 'rgba(94,66,211,0.55)' : 'rgba(94,66,211,0.22)');
        n.style.background = on ? 'rgba(94,66,211,0.10)' : (hot ? 'rgba(94,66,211,0.05)' : '#FFFFFF');
      });
      links.forEach(function (l) {
        var hot = reached[l.getAttribute('data-from')] && reached[l.getAttribute('data-to')];
        l.style.background = hot ? '#5E42D3' : 'rgba(94,66,211,0.26)';
      });
    }

    function showDetail(id) {
      var n = $('[data-node="' + id + '"]', map);
      if (!n) return;
      var set = function (key) {
        var out = $('[data-detail="' + key + '"]');
        if (out) out.textContent = n.getAttribute('data-' + key) || '—';
      };
      ['name', 'addr', 'layer', 'role', 'body'].forEach(set);
    }

    function select(id) { selected = id; paint(); showDetail(id); }

    nodes.forEach(function (n) {
      n.addEventListener('click', function () { select(n.getAttribute('data-node')); });
    });

    if (runBtn && log) {
      runBtn.addEventListener('click', function () {
        if (timer) clearInterval(timer);
        reached = {};
        log.innerHTML = '';
        if (idle) idle.hidden = true;
        if (done) done.hidden = true;
        runBtn.textContent = 'trazando…';
        runBtn.disabled = true;

        var i = -1;
        timer = setInterval(function () {
          i += 1;
          if (i >= path.length) {
            clearInterval(timer);
            timer = null;
            runBtn.textContent = 'lanzar traceroute';
            runBtn.disabled = false;
            if (done) done.hidden = false;
            return;
          }
          var id = path[i];
          var n = $('[data-node="' + id + '"]', map);
          reached[id] = true;
          select(id);

          var row = document.createElement('p');
          row.className = 'm-0 flex gap-3.5 text-soft';
          row.innerHTML = '<span class="shrink-0 w-6 text-lilac"></span>'
                        + '<span class="grow min-w-0 text-cream"></span>'
                        + '<span class="shrink-0 text-mute"></span>';
          row.children[0].textContent = String(i + 1);
          row.children[1].textContent = n.getAttribute('data-name') + '  ' + n.getAttribute('data-addr');
          row.children[2].textContent = n.getAttribute('data-role');
          log.appendChild(row);
        }, 620);
      });
    }

    drawLinks();
    select(selected);
    window.addEventListener('resize', drawLinks);
  }

  function initFilters() {
    var group = $('[data-filters]');
    if (!group) return;
    var chips = $$('[data-filter]', group);
    var items = $$('[data-kind]');
    var out = $('[data-filter-count]');

    function apply(kind) {
      var shown = 0;
      items.forEach(function (it) {
        var ok = kind === 'todo' || it.getAttribute('data-kind') === kind;
        it.hidden = !ok;
        if (ok) shown++;
      });
      chips.forEach(function (c) {
        var on = c.getAttribute('data-filter') === kind;
        c.setAttribute('aria-pressed', String(on));
        c.style.background = on ? '#5E42D3' : 'transparent';
        c.style.color = on ? '#FFFFFF' : '#3E3A4F';
        c.style.borderColor = on ? '#5E42D3' : 'rgba(94,66,211,0.30)';
      });
      if (out) out.textContent = shown === 1 ? '1 entrada' : shown + ' entradas';
    }

    chips.forEach(function (c) {
      var kind = c.getAttribute('data-filter');
      var n = kind === 'todo' ? items.length : items.filter(function (i) { return i.getAttribute('data-kind') === kind; }).length;
      var badge = $('[data-filter-n]', c);
      if (badge) badge.textContent = String(n);
      c.addEventListener('click', function () { apply(kind); });
    });

    apply('todo');
  }

  function boot() {
    initMenu();
    initReveal();
    initScramble();
    initPointer();
    initAccordion();
    initTopology();
    initFilters();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
