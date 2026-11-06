/* Folha do Relatórios EMFAL: layout, geração do PDF e leitura da foto.
   A posição de cada quadrinho sai sempre do mesmo cálculo (componente + ano escolar),
   então a leitura refaz o layout a partir do QR Code e sabe onde procurar.
   Funciona no navegador (window.FolhaREL) e no Node (module.exports) para testes. */
(function (root) {
  'use strict';

  var VERSAO = '1';
  var L = {
    W: 210, H: 297,
    mk: { s: 9, c: [[14, 14], [196, 14], [196, 283], [14, 283]] }, // TL, TR, BR, BL
    qr: { x: 157, y: 19, s: 31 },
    x0: 22, x1: 188, yMax: 279, box: 3.4,
    inicio1: 80, inicioN: 53
  };
  var COLS_H = [148, 162, 176]; // centros das colunas Consolidado / Em consolidação / Não consolidado
  var ESTADOS = ['c', 'e', 'n'];
  var RH = 4.3; // altura de cada linha de opções

  function quebra(t, n) {
    var pal = String(t).split(/\s+/), linhas = [], cur = '';
    pal.forEach(function (p) {
      if (!cur) cur = p;
      else if ((cur + ' ' + p).length <= n) cur += ' ' + p;
      else { linhas.push(cur); cur = p; }
    });
    if (cur) linhas.push(cur);
    return linhas;
  }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  /* Monta o layout. cfg = {SECOES, HAB, AREAS, NIVEIS, areasDoComp(comp, ano), rotuloHab(t)}.
     Devolve {paginas: n, blocos: [...desenho], caixas: [{p, x, y, chave, rot}]}. */
  function layout(cfg, comp, ano) {
    var blocos = [], caixas = [], p = 1, y = L.inicio1;
    function cabe(h) { if (y + h > L.yMax) { p++; y = L.inicioN; } }
    function caixa(x, yy, chave, rot) { caixas.push({ p: p, x: x, y: yy, chave: chave, rot: rot }); blocos.push({ p: p, t: 'box', x: x, y: yy }); }

    // Público da Educação Especial
    var tee = quebra('Estudante com deficiência, transtorno ou outra necessidade específica (público da Educação Especial). Se marcar, preencha também os itens indicados com EE.', 100);
    var hee = tee.length * 3.6 + 3;
    blocos.push({ p: p, t: 'faixa', x: L.x0, y: y - 1.5, w: L.x1 - L.x0, h: hee });
    caixa(L.x0 + 3.5, y + 1.6, { t: 'ee' }, 'Público da Educação Especial');
    tee.forEach(function (l, i) { blocos.push({ p: p, t: 'txt', x: L.x0 + 7, y: y + 2.8 + i * 3.6, s: l, f: 8.3, b: 1 }); });
    y += hee + 3;

    // Habilidades do ano
    var areas = ano ? cfg.areasDoComp(comp, ano) : [];
    if (areas.length) {
      cabe(16);
      blocos.push({ p: p, t: 'tit', x: L.x0, y: y, s: 'HABILIDADES DO ANO (marque uma situação por linha; deixe em branco o que não avaliou)' });
      y += 5.5;
      areas.forEach(function (a) {
        if (a === 'LP' && ano <= 2) {
          var nv = cfg.NIVEIS;
          cabe(11);
          blocos.push({ p: p, t: 'grp', x: L.x0, y: y, s: 'Nível de escrita', d: '(marque uma)' });
          y += 4.4;
          var cw = (L.x1 - L.x0) / 3;
          nv.forEach(function (n, i) {
            var cx = L.x0 + (i % 3) * cw, cy = y + Math.floor(i / 3) * 5;
            caixa(cx + 1.7, cy, { t: 'nv', i: i }, 'Nível de escrita: ' + n);
            blocos.push({ p: p, t: 'txt', x: cx + 4.6, y: cy + 1.1, s: cap(n), f: 8 });
          });
          y += Math.ceil(nv.length / 3) * 5 + 2;
        }
        var itens = cfg.HAB[a][ano] || [];
        cabe(12);
        var cab = function () {
          blocos.push({ p: p, t: 'hcab', x: L.x0, y: y, s: cfg.AREAS[a] + ', ' + ano + 'º ano' });
          y += 5;
        };
        cab();
        itens.forEach(function (t, i) {
          var rot = cfg.rotuloHab(t), ls = quebra(rot, 80), h = Math.max(4.6, ls.length * 3.3 + 1.4);
          if (y + h > L.yMax) { p++; y = L.inicioN; cab(); }
          blocos.push({ p: p, t: 'linha', x: L.x0, y: y - 2.3, w: L.x1 - L.x0, h: h });
          ls.forEach(function (l, k) { blocos.push({ p: p, t: 'txt', x: L.x0 + 1.5, y: y + 0.9 + k * 3.3 - (ls.length - 1) * 1.65 + (h - 4.6) / 2, s: l, f: 7.8 }); });
          var cy = y + (h - 4.6) / 2;
          ESTADOS.forEach(function (st, j) { caixa(COLS_H[j], cy, { t: 'h', a: a, ano: ano, i: i, st: st }, cfg.AREAS[a] + ': ' + rot); });
          y += h;
        });
        y += 3;
      });
    }

    // Seções do app
    cfg.SECOES.forEach(function (s, si) {
      var primeiro = true;
      s.grupos.forEach(function (g) {
        var ops = g.ops.map(function (o, i) { return { r: o[0], v: i }; });
        if (g.nenhum) ops.push({ r: g.nenhum, v: 'n' });
        var maior = Math.max.apply(0, ops.map(function (o) { return o.r.length; }));
        var nc = maior <= 25 ? 4 : maior <= 33 ? 3 : 2, linhas = Math.ceil(ops.length / nc);
        var h = 4 + linhas * RH + 1.6 + (primeiro ? 6.5 : 0);
        cabe(h);
        if (primeiro) { if (y > L.inicioN) y += 1; blocos.push({ p: p, t: 'tit', x: L.x0, y: y, s: (si + 1) + '. ' + s.titulo.toUpperCase() }); y += 5.5; primeiro = false; }
        blocos.push({ p: p, t: 'grp', x: L.x0, y: y, s: g.rot + (g.ee ? ' (EE)' : ''), d: g.tipo === 'um' ? '(marque uma)' : '(marque quantas forem necessárias)' });
        y += 4;
        var cw = (L.x1 - L.x0) / nc;
        ops.forEach(function (o, i) {
          var col = Math.floor(i / linhas), lin = i % linhas, cx = L.x0 + col * cw, cy = y + lin * RH;
          caixa(cx + 1.7, cy, { t: 'g', k: g.k, v: o.v }, g.rot + ': ' + o.r);
          blocos.push({ p: p, t: 'txt', x: cx + 4.3, y: cy + 1.1, s: o.r, f: nc === 4 && maior > 22 ? 7 : 7.6 });
        });
        y += linhas * RH + 1.6;
      });
    });
    // Consideração pessoal: linhas para escrever à mão. O app mostra o recorte da foto para o professor digitar.
    var NL = 6, LH = 7, hc = 11 + NL * LH;
    cabe(hc);
    y += 2;
    blocos.push({ p: p, t: 'tit', x: L.x0, y: y, s: (cfg.SECOES.length + 1) + '. CONSIDERAÇÃO PESSOAL DO PROFESSOR' });
    blocos.push({ p: p, t: 'txt', x: L.x0, y: y + 4.5, s: 'Escreva com suas palavras uma observação sobre o estudante (opcional). Use letra legível: a coordenação vai digitar este texto.', f: 7.6, i: 1 });
    var y0 = y + 7;
    for (var i = 1; i <= NL; i++) blocos.push({ p: p, t: 'risco', x: L.x0, y: y0 + i * LH, w: L.x1 - L.x0 });
    var consid = { p: p, x: L.x0 - 1, y: y0, w: L.x1 - L.x0 + 2, h: NL * LH + 2 };
    y = y0 + NL * LH + 3;
    return { paginas: p, blocos: blocos, caixas: caixas, consid: consid };
  }

  // ===== QR =====
  // o nome vai codificado (com acentos preservados) para o QR ficar só com caracteres simples
  function codNome(t) { return encodeURIComponent(String(t || '').replace(/\s+/g, ' ').trim().slice(0, 32)); }
  function decNome(t) { try { return decodeURIComponent(t || ''); } catch (e) { return ''; } }
  function codigoQR(o) { return ['EMFALREL', VERSAO, o.est, o.ano, o.per, o.comp, o.anoEsc || 0, o.pag, o.tot, codNome(o.prof)].join(';'); }
  function lerCodigo(t) {
    var s = String(t || '').split(';');
    if (s[0] !== 'EMFALREL') return null;
    if (s.length !== 10 || s[1] !== VERSAO) return { erro: 'versao' };
    return { est: s[2], ano: s[3], per: Number(s[4]), comp: Number(s[5]), anoEsc: Number(s[6]) || 0, pag: Number(s[7]), tot: Number(s[8]), prof: decNome(s[9]) };
  }

  // ===== PDF =====
  /* ctx = {cfg, ano, per (índice), perNome, comp (índice), compNome, professor};
     estudantes = [{id, nome, turma, turmaNome, anoEsc}] */
  function gerarPDF(ctx, estudantes, jsPDF, qrcode, header) {
    var doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true }), primeira = true, cache = {};
    estudantes.forEach(function (e) {
      var ck = e.anoEsc || 0, lay = cache[ck] || (cache[ck] = layout(ctx.cfg, ctx.compNome, e.anoEsc));
      var tot = lay.paginas;
      // frente e verso: cada estudante começa numa folha nova
      for (var pg = 1; pg <= tot; pg++) {
        if (!primeira) doc.addPage();
        primeira = false;
        doc.setTextColor(0); doc.setDrawColor(0); doc.setFillColor(0);
        L.mk.c.forEach(function (c) { doc.rect(c[0] - L.mk.s / 2, c[1] - L.mk.s / 2, L.mk.s, L.mk.s, 'F'); });
        var q = qrcode(0, 'L');
        q.addData(codigoQR({ est: e.id, ano: ctx.ano, per: ctx.per, comp: ctx.comp, anoEsc: e.anoEsc, pag: pg, tot: tot, prof: ctx.professor })); q.make();
        var m = q.getModuleCount(), ms = L.qr.s / m;
        for (var r = 0; r < m; r++) for (var c = 0; c < m; c++)
          if (q.isDark(r, c)) doc.rect(L.qr.x + c * ms, L.qr.y + r * ms, ms + 0.02, ms + 0.02, 'F');
        if (pg === 1) {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
          header.forEach(function (t, i) { doc.text(t, L.x0, 23 + i * 3.4); });
          doc.setFontSize(11.5); doc.text('FICHA PARA RELATÓRIO DE DESENVOLVIMENTO', L.x0, 42);
          doc.setFontSize(10.5); doc.text(cortar(doc, 'Estudante: ' + e.nome, 134), L.x0, 49);
          doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
          doc.text(cortar(doc, 'Turma: ' + e.turmaNome + '    Período: ' + ctx.perNome + ' de ' + ctx.ano, 134), L.x0, 54.5);
          doc.text(cortar(doc, 'Componente ou função: ' + ctx.compNome, 134), L.x0, 59.5);
          doc.text(cortar(doc, 'Professor(a): ' + (ctx.professor || '______________________________'), 134), L.x0, 64.5);
          doc.setFontSize(7.8); doc.setTextColor(40);
          doc.text('Marque com um X bem forte dentro do quadrinho, com caneta azul ou preta. Se marcar errado, risque a linha ao lado e avise a coordenação ao entregar.', L.x0, 70.5);
          doc.text('Não dobre a folha e não escreva perto dos quadrados pretos. Ao terminar, entregue ' + (tot > 1 ? 'todas as páginas' : 'a folha') + ' à coordenação pedagógica.', L.x0, 74);
          doc.setTextColor(0);
        } else {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
          doc.text(cortar(doc, nomeCurto(e.nome), 134), L.x0, 27);
          doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
          doc.text(cortar(doc, e.turmaNome + '  |  ' + ctx.compNome + '  |  ' + ctx.perNome + ' de ' + ctx.ano, 134), L.x0, 32.5);
          doc.text('Página ' + pg + ' de ' + tot, L.x0, 38);
        }
        desenhar(doc, lay.blocos.filter(function (b) { return b.p === pg; }));
        doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(120);
        doc.text('Relatórios EMFAL  |  ' + e.id + '  |  página ' + pg + ' de ' + tot, 105, 290, { align: 'center' });
        doc.setTextColor(0);
      }
      // frente e verso: se o estudante tiver número ímpar de páginas, deixa o verso em branco
      if (tot > 1 && tot % 2 === 1 && estudantes.length > 1) { doc.addPage(); }
    });
    return doc;
  }
  function nomeCurto(n) { return 'Estudante: ' + n; }
  function cortar(doc, t, w) { while (t.length > 4 && doc.getTextWidth(t) > w) t = t.slice(0, -2); return t; }
  function desenhar(doc, bs) {
    doc.setLineWidth(0.3);
    bs.forEach(function (b) {
      if (b.t === 'box') { doc.setDrawColor(0); doc.setLineWidth(0.3); doc.rect(b.x - L.box / 2, b.y - L.box / 2, L.box, L.box, 'S'); }
      else if (b.t === 'faixa') { doc.setFillColor(242, 242, 242); doc.setDrawColor(0); doc.setLineWidth(0.2); doc.rect(b.x, b.y, b.w, b.h, 'FD'); doc.setFillColor(0); }
      else if (b.t === 'risco') { doc.setDrawColor(120); doc.setLineWidth(0.2); doc.line(b.x, b.y, b.x + b.w, b.y); doc.setDrawColor(0); }
      else if (b.t === 'linha') { doc.setDrawColor(190); doc.setLineWidth(0.15); doc.line(b.x, b.y + b.h, b.x + b.w, b.y + b.h); doc.setDrawColor(0); }
      else if (b.t === 'txt') {
        doc.setFont('helvetica', b.b ? 'bold' : b.i ? 'italic' : 'normal'); doc.setFontSize(b.f || 8); doc.text(b.s, b.x, b.y);
      } else if (b.t === 'tit') {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9.3); doc.text(b.s, b.x, b.y);
      } else if (b.t === 'grp') {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.2); doc.text(b.s, b.x, b.y);
        var w = doc.getTextWidth(b.s);
        doc.setFont('helvetica', 'italic'); doc.setFontSize(7.4); doc.setTextColor(80); doc.text(b.d, b.x + w + 1.5, b.y); doc.setTextColor(0);
      } else if (b.t === 'hcab') {
        doc.setFillColor(217, 217, 217); doc.rect(b.x, b.y - 3.4, L.x1 - L.x0, 4.6, 'F'); doc.setFillColor(0);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.2); doc.text(b.s, b.x + 1.5, b.y);
        doc.setFontSize(6.2);
        ['Consolidado', 'Em consol.', 'Não consol.'].forEach(function (t, j) { doc.text(t, COLS_H[j], b.y, { align: 'center' }); });
      }
    });
  }

  // ===== Leitura da imagem (mesmo método do Corretor EMFAL) =====
  function cinza(d, w, h) {
    var g = new Uint8Array(w * h);
    for (var i = 0, j = 0; i < g.length; i++, j += 4) g[i] = (d[j] * 299 + d[j + 1] * 587 + d[j + 2] * 114) / 1000;
    return g;
  }
  function binarizar(g, w, h) {
    var I = new Uint32Array((w + 1) * (h + 1)), W1 = w + 1, x, y;
    for (y = 0; y < h; y++) {
      var s = 0;
      for (x = 0; x < w; x++) { s += g[y * w + x]; I[(y + 1) * W1 + x + 1] = I[y * W1 + x + 1] + s; }
    }
    var S = Math.max(16, Math.floor(Math.max(w, h) / 8)) >> 1, b = new Uint8Array(w * h);
    for (y = 0; y < h; y++) {
      var y1 = Math.max(0, y - S), y2 = Math.min(h - 1, y + S);
      for (x = 0; x < w; x++) {
        var x1 = Math.max(0, x - S), x2 = Math.min(w - 1, x + S);
        var cnt = (x2 - x1 + 1) * (y2 - y1 + 1);
        var sum = I[(y2 + 1) * W1 + x2 + 1] - I[y1 * W1 + x2 + 1] - I[(y2 + 1) * W1 + x1] + I[y1 * W1 + x1];
        b[y * w + x] = g[y * w + x] * cnt <= sum * 0.82 ? 1 : 0;
      }
    }
    return b;
  }
  function componentes(b, w, h, minArea) {
    var lab = new Int32Array(w * h), out = [], st = new Int32Array(w * h), id = 0;
    for (var i = 0; i < b.length; i++) {
      if (!b[i] || lab[i]) continue;
      id++; var sp = 0; st[sp++] = i; lab[i] = id;
      var area = 0, sx = 0, sy = 0, x0 = w, x1 = 0, y0 = h, y1 = 0;
      while (sp) {
        var p = st[--sp], px = p % w, py = (p - px) / w;
        area++; sx += px; sy += py;
        if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
        if (px > 0 && b[p - 1] && !lab[p - 1]) { lab[p - 1] = id; st[sp++] = p - 1; }
        if (px < w - 1 && b[p + 1] && !lab[p + 1]) { lab[p + 1] = id; st[sp++] = p + 1; }
        if (py > 0 && b[p - w] && !lab[p - w]) { lab[p - w] = id; st[sp++] = p - w; }
        if (py < h - 1 && b[p + w] && !lab[p + w]) { lab[p + w] = id; st[sp++] = p + w; }
      }
      if (area >= minArea) out.push({ area: area, cx: sx / area, cy: sy / area, bw: x1 - x0 + 1, bh: y1 - y0 + 1 });
    }
    return out;
  }
  // área com sinal: positiva quando os cantos seguem a ordem TL, TR, BR, BL (sentido horário na imagem)
  function areaQuad(p) {
    var s = 0;
    for (var i = 0; i < 4; i++) { var a = p[i], b = p[(i + 1) % 4]; s += a.cx * b.cy - b.cx * a.cy; }
    return s / 2;
  }
  function acharMarcas(b, w, h) {
    var M = Math.max(w, h), minLado = 0.015 * M;
    var cand = componentes(b, w, h, minLado * minLado * 0.6).filter(function (c) {
      var ar = c.bw / c.bh, fill = c.area / (c.bw * c.bh);
      return ar > 0.6 && ar < 1.67 && fill > 0.7 && c.bw < 0.12 * M && c.bw > minLado;
    });
    if (cand.length < 4) return null;
    var fs = [function (c) { return -(c.cx + c.cy); }, function (c) { return c.cx - c.cy; },
      function (c) { return c.cx + c.cy; }, function (c) { return c.cy - c.cx; }];
    var tops = fs.map(function (f) { return cand.slice().sort(function (a, b) { return f(b) - f(a); }).slice(0, 4); });
    var best = null, bestA = 0;
    tops[0].forEach(function (a) { tops[1].forEach(function (b) { tops[2].forEach(function (c) { tops[3].forEach(function (d) {
      var q = [a, b, c, d];
      if (new Set(q).size < 4) return;
      var ars = q.map(function (x) { return x.area; });
      if (Math.max.apply(0, ars) > 3.5 * Math.min.apply(0, ars)) return;
      var A = areaQuad(q);
      if (A > bestA) { bestA = A; best = q; }
    }); }); }); });
    if (!best || bestA < 0.15 * w * h) return null;
    return best.map(function (c) { return [c.cx, c.cy]; });
  }
  function homografia(src, dst) {
    var A = [], i;
    for (i = 0; i < 4; i++) {
      var x = src[i][0], y = src[i][1], u = dst[i][0], v = dst[i][1];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
    }
    for (var c = 0; c < 8; c++) {
      var piv = c;
      for (var r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
      var t = A[c]; A[c] = A[piv]; A[piv] = t;
      if (Math.abs(A[c][c]) < 1e-12) return null;
      for (r = 0; r < 8; r++) if (r !== c) {
        var f = A[r][c] / A[c][c];
        for (var k = c; k < 9; k++) A[r][k] -= f * A[c][k];
      }
    }
    var hh = [];
    for (i = 0; i < 8; i++) hh.push(A[i][8] / A[i][i]);
    hh.push(1);
    return hh;
  }
  function aplicar(H, x, y) {
    var z = H[6] * x + H[7] * y + 1;
    return [(H[0] * x + H[1] * y + H[2]) / z, (H[3] * x + H[4] * y + H[5]) / z];
  }
  // fração escura no miolo do quadrinho (sem a borda impressa)
  function miolo(b, w, h, H, xm, ym) {
    var m = L.box * 0.3, tot = 0, esc = 0, passos = 9;
    for (var i = 0; i < passos; i++) for (var j = 0; j < passos; j++) {
      var u = xm - m + (2 * m) * i / (passos - 1), v = ym - m + (2 * m) * j / (passos - 1);
      var p = aplicar(H, u, v), px = Math.round(p[0]), py = Math.round(p[1]);
      tot++;
      if (px >= 0 && py >= 0 && px < w && py < h && b[py * w + px]) esc++;
    }
    return esc / tot;
  }

  // Recorta e endireita um retângulo da folha (em mm) a partir da foto. pxmm = pixels por milímetro.
  function recortar(img, H, r, pxmm) {
    var W = Math.round(r.w * pxmm), Hh = Math.round(r.h * pxmm), out = new Uint8ClampedArray(W * Hh * 4), d = img.data, w = img.width, h = img.height;
    for (var j = 0; j < Hh; j++) for (var i = 0; i < W; i++) {
      var p = aplicar(H, r.x + i / pxmm, r.y + j / pxmm), x = p[0], yy = p[1], o = (j * W + i) * 4;
      var x0 = Math.floor(x), y0 = Math.floor(yy), fx = x - x0, fy = yy - y0;
      if (x0 < 0 || y0 < 0 || x0 + 1 >= w || y0 + 1 >= h) { out[o] = out[o + 1] = out[o + 2] = 255; out[o + 3] = 255; continue; }
      for (var c = 0; c < 3; c++) {
        var a = d[(y0 * w + x0) * 4 + c], b2 = d[(y0 * w + x0 + 1) * 4 + c], e = d[((y0 + 1) * w + x0) * 4 + c], f = d[((y0 + 1) * w + x0 + 1) * 4 + c];
        out[o + c] = (a * (1 - fx) + b2 * fx) * (1 - fy) + (e * (1 - fx) + f * fx) * fy;
      }
      out[o + 3] = 255;
    }
    return { data: out, width: W, height: Hh };
  }

  var MARCA = 0.25, DUVIDA = 0.08;
  /* Lê uma página. Devolve {ok, erro, cod, valores:[fração por caixa da página]} */
  function lerPagina(img, jsQR, cfg, compNomes) {
    var w = img.width, h = img.height;
    var qr = jsQR(img.data, w, h, { inversionAttempts: 'attemptBoth' });
    if (!qr) return { ok: false, erro: 'Não encontrei o QR Code. Fotografe a página inteira, de frente e com boa luz.' };
    var cod = lerCodigo(qr.data);
    if (!cod) return { ok: false, erro: 'Este QR Code não é de uma folha do Relatórios EMFAL.' };
    if (cod.erro) return { ok: false, erro: 'Esta folha foi impressa por uma versão antiga do app. Imprima a folha de novo.' };
    var compNome = compNomes[cod.comp];
    if (!compNome) return { ok: false, erro: 'Componente da folha não reconhecido.' };
    var b = binarizar(cinza(img.data, w, h), w, h);
    var marcas = acharMarcas(b, w, h);
    if (!marcas) return { ok: false, erro: 'Não encontrei os 4 quadrados pretos dos cantos. Fotografe a página inteira, sobre uma mesa.', cod: cod };
    var loc = qr.location, qc = [(loc.topLeftCorner.x + loc.bottomRightCorner.x + loc.topRightCorner.x + loc.bottomLeftCorner.x) / 4,
      (loc.topLeftCorner.y + loc.bottomRightCorner.y + loc.topRightCorner.y + loc.bottomLeftCorner.y) / 4];
    var H = null, menor = Infinity;
    for (var k = 0; k < 4; k++) {
      var dst = [0, 1, 2, 3].map(function (j) { return marcas[(j + k) % 4]; });
      var Hk = homografia(L.mk.c, dst);
      if (!Hk) continue;
      var pq = aplicar(Hk, L.qr.x + L.qr.s / 2, L.qr.y + L.qr.s / 2), d = Math.hypot(pq[0] - qc[0], pq[1] - qc[1]);
      if (d < menor) { menor = d; H = Hk; }
    }
    var escala = Math.hypot(marcas[0][0] - marcas[2][0], marcas[0][1] - marcas[2][1]) / Math.hypot(182, 269);
    if (!H || menor > 12 * escala) return { ok: false, erro: 'A folha parece dobrada ou muito inclinada. Tente outra foto, de frente.', cod: cod };
    var lay = layout(cfg, compNome, cod.anoEsc);
    var cxs = lay.caixas.filter(function (c) { return c.p === cod.pag; });
    var rec = lay.consid && lay.consid.p === cod.pag ? recortar(img, H, lay.consid, 6) : null;
    return { ok: true, cod: cod, compNome: compNome, valores: cxs.map(function (c) { return miolo(b, w, h, H, c.x, c.y); }), recorte: rec };
  }

  /* Junta as páginas lidas de um mesmo estudante e devolve o que vai para o formulário do app.
     paginas = {nº: valores}. base = dados que já existiam (as páginas não lidas mantêm o que estava).
     Devolve {dados, alertas:[{rot, motivo, sel}], lidas:[nºs], faltam:[nºs]} */
  function interpretar(cfg, compNome, anoEsc, paginas, base, GRUPOS) {
    var lay = layout(cfg, compNome, anoEsc), d = JSON.parse(JSON.stringify(base || {}));
    var lidas = Object.keys(paginas).map(Number).sort(), faltam = [], alertas = [];
    for (var p = 1; p <= lay.paginas; p++) if (lidas.indexOf(p) < 0) faltam.push(p);
    var porPag = {};
    lay.caixas.forEach(function (c) { (porPag[c.p] = porPag[c.p] || []).push(c); });
    var grupos = {}, hab = {}, nivel = [], ee = null;
    lidas.forEach(function (p) {
      (porPag[p] || []).forEach(function (c, i) {
        var v = paginas[p][i]; c = { chave: c.chave, rot: c.rot, v: v };
        if (c.chave.t === 'ee') ee = c;
        else if (c.chave.t === 'g') (grupos[c.chave.k] = grupos[c.chave.k] || []).push(c);
        else if (c.chave.t === 'h') { var hk = c.chave.a + c.chave.ano + '-' + c.chave.i; (hab[hk] = hab[hk] || []).push(c); }
        else if (c.chave.t === 'nv') nivel.push(c);
      });
    });
    function marcado(c) { return c.v >= MARCA; }
    function duvida(c) { return c.v >= DUVIDA && c.v < MARCA; }
    if (ee) {
      d.ee = marcado(ee);
      if (duvida(ee)) alertas.push({ rot: ee.rot, motivo: 'marcação fraca, confira', sel: { t: 'ee' } });
    }
    Object.keys(grupos).forEach(function (k) {
      var g = GRUPOS[k], cs = grupos[k], on = cs.filter(marcado);
      cs.filter(duvida).forEach(function (c) { alertas.push({ rot: c.rot, motivo: 'marcação fraca, confira', sel: { t: 'g', k: k, v: c.chave.v } }); });
      if (g.tipo === 'um') {
        if (!on.length) delete d[k];
        else {
          on.sort(function (a, b) { return b.v - a.v; });
          d[k] = on[0].chave.v;
          if (on.length > 1) alertas.push({ rot: g.rot, motivo: 'mais de uma opção marcada; ficou a mais forte', sel: { t: 'g', k: k, v: on[0].chave.v } });
        }
      } else {
        var vs = on.map(function (c) { return c.chave.v; });
        if (vs.indexOf('n') >= 0 && vs.length > 1) {
          vs = vs.filter(function (x) { return x !== 'n'; });
          alertas.push({ rot: g.rot, motivo: '"' + g.nenhum + '" foi marcado junto com outras opções; ficaram as outras', sel: { t: 'g', k: k, v: vs[0] } });
        }
        if (vs.length) d[k] = vs; else delete d[k];
      }
    });
    // itens de EE marcados sem o quadrinho de EE: considera EE e avisa
    if (ee && !d.ee && Object.keys(grupos).some(function (k) { return GRUPOS[k].ee && d[k] != null; })) {
      d.ee = true;
      alertas.push({ rot: ee.rot, motivo: 'havia itens de Educação Especial marcados, então o quadrinho foi considerado marcado', sel: { t: 'ee' } });
    }
    var hks = Object.keys(hab);
    if (hks.length || nivel.length) {
      var h = d.hab && d.hab.ano === anoEsc ? d.hab : { ano: anoEsc, itens: {}, outro: {} };
      h.itens = h.itens || {}; h.outro = h.outro || {};
      hks.forEach(function (hk) {
        var cs = hab[hk], on = cs.filter(marcado);
        cs.filter(duvida).forEach(function (c) { alertas.push({ rot: c.rot, motivo: 'marcação fraca, confira', sel: { t: 'h', hk: hk, st: c.chave.st } }); });
        if (!on.length) delete h.itens[hk];
        else {
          on.sort(function (a, b) { return b.v - a.v; });
          h.itens[hk] = on[0].chave.st;
          if (on.length > 1) alertas.push({ rot: on[0].rot, motivo: 'mais de uma situação marcada; ficou a mais forte', sel: { t: 'h', hk: hk, st: on[0].chave.st } });
        }
      });
      if (nivel.length) {
        var on2 = nivel.filter(marcado).sort(function (a, b) { return b.v - a.v; });
        nivel.filter(duvida).forEach(function (c) { alertas.push({ rot: c.rot, motivo: 'marcação fraca, confira', sel: { t: 'nv', i: c.chave.i } }); });
        if (on2.length) { h.nivel = on2[0].chave.i; if (on2.length > 1) alertas.push({ rot: 'Nível de escrita', motivo: 'mais de uma opção marcada; ficou a mais forte', sel: { t: 'nv', i: h.nivel } }); }
        else delete h.nivel;
      }
      var tem = Object.keys(h.itens).length || Object.keys(h.outro).length || h.nivel != null;
      if (tem) d.hab = h; else delete d.hab;
    }
    return { dados: d, alertas: alertas, lidas: lidas, faltam: faltam, total: lay.paginas };
  }

  var api = { L: L, VERSAO: VERSAO, layout: layout, codigoQR: codigoQR, lerCodigo: lerCodigo, gerarPDF: gerarPDF,
    lerPagina: lerPagina, interpretar: interpretar, MARCA: MARCA, DUVIDA: DUVIDA };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FolhaREL = api;
})(this);
