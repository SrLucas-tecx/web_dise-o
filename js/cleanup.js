/* Limpieza previa al semitono: quitar fondo, píxeles fantasma, motas y halos. No modifica la imagen original. */
const Cleanup = (() => {
  const opaque = d => { let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; };

  function removeBackground(d, w, h, o) {
    const [kr, kg, kb] = o.key, lim = Math.pow((o.tol / 100) * 441.67, 2);
    const match = i => {
      const p = i * 4; if (!d[p + 3]) return false;
      const a = d[p] - kr, b = d[p + 1] - kg, c = d[p + 2] - kb;
      return a * a + b * b + c * c <= lim;
    };
    if (o.scope === 'all') { for (let i = 0; i < w * h; i++) if (match(i)) d[i * 4 + 3] = 0; return; }
    // Solo el fondo conectado con el borde (no borra el mismo color dentro del dibujo)
    const seen = new Uint8Array(w * h), stack = new Int32Array(w * h * 2 + 8);
    let sp = 0;
    const push = i => { if (!seen[i] && (!d[i * 4 + 3] || match(i))) { seen[i] = 1; stack[sp++] = i; } };
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (sp) {
      const i = stack[--sp], x = i % w, y = (i / w) | 0;
      d[i * 4 + 3] = 0;
      if (x > 0) push(i - 1); if (x < w - 1) push(i + 1);
      if (y > 0) push(i - w); if (y < h - 1) push(i + w);
    }
  }

  function alphaPass(d, thr, hard) {
    for (let i = 3; i < d.length; i += 4) {
      if (hard) d[i] = d[i] >= (thr || 128) ? 255 : 0;
      else if (thr && d[i] < thr) d[i] = 0;
    }
  }

  function erode(d, w, h, times) {
    for (let t = 0; t < times; t++) {
      const kill = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x; if (!d[i * 4 + 3]) continue;
        if ((x > 0 && !d[(i - 1) * 4 + 3]) || (x < w - 1 && !d[(i + 1) * 4 + 3]) ||
            (y > 0 && !d[(i - w) * 4 + 3]) || (y < h - 1 && !d[(i + w) * 4 + 3])) kill.push(i);
      }
      kill.forEach(i => { d[i * 4 + 3] = 0; });
    }
  }

  function removeSpecks(d, w, h, minSize) {
    const seen = new Uint8Array(w * h), stack = new Int32Array(w * h);
    for (let s = 0; s < w * h; s++) {
      if (seen[s] || !d[s * 4 + 3]) continue;
      let sp = 0, n = 0; const comp = [s]; seen[s] = 1; stack[sp++] = s;
      while (sp) {
        const i = stack[--sp], x = i % w, y = (i / w) | 0; n++;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = ny * w + nx; if (seen[j] || !d[j * 4 + 3]) continue;
          seen[j] = 1; stack[sp++] = j; if (n < minSize) comp.push(j);
        }
      }
      if (n < minSize) comp.forEach(i => { d[i * 4 + 3] = 0; });
    }
  }

  // Los píxeles del borde (semitransparentes o junto a transparencia) toman el color del interior cercano → sin halo blanco
  function defringe(d, w, h) {
    const edge = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, a = d[i * 4 + 3]; if (!a) continue;
      if (a < 255 || (x > 0 && !d[(i - 1) * 4 + 3]) || (x < w - 1 && !d[(i + 1) * 4 + 3]) ||
          (y > 0 && !d[(i - w) * 4 + 3]) || (y < h - 1 && !d[(i + w) * 4 + 3])) edge[i] = 1;
    }
    const out = new Uint8ClampedArray(d);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!edge[i]) continue;
      let r = 0, g = 0, b = 0, n = 0, r2 = 0, g2 = 0, b2 = 0, n2 = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx, ny = y + dy; if ((!dx && !dy) || nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx, p = j * 4; if (!d[p + 3]) continue;
        if (!edge[j]) { r += d[p]; g += d[p + 1]; b += d[p + 2]; n++; }
        else { r2 += d[p]; g2 += d[p + 1]; b2 += d[p + 2]; n2++; }
      }
      const p = i * 4;
      if (n) { out[p] = r / n; out[p + 1] = g / n; out[p + 2] = b / n; }
      else if (n2) { out[p] = r2 / n2; out[p + 1] = g2 / n2; out[p + 2] = b2 / n2; }
    }
    d.set(out);
  }

  function apply(src, o) {
    const { width: w, height: h } = src, d = new Uint8ClampedArray(src.data), before = opaque(d);
    if (o.bgOn) removeBackground(d, w, h, o);
    if (o.athr || o.hard) alphaPass(d, o.athr, o.hard);
    if (o.erode) erode(d, w, h, o.erode);
    if (o.specks) removeSpecks(d, w, h, o.specks);
    if (o.defringe) defringe(d, w, h);
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    canvas.getContext('2d').putImageData(new ImageData(d, w, h), 0, 0);
    return { name: src.name, width: w, height: h, data: d, canvas, removed: before - opaque(d) };
  }
  return { apply };
})();
