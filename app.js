(function () {
  'use strict';
  var d = document, root = d.documentElement, body = d.body;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* header: transparent over the first screen, solid after 40px */
  var hdr = $('#hdr'), sentinel = $('#top-sentinel');
  if (hdr && sentinel && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { hdr.classList.toggle('solid', !es[0].isIntersecting); }).observe(sentinel);
  } else if (hdr) { hdr.classList.add('solid'); }

  /* burger drawer */
  var burger = $('.burger'), drawer = $('#drawer');
  function setDrawer(open) {
    if (!burger || !drawer) return;
    drawer.classList.toggle('open', open);
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) drawer.removeAttribute('inert'); else drawer.setAttribute('inert', '');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    body.classList.toggle('nav-open', open);
    syncBar();
  }
  if (burger) {
    burger.addEventListener('click', function () { setDrawer(burger.getAttribute('aria-expanded') !== 'true'); });
    $$('a', drawer).forEach(function (a) { a.addEventListener('click', function () { setDrawer(false); }); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer.classList.contains('open')) { setDrawer(false); burger.focus(); } });
    window.addEventListener('resize', function () { if (window.innerWidth >= 900 && drawer.classList.contains('open')) setDrawer(false); });
  }

  /* dialogs: the Arabic note and the call and directions sheet */
  var arDlg = $('#ar-dialog'), sheet = $('#sheet');
  function open(dlg) { if (dlg && dlg.showModal) { try { dlg.showModal(); } catch (e) { dlg.setAttribute('open', ''); } } else if (dlg) { dlg.setAttribute('open', ''); } }
  $$('[data-ar]').forEach(function (b) { b.addEventListener('click', function () { setDrawer(false); open(arDlg); }); });
  $$('[data-sheet-open]').forEach(function (b) {
    b.addEventListener('click', function () {
      var kind = b.getAttribute('data-sheet-open');
      $$('[data-sheet]', sheet).forEach(function (p) { p.hidden = p.getAttribute('data-sheet') !== kind; });
      $('[data-sheet-title]', sheet).textContent = kind === 'call' ? 'Call a house' : 'Directions to a house';
      open(sheet);
    });
  });
  $$('.dlg').forEach(function (dlg) {
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  });

  /* mobile action bar: hides on scroll down and over the footer */
  var bar = $('.abar'), foot = $('#foot'), footSeen = false, lastY = window.scrollY, hidden = false, tick = false;
  function syncBar() {
    if (!bar) return;
    var off = hidden || footSeen || body.classList.contains('nav-open');
    bar.classList.toggle('off', off);
  }
  if (bar) {
    window.addEventListener('scroll', function () {
      if (tick) return; tick = true;
      requestAnimationFrame(function () {
        var y = window.scrollY, dy = y - lastY;
        if (y > 160 && dy > 8) hidden = true; else if (dy < -8 || y <= 160) hidden = false;
        if (Math.abs(dy) > 8) lastY = y;
        tick = false; syncBar();
      });
    }, { passive: true });
    if (foot && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { footSeen = es[0].isIntersecting; syncBar(); }, { threshold: 0.12 }).observe(foot);
    }
  }

  /* reveal on first view, content stays visible without script */
  var rv = $$('.rv');
  if (rv.length) {
    if ('IntersectionObserver' in window && !reduce) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { threshold: 0.08, rootMargin: '0px 0px -4% 0px' });
      rv.forEach(function (el) {
        /* siblings that arrive together come in one after another */
        var sib = el.parentElement ? [].filter.call(el.parentElement.children, function (c) { return c.classList.contains('rv'); }) : [];
        el.style.setProperty('--d', Math.min(sib.indexOf(el), 4));
        io.observe(el);
      });
    } else { rv.forEach(function (el) { el.classList.add('in'); }); }
  }

  /* the rooms track */
  var track = $('.track');
  if (track) {
    var prev = $('[data-dir="-1"]'), next = $('[data-dir="1"]');
    var upd = function () {
      var max = track.scrollWidth - track.clientWidth - 2;
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= max;
    };
    $$('.tb').forEach(function (b) {
      b.addEventListener('click', function () {
        var dir = +b.getAttribute('data-dir');
        track.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: reduce ? 'auto' : 'smooth' });
      });
    });
    track.addEventListener('scroll', function () { requestAnimationFrame(upd); }, { passive: true });
    window.addEventListener('resize', upd); upd();
  }

  /* Cairo time */
  function cairoHours() {
    try {
      var p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
      var h = 0, m = 0;
      p.forEach(function (x) { if (x.type === 'hour') h = +x.value; if (x.type === 'minute') m = +x.value; });
      return h + m / 60;
    } catch (e) { var n = new Date(); return n.getHours() + n.getMinutes() / 60; }
  }
  function fmt(h) { h = h % 24; var ap = h >= 12 ? 'PM' : 'AM'; var hh = h % 12 || 12; return hh + ' ' + ap; }

  /* open now, per house, from the hours shown beside it */
  $$('.state[data-open]').forEach(function (el) {
    var o = +el.getAttribute('data-open'), c = +el.getAttribute('data-close'), t = cairoHours();
    var txt = $('.st-text', el); if (!txt) return;
    var hrs = txt.textContent;
    var isOpen = t >= o && t < c;
    txt.innerHTML = '';
    var b = d.createElement('b'); b.className = 'st-now';
    b.textContent = isOpen ? 'Open now, until ' + fmt(c) : 'Closed now, opens at ' + fmt(o);
    var s = d.createElement('span'); s.className = 'st-hrs'; s.textContent = hrs;
    txt.appendChild(b); txt.appendChild(s);
    el.classList.toggle('is-open', isOpen);
  });

  /* menu: time-of-day greeting */
  var greet = $('[data-greet]');
  if (greet) {
    var t = cairoHours(), h = $('[data-greet-h]'), p = $('[data-greet-p]'), a = $('[data-greet-a]');
    if (t < 7) { h.textContent = 'Good morning'; p.textContent = 'Breakfast is served from 7 AM to 1:30 PM.'; a.textContent = 'See breakfast'; a.href = '#breakfast'; }
    else if (t < 13.5) { h.textContent = 'Good morning'; p.textContent = 'Breakfast is served until 1:30 PM.'; a.textContent = 'See breakfast'; a.href = '#breakfast'; }
    else if (t < 17) { h.textContent = 'Good afternoon'; p.textContent = 'Breakfast plates are served until 1:30 PM. The all day breakfast items are on the menu all day.'; a.textContent = 'See all day items'; a.href = '#all-day'; }
    else { h.textContent = 'Good evening'; p.textContent = 'Always leave space for dessert.'; a.textContent = 'See the sweets'; a.href = '#sweets'; }
  }

  /* menu: chips follow the page */
  var chipsIn = $('.chips-in');
  if (chipsIn) {
    var chips = $$('.chip', chipsIn), byId = {};
    chips.forEach(function (c) { byId[c.getAttribute('href').slice(1)] = c; });
    var setOn = function (id) {
      chips.forEach(function (c) {
        var on = c === byId[id]; c.classList.toggle('on', on);
        if (on) { c.setAttribute('aria-current', 'true'); } else { c.removeAttribute('aria-current'); }
      });
      var c = byId[id];
      if (c) {
        var left = c.offsetLeft - (chipsIn.clientWidth - c.offsetWidth) / 2;
        chipsIn.scrollTo({ left: Math.max(0, left), behavior: reduce ? 'auto' : 'smooth' });
      }
    };
    var cats = $$('.cat');
    if ('IntersectionObserver' in window) {
      var seen = {};
      var cio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { seen[e.target.id] = e.isIntersecting; });
        var any = false;
        for (var i = 0; i < cats.length; i++) { if (seen[cats[i].id]) { setOn(cats[i].id); any = true; break; } }
        if (!any && cats[0].getBoundingClientRect().top > 0) setOn(cats[0].id);
      }, { rootMargin: '-140px 0px -62% 0px' });
      cats.forEach(function (c) { cio.observe(c); });
    }
    chips.forEach(function (c) { c.addEventListener('click', function () { setOn(c.getAttribute('href').slice(1)); }); });
    setOn(cats[0].id);
  }
})();
