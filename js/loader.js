/* Carga de imagen → { name, width, height, data (RGBA), canvas } */
const Loader = (() => {
  const MAX_SIDE = 6000; // límite de seguridad para no congelar el navegador

  function fromFile(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) return reject(new Error('El archivo no es una imagen.'));
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        resolve({ name: file.name || 'imagen', width: w, height: h, data: ctx.getImageData(0, 0, w, h).data, canvas, resized: k < 1 });
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen.')); };
      img.src = url;
    });
  }
  return { fromFile };
})();
