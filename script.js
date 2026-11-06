
(function(){
  'use strict';
  try { document.documentElement.lang = 'pt-br'; } catch(e){}
  var $ = function(s, r){ return (r || document).querySelector(s); };
  var $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var store = {
    get: function(k){ try { return localStorage.getItem(k); } catch(e){ return null; } },
    set: function(k, v){ try { localStorage.setItem(k, v); } catch(e){} }
  };
  var NS = 'ecg-guia-';

  /* ---------- Modelo de um batimento (soma de gaussianas, em mV) ---------- */
  var WAVES = [[0.15,0.10,0.022],[-0.10,0.205,0.007],[1.25,0.225,0.009],[-0.28,0.245,0.009],[0.30,0.45,0.042]];
  function mv(t){
    var s = 0;
    for (var i = 0; i < WAVES.length; i++){ var a = WAVES[i][0], m = WAVES[i][1], sd = WAVES[i][2], d = t - m; s += a * Math.exp(-(d*d)/(2*sd*sd)); }
    return s;
  }
  function tracePath(o){
    var step = o.step || 0.25, d = '', i = 0;
    for (var x = o.x0; x <= o.x1 + 1e-6; x += step){
      var t = (x - o.x0) / o.ups + (o.t0 || 0);
      if (o.rr) t = t % o.rr;
      var y = o.base - mv(t) * o.upm;
      d += (i++ ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2);
    }
    return d;
  }

  /* ---------- Faixa do cabeçalho ---------- */
  var strip = $('#strip'), SH = 120, BASE = 78, UPM = 36, UPS = 100, RR = 0.8, X0 = 36, SW = 600;
  function yAt(x){ if (x < X0) return (x >= 8 && x <= 28) ? 42 : BASE; var t = ((x - X0) / UPS) % RR; return BASE - mv(t) * UPM; }
  function drawStrip(){
    var r = strip.getBoundingClientRect();
    if (r.width && r.height) SW = Math.max(300, Math.round(SH * r.width / r.height));
    strip.setAttribute('viewBox', '0 0 ' + SW + ' ' + SH);
    $('#strip-bg').setAttribute('width', SW);
    $('#strip-trace').setAttribute('d', tracePath({x0:X0, x1:SW, ups:UPS, upm:UPM, base:BASE, rr:RR, step:0.5}));
  }
  drawStrip();
  var rz = 0;
  window.addEventListener('resize', function(){ cancelAnimationFrame(rz); rz = requestAnimationFrame(drawStrip); });

  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var gap = $('#strip-gap'), dot = $('#strip-dot'), sx = 0, last = 0, visible = true;
  if ('IntersectionObserver' in window){
    new IntersectionObserver(function(es){ visible = es[0].isIntersecting; }).observe(strip);
  }
  function tick(ts){
    if (!last) last = ts;
    var dt = Math.min(0.05, (ts - last) / 1000); last = ts;
    if (visible && !reduce.matches){
      sx += dt * 120;
      if (sx > SW) sx = 0;
      gap.setAttribute('x', (sx + 3).toFixed(1));
      dot.setAttribute('cx', sx.toFixed(1));
      dot.setAttribute('cy', yAt(sx).toFixed(1));
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  /* ---------- Batimento explicado ---------- */
  (function(){
    var ups = 150, upm = 46, base = 82, x0 = 6;
    var d = tracePath({x0:x0, x1:294, ups:ups, upm:upm, base:base, rr:0.8, t0:0.35});
    $('#beat-user').innerHTML =
      '<svg viewBox="0 0 300 120" role="img" aria-label="Desenho do eletrocardiograma, com batidas regulares do coração">' +
      '<rect width="300" height="120" fill="url(#grid-a)"/>' +
      '<path class="trace" d="' + d + '"/>' +
      '</svg>';
  })();

  (function(){
    var ups = 250, upm = 100, base = 140, x0 = 15;
    var d = tracePath({x0:x0, x1:x0 + 0.8*ups, ups:ups, upm:upm, base:base});
    var X = function(t){ return x0 + t*ups; };
    var pOn = X(0.045), qOn = X(0.1875), sOff = X(0.2675), tEnd = X(0.555);
    function br(a, b, y, up){ var k = up ? -4 : 4; return '<path class="brk" d="M' + a.toFixed(1) + ' ' + (y + k) + 'V' + y + 'H' + b.toFixed(1) + 'V' + (y + k) + '"/>'; }
    $('#beat-pro').innerHTML =
      '<svg viewBox="0 0 240 220" role="img" aria-label="Batimento sobre papel milimetrado com os intervalos PR de cerca de 140 ms, QRS de 80 ms e QT de 370 ms">' +
      '<rect width="240" height="220" fill="url(#grid-mm)"/>' +
      '<path class="trace" d="' + d + '"/>' +
      br(pOn, qOn, 98, false) +
      '<text class="ann" x="' + ((pOn + qOn)/2).toFixed(1) + '" y="91" text-anchor="middle">PR 140 ms</text>' +
      br(qOn, sOff, 180, true) +
      '<text class="ann" x="' + ((qOn + sOff)/2).toFixed(1) + '" y="194" text-anchor="middle">QRS 80 ms</text>' +
      br(qOn, tEnd, 206, true) +
      '<text class="ann" x="' + (tEnd + 4).toFixed(1) + '" y="209">QT 370 ms</text>' +
      '</svg>';
  })();

  /* ---------- Eletrodos ---------- */
  var EL = [
    {id:'RA', name:'Braço direito (RA)', lbl:'RA', c:'#D7262B', tc:'#FFFFFF', iec:'vermelho', aha:'branco', ahaC:'#FFFFFF', x:52, y:318,
      where:'Punho ou antebraço direito, na face interna, em pele sem osso saliente.',
      tip:'Mantenha os eletrodos dos membros nos membros. No tronco, o traçado muda; se precisar adaptar, anote no ECG.'},
    {id:'LA', name:'Braço esquerdo (LA)', lbl:'LA', c:'#F2C200', tc:'#152027', iec:'amarelo', aha:'preto', ahaC:'#1E1E1E', x:308, y:318,
      where:'Punho ou antebraço esquerdo, na face interna.',
      tip:'Trocar os eletrodos dos braços deixa D1 negativo e aVR positivo.'},
    {id:'RL', name:'Perna direita (RL), neutro', lbl:'RL', c:'#1E1E1E', tc:'#FFFFFF', iec:'preto', aha:'verde', ahaC:'#2E8B3E', x:140, y:436,
      where:'Tornozelo ou perna direita, na face interna. É o eletrodo de referência.',
      tip:'Se um eletrodo de perna for trocado com um de braço, D2 ou D3 fica quase reto.'},
    {id:'LL', name:'Perna esquerda (LL)', lbl:'LL', c:'#2E8B3E', tc:'#FFFFFF', iec:'verde', aha:'vermelho', ahaC:'#D7262B', x:220, y:436,
      where:'Tornozelo ou perna esquerda, na face interna.',
      tip:'A troca entre braço esquerdo e perna esquerda é a mais difícil de perceber: P invertida em D3.'},
    {id:'V1', name:'V1 (C1)', lbl:'V1', c:'#D7262B', tc:'#FFFFFF', iec:'vermelho', aha:'vermelho', ahaC:'#D7262B', x:168, y:160,
      where:'4º espaço intercostal, na borda direita do esterno.',
      tip:'Ache o ângulo de Louis, a saliência entre o manúbrio e o corpo do esterno. Ao lado dele fica o 2º espaço intercostal; desça dois espaços até o 4º.'},
    {id:'V2', name:'V2 (C2)', lbl:'V2', c:'#F2C200', tc:'#152027', iec:'amarelo', aha:'amarelo', ahaC:'#F2C200', x:192, y:160,
      where:'4º espaço intercostal, na borda esquerda do esterno.',
      tip:'V1 e V2 colocados alto demais podem simular atraso de condução e sobrecarga atrial esquerda.'},
    {id:'V3', name:'V3 (C3)', lbl:'V3', c:'#2E8B3E', tc:'#FFFFFF', iec:'verde', aha:'verde', ahaC:'#2E8B3E', x:212, y:174,
      where:'No ponto médio entre V2 e V4.',
      tip:'Posicione V4 antes de V3.'},
    {id:'V4', name:'V4 (C4)', lbl:'V4', c:'#7A4A26', tc:'#FFFFFF', iec:'marrom', aha:'azul', ahaC:'#2457B8', x:232, y:188,
      where:'5º espaço intercostal esquerdo, na linha hemiclavicular.',
      tip:'Em mamas volumosas, coloque V4 a V6 abaixo da mama, não sobre o tecido mamário.'},
    {id:'V5', name:'V5 (C5)', lbl:'V5', c:'#1E1E1E', tc:'#FFFFFF', iec:'preto', aha:'laranja', ahaC:'#E07B12', x:253, y:188,
      where:'Linha axilar anterior esquerda, no mesmo plano horizontal de V4.',
      tip:'Use o plano horizontal de V4. Não siga o espaço intercostal para cima.'},
    {id:'V6', name:'V6 (C6)', lbl:'V6', c:'#7B3FA0', tc:'#FFFFFF', iec:'violeta', aha:'roxo', ahaC:'#7B3FA0', x:273, y:188,
      where:'Linha axilar média esquerda, no mesmo plano horizontal de V4 e V5.',
      tip:'Peça para o paciente afastar um pouco o braço para achar a linha axilar média.'}
  ];

  function bodySVG(pro){
    var s = '<svg viewBox="0 0 360 470" role="img" aria-label="Figura do corpo de frente com a posição dos 10 eletrodos: seis no peito e quatro nos punhos e tornozelos">';
    var limbs = ['M84 114Q62 200 52 312','M276 114Q298 200 308 312','M140 336L140 432','M220 336L220 432'];
    limbs.forEach(function(p){ s += '<path class="limb-o" d="' + p + '"/>'; });
    limbs.forEach(function(p){ s += '<path class="limb-f" d="' + p + '"/>'; });
    s += '<rect class="part" x="168" y="68" width="24" height="30" rx="6"/>';
    s += '<circle class="part" cx="180" cy="46" r="26"/>';
    s += '<path class="part" d="M92 100Q180 84 268 100L282 112Q286 130 280 160L266 335Q180 352 94 335L80 160Q74 130 78 112Z"/>';
    s += '<rect class="sternum" x="172" y="102" width="16" height="104" rx="6"/>';
    if (pro){
      s += '<line class="ics" x1="88" y1="160" x2="279" y2="160"/><line class="ics" x1="90" y1="188" x2="278" y2="188"/>';
      s += '<text class="ics-t" x="94" y="155">4º EIC</text><text class="ics-t" x="94" y="183">5º EIC</text>';
    }
    s += '<text class="side-t" x="52" y="352" text-anchor="middle">Direito</text><text class="side-t" x="308" y="352" text-anchor="middle">Esquerdo</text>';
    EL.forEach(function(e){
      var r = pro ? 11 : 9;
      s += '<g class="el' + (pro ? ' tap' : '') + '" data-id="' + e.id + '" transform="translate(' + e.x + ' ' + e.y + ')"' +
        (pro ? ' tabindex="0" role="button" aria-label="' + e.name + '"' : '') + '>' +
        '<circle class="ring" r="16"/>' +
        '<circle r="' + r + '" fill="' + e.c + '" stroke="#FFFFFF" stroke-width="2"/>' +
        (pro ? '<text class="el-t" fill="' + e.tc + '" y="3" text-anchor="middle">' + e.lbl + '</text>' : '') +
        '</g>';
    });
    return s + '</svg>';
  }
  $('#body-user').innerHTML = bodySVG(false);
  $('#body-pro').innerHTML = bodySVG(true);

  var info = $('#el-info');
  function selectEl(id){
    var e = EL.filter(function(x){ return x.id === id; })[0]; if (!e) return;
    $$('#body-pro .el').forEach(function(g){ var on = g.getAttribute('data-id') === id; g.classList.toggle('on', on); g.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    info.innerHTML =
      '<p class="eyebrow">Eletrodo selecionado</p>' +
      '<p class="name">' + e.name + '</p>' +
      '<p>' + e.where + '</p>' +
      '<div class="swatches"><span class="sw"><i style="background:' + e.c + '"></i>IEC: ' + e.iec + '</span><span class="sw"><i style="background:' + e.ahaC + '"></i>AHA: ' + e.aha + '</span></div>' +
      '<p class="note"><strong>Dica:</strong> ' + e.tip + '</p>';
  }
  $$('#body-pro .el').forEach(function(g){
    var id = g.getAttribute('data-id');
    g.addEventListener('click', function(){ selectEl(id); });
    g.addEventListener('keydown', function(ev){ if (ev.key === 'Enter' || ev.key === ' '){ ev.preventDefault(); selectEl(id); } });
  });
  selectEl('V1');
  $('#el-table').innerHTML = EL.map(function(e){
    return '<tr><td><strong>' + e.name + '</strong></td><td>' + e.where + '</td><td>' + e.iec + '</td><td>' + e.aha + '</td></tr>';
  }).join('');

  /* ---------- Checklists ---------- */
  $$('.check').forEach(function(list){
    var key = NS + 'check-' + list.getAttribute('data-key');
    var boxes = $$('input[type="checkbox"]', list);
    var sec = list.parentNode, count = $('.count', sec), reset = $('.reset', sec);
    var saved = (store.get(key) || '').split(',');
    boxes.forEach(function(b){ if (saved.indexOf(b.id) > -1) b.checked = true; });
    function upd(){
      var on = boxes.filter(function(b){ return b.checked; });
      count.textContent = on.length + ' de ' + boxes.length + ' itens marcados';
      store.set(key, on.map(function(b){ return b.id; }).join(','));
    }
    boxes.forEach(function(b){ b.addEventListener('change', upd); });
    reset.addEventListener('click', function(){ boxes.forEach(function(b){ b.checked = false; }); upd(); });
    upd();
  });

  /* ---------- Calculadoras ---------- */
  function num(v){ var n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : NaN; }
  function calcFC(){
    var n = num($('#fc-n').value), k = +$('#fc-tipo').value, out = $('#fc-out'), cl = $('#fc-class');
    if (!(n > 0)){ out.textContent = '—'; cl.innerHTML = '<span class="pill warn">Digite um número maior que zero</span>'; return; }
    var bpm = Math.round(k / n);
    out.textContent = bpm + ' bpm';
    cl.innerHTML = bpm < 50 ? '<span class="pill warn">Abaixo de 50 bpm: bradicardia</span>'
      : bpm >= 100 ? '<span class="pill warn">100 bpm ou mais: taquicardia</span>'
      : '<span class="pill ok">Faixa normal (50–99 bpm)</span>';
  }
  function calcQTc(){
    var qt = num($('#qt-ms').value), fc = num($('#qt-fc').value), sexo = $('#qt-sexo').value;
    var out = $('#qtc-out'), pill = $('#qtc-pill'), tb = $('#qtc-table');
    if (!(qt > 0) || !(fc > 0)){ out.textContent = '—'; pill.className = 'pill warn'; pill.textContent = 'Preencha QT e FC com números maiores que zero'; tb.innerHTML = ''; return; }
    var rr = 60 / fc;
    var f = {
      'Bazett': qt / Math.sqrt(rr),
      'Fridericia': qt / Math.cbrt(rr),
      'Framingham': qt + 154 * (1 - rr),
      'Hodges': qt + 1.75 * (fc - 60)
    };
    var useLinear = fc < 60 || fc > 90, ref = useLinear ? 'Framingham' : 'Bazett', val = Math.round(f[ref]);
    var lim = sexo === 'F' ? 470 : 450;
    out.textContent = 'QTc ' + val + ' ms';
    if (val >= 500){ pill.className = 'pill bad'; pill.textContent = 'Muito prolongado (≥ 500 ms)'; }
    else if (val > lim){ pill.className = 'pill warn'; pill.textContent = 'Prolongado (acima de ' + lim + ' ms)'; }
    else { pill.className = 'pill ok'; pill.textContent = 'Dentro do limite (até ' + lim + ' ms)'; }
    tb.innerHTML = Object.keys(f).map(function(k){
      return '<tr' + (k === ref ? ' class="use"' : '') + '><td>' + k + (k === ref ? ' (usada)' : '') + '</td><td>' + Math.round(f[k]) + ' ms</td></tr>';
    }).join('');
  }
  ['#fc-n','#fc-tipo'].forEach(function(s){ $(s).addEventListener('input', calcFC); $(s).addEventListener('change', calcFC); });
  ['#qt-ms','#qt-fc','#qt-sexo'].forEach(function(s){ $(s).addEventListener('input', calcQTc); $(s).addEventListener('change', calcQTc); });
  calcFC(); calcQTc();

  /* ---------- Quiz ---------- */
  var QU = [
    {q:'O eletrocardiograma dói?', o:['Sim, dói um pouco.','Não, não dói.'], a:1,
      e:'O exame não dói e não dá choque.'},
    {q:'Precisa ficar sem comer antes do exame?', o:['Sim.','Não.'], a:1,
      e:'Pode comer normalmente.'},
    {q:'Na hora do exame, você deve:', o:['Ficar parado e quieto.','Conversar e se mexer.'], a:0,
      e:'Assim o desenho do coração sai certinho.'},
    {q:'Dor forte no peito que não passa. O que fazer?', o:['Esperar passar.','Ligar 192 ou ir ao pronto-socorro.'], a:1,
      e:'Não espere. Peça ajuda na hora.'},
    {q:'Chegou no celular um chá que “cura o coração”. O que fazer?', o:['Desconfiar e perguntar a um profissional de saúde.','Tomar e mandar para os amigos.'], a:0,
      e:'Promessa de cura milagrosa é sinal de informação falsa.'}
  ];
  var QP = [
    {q:'P, QRS e T negativos em D1, aVR positivo e precordiais com progressão normal de R. Primeira hipótese?', o:['Dextrocardia.','Troca dos eletrodos dos braços.','Infarto de parede lateral.'], a:1,
      e:'Na dextrocardia, D1 também fica negativo, mas a onda R diminui de V1 para V6. Com precordiais normais, pense em troca de eletrodos e repita o exame. [1]'},
    {q:'Mulher, QT medido de 440 ms, FC de 75 bpm. O QTc por Bazett é:', o:['Cerca de 440 ms, normal.','Cerca de 400 ms, normal.','Cerca de 492 ms, prolongado.'], a:2,
      e:'RR = 0,8 s; √0,8 ≈ 0,894; 440 ÷ 0,894 ≈ 492 ms, acima de 470 ms. Teste na calculadora acima. [1]'},
    {q:'Paciente com dor torácica na triagem. Prazo para registrar e mostrar o ECG ao médico:', o:['Até 10 minutos.','Até 30 minutos.','Até 60 minutos.'], a:0,
      e:'A meta é ECG interpretado em até 10 minutos do primeiro contato. [5]'},
    {q:'Mulher de 52 anos, supradesnível novo de ST de 1,5 mm no ponto J em V2 e V3, sem bloqueio de ramo. Pela 4ª Definição Universal:', o:['Não atinge o critério; precisa de 2 mm.','Atinge o critério para mulheres.','Só vale se estiver também em D2.'], a:1,
      e:'Em V2–V3, o corte é ≥ 1,5 mm em mulheres de qualquer idade; ≥ 2 mm em homens com 40 anos ou mais; ≥ 2,5 mm em homens com menos de 40. [4]'},
    {q:'Gel aplicado em faixa contínua sobre o precórdio produz:', o:['V1 a V6 quase iguais.','Baixa voltagem só em V1.','Nenhum efeito no traçado.'], a:0,
      e:'É o efeito “grande eletrodo”: o aparelho registra a média dos potenciais. [1]'}
  ];
  function buildQuiz(root, items, words){
    words = words || {ok:'Certo.', no:'Não é bem assim.'};
    root.innerHTML = '';
    var answered = 0, right = 0;
    var row = document.createElement('div'); row.className = 'score-row';
    var score = document.createElement('span'); score.setAttribute('aria-live', 'polite');
    var again = document.createElement('button'); again.type = 'button'; again.className = 'textbtn'; again.textContent = 'Recomeçar';
    again.addEventListener('click', function(){ buildQuiz(root, items, words); });
    function upd(){ score.textContent = answered < items.length ? (answered + ' de ' + items.length + ' respondidas · ' + right + ' certas') : ('Você acertou ' + right + ' de ' + items.length + '.'); }
    items.forEach(function(it, qi){
      var box = document.createElement('div'); box.className = 'q'; box.setAttribute('role', 'group');
      var qid = root.id + '-q' + qi; box.setAttribute('aria-labelledby', qid);
      var qt = document.createElement('p'); qt.className = 'qt'; qt.id = qid; qt.textContent = (qi + 1) + '. ' + it.q;
      var opts = document.createElement('div'); opts.className = 'opts';
      var fb = document.createElement('p'); fb.className = 'fb'; fb.hidden = true; fb.setAttribute('aria-live', 'polite');
      it.o.forEach(function(txt, oi){
        var b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.textContent = txt;
        b.addEventListener('click', function(){
          if (box.getAttribute('data-done')) return;
          box.setAttribute('data-done', '1'); answered++;
          var ok = oi === it.a; if (ok) right++;
          Array.prototype.forEach.call(opts.children, function(x, xi){ x.disabled = true; if (xi === it.a) x.classList.add('right'); else if (xi === oi) x.classList.add('wrong'); });
          fb.innerHTML = (ok ? '<strong class="ok-t">' + words.ok + '</strong> ' : '<strong class="bad-t">' + words.no + '</strong> ') + it.e;
          fb.hidden = false; upd();
        });
        opts.appendChild(b);
      });
      box.appendChild(qt); box.appendChild(opts); box.appendChild(fb);
      root.appendChild(box);
    });
    row.appendChild(score); row.appendChild(again); root.appendChild(row);
    upd();
  }
  buildQuiz($('#quiz-usuarios'), QU, {ok:'Isso mesmo!', no:'Quase!'});
  buildQuiz($('#quiz-profissionais'), QP);

  /* ---------- Leitura em voz alta ---------- */
  var synth = ('speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') ? window.speechSynthesis : null;
  var speaking = null;
  function stopSpeech(){
    if (synth) { try { synth.cancel(); } catch(e){} }
    if (speaking){ speaking.setAttribute('aria-pressed', 'false'); $('.lt', speaking).textContent = 'Ouvir'; speaking = null; }
  }
  function readable(sec){
    var c = sec.cloneNode(true);
    $$('button, svg, .no-say, .facts', c).forEach(function(n){ n.parentNode && n.parentNode.removeChild(n); });
    $$('h2, h3, li, p, dt, dd, summary, figcaption', c).forEach(function(n){ n.appendChild(document.createTextNode('. ')); });
    return c.textContent.replace(/\s+/g, ' ').replace(/([.:;!?])\s*\.(\s|$)/g, '$1 ').replace(/\s+/g, ' ').trim();
  }
  if (!synth){
    $$('.listen').forEach(function(b){ b.hidden = true; });
  } else {
    $$('.listen').forEach(function(btn){
      btn.addEventListener('click', function(){
        if (speaking === btn){ stopSpeech(); return; }
        stopSpeech();
        var sec = document.getElementById(btn.getAttribute('data-for'));
        var u = new SpeechSynthesisUtterance(readable(sec));
        u.lang = 'pt-BR'; u.rate = 0.95;
        try {
          var vs = synth.getVoices() || [];
          var v = vs.filter(function(x){ return /pt[-_]BR/i.test(x.lang); })[0] || vs.filter(function(x){ return /^pt/i.test(x.lang); })[0];
          if (v) u.voice = v;
        } catch(e){}
        u.onend = u.onerror = function(){ if (speaking === btn) stopSpeech(); };
        speaking = btn; btn.setAttribute('aria-pressed', 'true'); $('.lt', btn).textContent = 'Parar';
        try { synth.speak(u); } catch(e){ stopSpeech(); }
      });
    });
  }

  /* ---------- Abas (versões) com endereço #usuarios / #profissionais ---------- */
  var VIEWS = ['usuarios', 'profissionais'];
  var bar = $('.bar');
  function show(name, scroll){
    VIEWS.forEach(function(v){
      var on = v === name, tab = $('#tab-' + v);
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
      $('#painel-' + v).hidden = !on;
    });
    stopSpeech();
    if (scroll){
      var top = bar.getBoundingClientRect().top + window.pageYOffset;
      if (window.pageYOffset > top) window.scrollTo(0, top);
    }
  }
  function go(name){
    if (location.hash.slice(1) !== name){ try { location.hash = name; } catch(e){} }
    show(name, true);
  }
  $$('[role="tab"]').forEach(function(tab, i, all){
    tab.addEventListener('click', function(){ go(tab.getAttribute('data-view')); });
    tab.addEventListener('keydown', function(ev){
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft'){
        ev.preventDefault();
        var n = all[(i + (ev.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length];
        n.focus(); go(n.getAttribute('data-view'));
      }
    });
  });
  window.addEventListener('hashchange', function(){ var h = location.hash.slice(1); if (VIEWS.indexOf(h) > -1) show(h, true); });
  var h0 = location.hash.slice(1);
  show(VIEWS.indexOf(h0) > -1 ? h0 : 'usuarios', false);

  /* ---------- Temas que abrem e fecham ---------- */
  $$('details.acc').forEach(function(d){
    var byUser = false;
    $('summary', d).addEventListener('click', function(){ byUser = true; });
    d.addEventListener('toggle', function(){
      if (!d.open){ if (speaking && d.contains(speaking)) stopSpeech(); return; }
      if (!byUser) return;
      byUser = false;
      var g = d.getAttribute('data-group');
      $$('details.acc[data-group="' + g + '"]').forEach(function(o){ if (o !== d && o.open) o.open = false; });
      requestAnimationFrame(function(){
        var top = d.getBoundingClientRect().top, barH = bar.getBoundingClientRect().height;
        if (top < barH || top > window.innerHeight * 0.55){
          try { d.scrollIntoView({block:'start', behavior: reduce.matches ? 'auto' : 'smooth'}); } catch(e){ d.scrollIntoView(true); }
        }
      });
    });
  });

  /* ---------- Tamanho do texto ---------- */
  var SCALES = [0.9, 1, 1.12, 1.25, 1.4];
  var si = parseInt(store.get(NS + 'escala'), 10); if (!(si >= 0 && si < SCALES.length)) si = 1;
  function applyScale(){
    document.documentElement.style.setProperty('--scale', SCALES[si]);
    $('#font-dec').disabled = si === 0; $('#font-inc').disabled = si === SCALES.length - 1;
    store.set(NS + 'escala', String(si));
    drawStrip();
  }
  $('#font-dec').addEventListener('click', function(){ if (si > 0){ si--; applyScale(); } });
  $('#font-inc').addEventListener('click', function(){ if (si < SCALES.length - 1){ si++; applyScale(); } });
  applyScale();
})();