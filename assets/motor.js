/* =====================================================================
   PPGA Interativo · motor compartilhado das apresentações (JS)
   Carregue antes do script da página:  <script src="../../assets/motor.js"></script>
   A página monta seus componentes com Motor.box, Motor.makeStage etc.
   e termina com Motor.init(), que liga escala responsiva, navegação,
   animação e o botão do texto completo (lido do meta.json).
   ===================================================================== */
(function(){
  "use strict";
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var $ = function(id){ return document.getElementById(id); };
  var each = function(list, fn){ Array.prototype.forEach.call(list, fn); };
  /* Idioma da página (<html lang>): 'en' nas cópias em /en/, 'pt' no resto. Decide o separador decimal. */
  var lang = /^en/i.test(document.documentElement.lang) ? 'en' : 'pt';
  var fmt = function(n, d){ var s = n.toFixed(d === undefined ? 1 : d); return lang === 'en' ? s : s.replace('.', ','); };

  /* ---------- Caixas 3D ----------
     box({w, d, h, x, y, z, c, label, top, cls}): caixa com 5 faces.
     --c é a cor; label vai na face frontal, top na face de cima. */
  function box(o){
    var s = document.createElement('div');
    s.className = 'slab' + (o.cls ? ' ' + o.cls : '');
    s.style.width = o.w + 'px'; s.style.height = o.d + 'px';
    s.style.left = (o.x || 0) + 'px'; s.style.top = (o.y || 0) + 'px';
    s.style.setProperty('--z', (o.z || 0) + 'px');
    s.style.setProperty('--h', o.h + 'px');
    s.style.setProperty('--c', o.c);
    s.innerHTML = '<i class="f-back"></i><i class="f-right"></i><i class="f-left"></i><i class="f-front">' + (o.label ? '<span class="face-label">' + o.label + '</span>' : '') + '</i><i class="f-top">' + (o.top ? '<span class="top-label">' + o.top + '</span>' : '') + '</i>';
    return s;
  }

  /* makeStage(scene, w, d, {ay, rx, floor}): o "chão" inclinado; dentro dele, +Z é para cima. */
  function makeStage(scene, w, d, opts){
    opts = opts || {};
    var st = document.createElement('div');
    st.className = 'stage';
    st.style.width = w + 'px'; st.style.height = d + 'px';
    if (opts.ay) st.style.setProperty('--ay', opts.ay);
    if (opts.rx) st.style.setProperty('--rx', opts.rx);
    if (opts.floor !== false){ var f = document.createElement('div'); f.className = 'floor'; st.appendChild(f); }
    scene.appendChild(st);
    return st;
  }

  /* ramp(base, i, n): tons da mesma cor, do mais forte (i = 0) ao mais claro. */
  function ramp(base, i, n){
    var pct = Math.round(100 - (i / Math.max(1, n - 1)) * 48);
    return 'color-mix(in srgb, ' + base + ' ' + pct + '%, white)';
  }

  /* flatLabel(stage, texto, x, y, largura, cssExtra): rótulo deitado no chão do palco. */
  function flatLabel(st, text, x, y, w, extra){
    var l = document.createElement('div');
    l.className = 'floor-label';
    l.style.left = x + 'px'; l.style.top = y + 'px'; l.style.width = w + 'px';
    if (extra) l.style.cssText += extra;
    l.textContent = text;
    st.appendChild(l);
    return l;
  }

  /* ---------- Rotação ----------
     rotatable(scene, stage, ânguloBase, amplitude): oscila enquanto visível; arrastar gira.
     Não usa setPointerCapture, para o clique continuar caindo na face clicada. */
  var rotators = [];
  function rotatable(scene, stage, base, amp){
    var r = {scene:scene, stage:stage, base:base, amp:amp || 12, rz:base, auto:!reduce, visible:false, moved:false};
    rotators.push(r);
    stage.style.setProperty('--rz', base + 'deg');
    var drag = null;
    scene.addEventListener('pointerdown', function(e){ drag = {x:e.clientX, rz:r.rz}; r.moved = false; });
    window.addEventListener('pointermove', function(e){
      if (!drag) return;
      var dx = e.clientX - drag.x;
      if (Math.abs(dx) > 4){ r.moved = true; r.auto = false; }
      if (r.moved){ r.rz = drag.rz + dx * 0.5; stage.style.setProperty('--rz', r.rz + 'deg'); }
    });
    window.addEventListener('pointerup', function(){ drag = null; setTimeout(function(){ r.moved = false; }, 0); });
    window.addEventListener('pointercancel', function(){ drag = null; r.moved = false; });
    new IntersectionObserver(function(es){ es.forEach(function(en){ r.visible = en.isIntersecting; }); }).observe(scene);
    return r;
  }
  /* wasDrag(scene): true se o último gesto na cena foi um arrasto (para ignorar o clique). */
  function wasDrag(scene){
    var r = rotators.filter(function(x){ return x.scene === scene; })[0];
    return !!(r && r.moved);
  }

  /* hover(el, entrar, sair): realce ao passar o mouse/trackpad; no toque, tocar chama entrar.
     Não use mouseenter: no iPad, mouseenter que muda a tela faz o Safari engolir o toque
     (o clique do botão não acontece). */
  function hover(el, enter, leave){
    var touch = false;
    el.addEventListener('pointerdown', function(e){ touch = e.pointerType !== 'mouse'; });
    if (enter){
      el.addEventListener('pointerenter', function(e){ if (e.pointerType === 'mouse') enter(e); });
      el.addEventListener('click', function(e){ if (touch) enter(e); });
    }
    if (leave) el.addEventListener('pointerleave', function(e){ if (e.pointerType === 'mouse') leave(e); });
  }

  /* ---------- Contagem (GoatCounter) ----------
     track(nome): registra um evento ligado à página atual, ex.: ".../#tela-07" ou ".../#texto-completo".
     Se o GoatCounter não carregou (bloqueador, rede, localhost), não faz nada. */
  function track(name, title){
    try {
      if (window.goatcounter && window.goatcounter.count)
        window.goatcounter.count({path:location.pathname + '#' + name, title:title || name, event:true});
    } catch(e){}
  }

  /* onTick(fn): fn(t) a cada quadro, com t em segundos (ex.: moeda que oscila). */
  var tickers = [], t0 = performance.now();
  function onTick(fn){ tickers.push(fn); }
  function tick(now){
    var t = (now - t0) / 1000;
    rotators.forEach(function(r){
      if (r.auto && r.visible){ r.rz = r.base + Math.sin(t * 0.5) * r.amp; r.stage.style.setProperty('--rz', r.rz + 'deg'); }
    });
    tickers.forEach(function(fn){ fn(t); });
    requestAnimationFrame(tick);
  }

  /* ---------- Escala responsiva ----------
     data-fit="LxA" no elemento da cena: escala para caber na largura disponível. */
  function fit(){
    document.querySelectorAll('[data-fit]').forEach(function(el){
      var wh = el.dataset.fit.split('x').map(Number), w = wh[0], h = wh[1];
      var parent = el.parentElement, avail = parent.clientWidth;
      var s = Math.min(1, avail / w);
      el.style.width = w + 'px'; el.style.height = h + 'px';
      el.style.transformOrigin = 'top left';
      el.style.transform = 'scale(' + s + ')';
      el.style.marginLeft = Math.max(0, (avail - w * s) / 2) + 'px';
      parent.style.height = (h * s) + 'px';
    });
  }

  /* ---------- Navegação ----------
     Espera na página: #count, #prev, #next, #progress, #dots e <section class="slide" data-label>. */
  function navigation(){
    var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
    var dots = $('dots'), cur = 0, total = slides.length;
    slides.forEach(function(s, i){
      var b = document.createElement('button');
      b.dataset.label = s.dataset.label; b.setAttribute('aria-label', s.dataset.label);
      b.addEventListener('click', function(){ go(i); });
      dots.appendChild(b);
    });
    /* scrollTo com a posição calculada: no Safari do iPad, scrollIntoView com snap às vezes não sai do lugar. */
    function go(i){
      i = Math.max(0, Math.min(total - 1, i));
      var top = slides[i].getBoundingClientRect().top + window.scrollY;
      window.scrollTo({top: top, behavior: reduce ? 'auto' : 'smooth'});
    }
    /* conta cada tela (a partir da 2ª) uma vez por visita, se o leitor ficar nela 1,5 s */
    var seen = {};
    function mark(i){
      cur = i;
      if (i > 0 && !seen[i]) setTimeout(function(){
        if (cur === i && !seen[i]){ seen[i] = true; track('tela-' + String(i + 1).padStart(2, '0'), 'Tela ' + (i + 1) + ' de ' + total); }
      }, 1500);
      $('count').textContent = String(i + 1).padStart(2, '0') + ' / ' + total;
      each(dots.children, function(d, j){ d.classList.toggle('on', i === j); });
    }
    var midObs = new IntersectionObserver(function(es){
      es.forEach(function(en){ if (en.isIntersecting) mark(slides.indexOf(en.target)); });
    }, {rootMargin:'-45% 0px -45% 0px'});
    slides.forEach(function(s){ midObs.observe(s); });
    var inObs = new IntersectionObserver(function(es){
      es.forEach(function(en){ if (en.isIntersecting) en.target.classList.add('in'); });
    }, {threshold:0.18});
    slides.forEach(function(s){ inObs.observe(s); });

    $('prev').addEventListener('click', function(){ go(cur - 1); });
    $('next').addEventListener('click', function(){ go(cur + 1); });
    document.addEventListener('keydown', function(e){
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'button' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' '){ e.preventDefault(); go(cur + 1); }
      else if (e.key === 'ArrowUp' || e.key === 'PageUp'){ e.preventDefault(); go(cur - 1); }
      else if (e.key === 'Home'){ e.preventDefault(); go(0); }
      else if (e.key === 'End'){ e.preventDefault(); go(total - 1); }
    });
    var bar = $('progress');
    function prog(){
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
    }
    window.addEventListener('scroll', prog, {passive:true});
    prog(); mark(0);
  }

  /* Botão do texto completo (#full-text): aparece se o meta.json tiver pdf ou link.
     A versão em inglês aponta para o meta.json da pasta original com <body data-meta="...">. */
  function fullText(){
    var a = $('full-text');
    if (!a || !window.fetch) return;
    var metaUrl = document.body.dataset.meta || 'meta.json';
    fetch(metaUrl).then(function(r){ return r.json(); }).then(function(m){
      var url = m.pdf || m.link;
      /* pdf é relativo à pasta do meta.json (na versão em inglês, a pasta original) */
      if (url){
        a.href = new URL(url, new URL(metaUrl, location.href)).href; a.style.display = '';
        a.addEventListener('click', function(){ track(m.pdf ? 'pdf' : 'link-texto', m.pdf ? 'Abriu o PDF' : 'Abriu o texto completo'); });
      }
    }).catch(function(){});
  }

  function init(){
    fit();
    window.addEventListener('resize', fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    navigation();
    requestAnimationFrame(tick);
    fullText();
  }

  window.Motor = {
    reduce:reduce, lang:lang, $:$, each:each, fmt:fmt,
    box:box, makeStage:makeStage, ramp:ramp, flatLabel:flatLabel,
    rotatable:rotatable, wasDrag:wasDrag, track:track, hover:hover, onTick:onTick, fit:fit, init:init
  };
})();
