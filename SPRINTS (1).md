# Semitonos DTF — Hoja de ruta

Stack: HTML + CSS + JavaScript vanilla, canvas 2D, sin backend ni dependencias.
Meta: preparar imágenes para impresión DTF: semitonos controlados y **sin bordes blancos**.
Decisión: sin IA para quitar fondos (sería de pago). Todo se resuelve con algoritmos propios.

## Estructura
index.html · css/styles.css · js/halftone.js (motor) · js/loader.js (carga) · js/app.js (interfaz)

## Sprint 1 — Carga y semitono ✅
Cargar imagen (botón, arrastrar, pegar) · tamaño, ángulo y forma del punto · tinta única o color original · contraste, brillo, invertir · vista con fondo de prueba · zoom · exportar PNG transparente.

## Sprint 2 — Quitar fondo y píxeles fantasma
- Cuentagotas de color de fondo + tolerancia (modo contiguo y modo global).
- Suavizado del borde de la selección (feather de 0–3 px).
- Píxeles fantasma: umbral de alfa (borra píxeles casi transparentes), erosión/contracción del borde de 1–3 px.
- Descontaminar color del borde (reemplaza el color claro del halo por el del interior cercano) o rellenar/extender color hacia el borde.
- Vista de prueba en negro y blanco para detectar halos; contador de píxeles fantasma eliminados.
- Aplicar la limpieza ANTES del semitono (el motor ya ignora los píxeles con alfa 0).

## Sprint 3 — Zona de aplicación (máscara)
- Pincel y goma con tamaño y dureza; selección rectangular y lazo.
- El semitono solo se aplica dentro de la máscara; el resto queda en tono continuo.
- Invertir máscara, mostrar/ocultar máscara, deshacer/rehacer básico.

## Sprint 4 — Pinceles de desgaste
- Importar pinceles/sprites PNG hechos en Affinity (escala de grises o con alfa).
- Ajustes: tamaño, espaciado, dureza, opacidad, rotación aleatoria.
- Modos: borrar (desgasta el diseño) y multiplicar (agrega textura).
- Guardar los pinceles importados en el navegador (IndexedDB).

## Sprint 5 — Pulido
- Web Worker para renders pesados; barra de progreso.
- Zoom con rueda y desplazamiento con espacio+arrastrar.
- Deshacer/rehacer global, atajos de teclado, presets guardables.
- Exportar PNG con metadato de 300 DPI; comparar antes/después.

## Notas
- Límite actual: 6000 px por lado.
- Más de ~1.5 M de puntos puede tardar en el preview: sube el tamaño de punto o baja el zoom.
