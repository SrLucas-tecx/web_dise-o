/* Motor de semitonos. Trabaja en píxeles de la imagen original; `scale` solo cambia la resolución del canvas. */
const Halftone = (() => {
  function poly(ctx, x, y, hw, hh, t) {
    const c = Math.cos(t), s = Math.sin(t);
    [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].forEach(([a, b], i) => {
      const px = x + a * c - b * s, py = y + a * s + b * c;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    });
    ctx.closePath();
  }

  // cov = cobertura 0..1 (porcentaje del área de la celda que se tinta)
  function shape(ctx, type, x, y, cell, cov, th) {
    if (type === 'circle') {
      const r = cell * 0.7071 * Math.sqrt(cov);
      ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2);
    } else if (type === 'square') {
      const h = cell * Math.sqrt(cov) / 2; poly(ctx, x, y, h, h, th);
    } else if (type === 'diamond') {
      const h = cell * Math.sqrt(cov) / 2; poly(ctx, x, y, h, h, th + Math.PI / 4);
    } else { // línea: ancho fijo, grosor según tono
      poly(ctx, x, y, cell / 2 + 0.3, cell * cov / 2, th);
    }
  }

  function render(src, p, scale) {
    const { width: w, height: h, data } = src;
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(w * scale));
    cv.height = Math.max(1, Math.round(h * scale));
    const ctx = cv.getContext('2d');
    ctx.scale(cv.width / w, cv.height / h);

    const cell = p.cell, th = p.angle * Math.PI / 180;
    const c = Math.cos(th), s = Math.sin(th);
    const cx = w / 2, cy = h / 2;
    const n = Math.ceil((Math.hypot(w, h) / 2 + cell) / cell);
    const k = Math.pow(4, p.contrast / 100), b = p.brightness / 200;
    const sub = (w * h) / (cell * cell) > 400000 ? 2 : 3; // muestras por lado dentro de cada celda
    const single = p.color !== 'original';
    if (single) { ctx.fillStyle = p.ink; ctx.beginPath(); }
    let count = 0;

    for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) {
      const u = i * cell, v = j * cell;
      const x0 = cx + u * c - v * s, y0 = cy + u * s + v * c;
      if (x0 < -cell || y0 < -cell || x0 > w + cell || y0 > h + cell) continue;

      let sa = 0, sd = 0, sr = 0, sg = 0, sb = 0;
      for (let a = 0; a < sub; a++) for (let d = 0; d < sub; d++) {
        const du = ((a + 0.5) / sub - 0.5) * cell, dv = ((d + 0.5) / sub - 0.5) * cell;
        const x = Math.floor(cx + (u + du) * c - (v + dv) * s);
        const y = Math.floor(cy + (u + du) * s + (v + dv) * c);
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const o = (y * w + x) * 4, al = data[o + 3] / 255;
        if (!al) continue; // los píxeles transparentes no aportan tinta
        const r = data[o], g = data[o + 1], bl = data[o + 2];
        sa += al; sd += (1 - (0.299 * r + 0.587 * g + 0.114 * bl) / 255) * al;
        sr += r * al; sg += g * al; sb += bl * al;
      }
      if (sa <= 0) continue;

      let t = sd / sa;                       // oscuridad media (0 claro, 1 oscuro)
      if (p.invert) t = 1 - t;
      t = Math.min(1, Math.max(0, (t - 0.5) * k + 0.5 + b));
      const cov = t * Math.min(1, sa / (sub * sub)); // bordes semitransparentes → puntos más chicos
      if (cov < 0.02) continue;

      count++;
      if (!single) {
        ctx.fillStyle = `rgb(${(sr / sa) | 0},${(sg / sa) | 0},${(sb / sa) | 0})`;
        ctx.beginPath();
      }
      shape(ctx, p.shape, x0, y0, cell, cov, th);
      if (!single) ctx.fill();
    }
    if (single) ctx.fill();
    return { canvas: cv, count };
  }

  return { render };
})();
