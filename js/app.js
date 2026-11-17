/* Interfaz: conecta controles, limpieza, vista previa y exportación. */
const $ = id => document.getElementById(id);
let src = null, proc = null, procKey = '', timer = null, picking = false;

const num = ['cell', 'angle', 'contrast', 'brightness', 'tol', 'athr', 'erode', 'specks'];
const hex = v => [1, 3, 5].map(i => parseInt(v.slice(i, i + 2), 16));
const toHex = (r, g, b) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');

function params() {
  return {
    cell: +$('cell').value, angle: +$('angle').value, shape: $('shape').value,
    color: $('color').value, ink: $('ink').value,
    contrast: +$('contrast').value, brightness: +$('brightness').value, invert: $('invert').checked
  };
}
function cleanParams() {
  return {
    bgOn: $('bgOn').checked, key: hex($('bgKey').value), tol: +$('tol').value, scope: $('scope').value,
    athr: +$('athr').value, hard: $('hard').checked, erode: +$('erode').value,
    specks: +$('specks').value, defringe: $('defringe').checked
  };
}
// Devuelve la imagen ya limpia (con caché para no recalcular al mover los controles del semitono)
function current() {
  const o = cleanParams();
  if (!(o.bgOn || o.athr || o.hard || o.erode || o.specks || o.defringe)) return src;
  const key = JSON.stringify(o);
  if (key !== procKey) { proc = Cleanup.apply(src, o); procKey = key; }
  return proc;
}

function schedule() { clearTimeout(timer); $('status').textContent = src ? 'Procesando…' : ''; timer = setTimeout(draw, 150); }

function draw() {
  if (!src) return;
  const img = current();
  const stage = $('stage'), dpr = window.devicePixelRatio || 1;
  const fit = Math.min((stage.clientWidth - 32) / src.width, (stage.clientHeight - 32) / src.height);
  const f = $('zoom').value === 'fit' ? fit : +$('zoom').value;
  const sc = Math.min(f * dpr, 4096 / Math.max(src.width, src.height));
  const view = $('view');
  let out, count = null;
  if ($('orig').checked || $('clean').checked) {
    const base = $('orig').checked ? src : img;
    out = document.createElement('canvas');
    out.width = Math.round(src.width * sc); out.height = Math.round(src.height * sc);
    out.getContext('2d').drawImage(base.canvas, 0, 0, out.width, out.height);
  } else {
    ({ canvas: out, count } = Halftone.render(img, params(), sc));
  }
  view.width = out.width; view.height = out.height;
  view.style.width = src.width * f + 'px'; view.style.height = src.height * f + 'px';
  view.getContext('2d').drawImage(out, 0, 0);
  view.style.display = 'block';
  let msg = count === null ? ($('orig').checked ? 'Mostrando original.' : 'Mostrando imagen limpia.') : count.toLocaleString('es-MX') + ' puntos.';
  if (img.removed !== undefined) msg += ` Limpieza: ${img.removed.toLocaleString('es-MX')} px quitados.`;
  $('status').textContent = msg;
}

async function open(file) {
  try {
    src = await Loader.fromFile(file); proc = null; procKey = '';
    $('info').textContent = `${src.name} — ${src.width}×${src.height}px` + (src.resized ? ' (reducida a 6000 px)' : '');
    if (src.data[3]) $('bgKey').value = toHex(src.data[0], src.data[1], src.data[2]); // sugiere el color de la esquina
    $('export').disabled = false;
    draw();
  } catch (e) { $('info').textContent = e.message; }
}

function exportPng() {
  if (!src) return;
  $('status').textContent = 'Generando PNG…';
  setTimeout(() => {
    const { canvas } = Halftone.render(current(), params(), +$('mult').value);
    canvas.toBlob(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = src.name.replace(/\.[^.]+$/, '') + '_semitono.png';
      a.click(); URL.revokeObjectURL(a.href);
      $('status').textContent = `Exportado ${canvas.width}×${canvas.height}px (fondo transparente).`;
    }, 'image/png');
  }, 30);
}

num.forEach(id => $(id).addEventListener('input', () => { $('v-' + id).textContent = $(id).value; schedule(); }));
['shape', 'color', 'ink', 'invert', 'orig', 'clean', 'zoom', 'bgOn', 'bgKey', 'scope', 'hard', 'defringe'].forEach(id => $(id).addEventListener('input', () => {
  if (id === 'color') $('inkRow').hidden = $('color').value === 'original';
  if (id === 'bgKey') $('bgOn').checked = true;
  schedule();
}));
$('bg').addEventListener('input', () => {
  const v = $('bg').value, st = $('stage');
  $('bgRow').hidden = v !== 'custom';
  st.className = v === 'custom' ? '' : v; st.style.background = v === 'custom' ? $('bgColor').value : '';
});
$('bgColor').addEventListener('input', () => { $('stage').style.background = $('bgColor').value; });
$('file').addEventListener('change', e => e.target.files[0] && open(e.target.files[0]));
$('export').addEventListener('click', exportPng);
window.addEventListener('resize', () => { if ($('zoom').value === 'fit') schedule(); });

// Cuentagotas: toma el color de la imagen ORIGINAL bajo el cursor
$('pick').addEventListener('click', () => {
  if (!src) return;
  picking = !picking; $('view').classList.toggle('pick', picking);
  $('pick').textContent = picking ? 'Haz clic en la imagen…' : 'Tomar color con cuentagotas';
});
$('view').addEventListener('click', e => {
  if (!picking || !src) return;
  const r = $('view').getBoundingClientRect();
  const x = Math.min(src.width - 1, Math.floor((e.clientX - r.left) / r.width * src.width));
  const y = Math.min(src.height - 1, Math.floor((e.clientY - r.top) / r.height * src.height));
  const p = (y * src.width + x) * 4;
  $('bgKey').value = toHex(src.data[p], src.data[p + 1], src.data[p + 2]);
  $('bgOn').checked = true; picking = false; $('view').classList.remove('pick');
  $('pick').textContent = 'Tomar color con cuentagotas';
  schedule();
});

const st = $('stage');
['dragenter', 'dragover'].forEach(t => st.addEventListener(t, e => { e.preventDefault(); st.classList.add('over'); }));
['dragleave', 'drop'].forEach(t => st.addEventListener(t, e => { e.preventDefault(); st.classList.remove('over'); }));
st.addEventListener('drop', e => e.dataTransfer.files[0] && open(e.dataTransfer.files[0]));
window.addEventListener('paste', e => {
  const item = [...e.clipboardData.items].find(i => i.type.startsWith('image/'));
  if (item) open(item.getAsFile());
});
