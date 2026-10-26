# Seis Cuerdas

Primera versión de una PWA en español para Android: biblioteca personal de tablaturas de seis cuerdas y letra con acordes, revisión explícita, indicación de capo y afinador por micrófono. HTML, CSS y JavaScript sin dependencias de ejecución, anuncios ni servicios externos de audio.

[Abrir la app](https://seis-cuerdas.pepe-lag-gar-3da.workers.dev/) · [Repositorio](https://github.com/pplagarto/guitarpepe)

Para obtener el código: `git clone https://github.com/pplagarto/guitarpepe.git`. La publicación actual se realiza desde Cloudflare; subir cambios al repositorio no actualiza automáticamente la app publicada.

## Probar en este Mac

Requiere Node.js 18 o posterior. Desde esta carpeta:

```sh
npm start
```

Abre http://127.0.0.1:4175. La vista de desarrollo móvil está en http://127.0.0.1:4175/mobile-preview.html (iframe de 390 px). El servidor escucha solo en este Mac; esta dirección no sirve para abrir la app desde un teléfono.

## Biblioteca y revisión

- Añadir canción permite pegar el texto original o insertar bloques de seis líneas, de e aguda a E grave. Se conservan espacios, tabulaciones y saltos de línea, con texto monoespaciado y desplazamiento horizontal; no se reorganiza automáticamente el contenido pegado.
- Elige tablatura o letra y acordes, la afinación, y el capo: por confirmar, sin capo o traste 1–12. Fuente y notas son opcionales.
- Guardar crea un borrador. Para aprobar, confirma el contenido, capo y afinación en la ficha y pulsa «Aprobar canción». Un capo sin confirmar impide aprobar.
- Editar una canción aprobada vuelve a marcarla por revisar. Las favoritas son independientes del estado de revisión.
- Incluye búsqueda, filtros, favoritos y ajuste del tamaño de texto.
- «Explorar un ejemplo» abre un ejercicio original en el editor. No se precargan canciones de terceros ni se descargan tablaturas de sitios externos.

## Datos y respaldos

La biblioteca se guarda en `localStorage` bajo `seis-cuerdas.library.v1`. No existe sincronización entre navegadores o dispositivos. Cada origen tiene su propia biblioteca: los datos de localhost no aparecen automáticamente en la URL publicada. El almacenamiento puede borrarse al limpiar los datos del navegador; exporta respaldos periódicamente.

«Respaldar» descarga JSON versión 1. «Importar» acepta ese formato (hasta 500 canciones por archivo) o un `.txt` para editar una canción. Todas las importaciones quedan pendientes de revisión. Se añaden a la biblioteca con IDs nuevos y no sobrescriben canciones; repetir una importación puede crear duplicados. Límite por archivo: 5 MB; contenido por canción: 100 000 caracteres. Los errores de almacenamiento se muestran sin fingir un guardado exitoso. Si los datos existentes están dañados, se preservan y se ofrece descargarlos antes de reiniciar.

## Afinador

Afinaciones, de la 6ª a la 1ª cuerda:

| Afinación | Notas |
| --- | --- |
| Estándar | E2 A2 D3 G3 B3 E4 |
| Drop D | D2 A2 D3 G3 B3 E4 |
| Medio tono abajo | E♭2 A♭2 D♭3 G♭3 B♭3 E♭4 |
| DADGAD | D2 A2 D3 G3 A3 D4 |
| Open G | D2 G2 D3 G3 B3 D4 |
| Open D | D2 A2 D3 F♯3 A3 D4 |

Usa Web Audio y un detector YIN de frecuencia fundamental, referencia A4=440 Hz, lectura en cents y zona verde de ±5 cents. Detecta automáticamente la cuerda más cercana o permite fijarla tocando su botón; si la cuerda está muy desafinada, seleccionarla manualmente evita confusiones. Afina sin capo, una cuerda al aire a la vez, apagando las demás.

El micrófono requiere HTTPS (localhost es la excepción de desarrollo) y permiso del usuario. Solo se activa al pulsar el botón; no se graba ni se envía audio. Se detiene al cambiar a la biblioteca, esconder la página, cerrar o pulsar apagar. Una solicitud de permiso cancelada no deja una captura activa si el permiso llega tarde.

La precisión del algoritmo se verificó con señales sintéticas a 44,1 y 48 kHz, incluyendo armónicos, ruido y notas ±30 cents del objetivo. **Queda pendiente probar el micrófono y la instalación en un teléfono Android real.**

## Publicación e instalación Android

```sh
npm run build
```

Genera `dist/` con nueve archivos públicos mediante una lista explícita. Se puede servir en un alojamiento estático HTTPS, incluso en una subcarpeta. No publiques toda la carpeta de desarrollo. No requiere servidor de aplicación ni base de datos.

Publicada el 25 de octubre de 2026 en Cloudflare Workers Static Assets:

**https://seis-cuerdas.pepe-lag-gar-3da.workers.dev/**

Worker: `seis-cuerdas`. La publicación inicial se realizó subiendo los nueve archivos de `dist/` mediante el panel autenticado de Cloudflare. El panel confirmó la versión `cc71f80f` como `Ready`, al 100 %. La dirección de la app es pública; las canciones se conservan solo en el navegador de cada dispositivo.

Para futuras actualizaciones por el panel, abre **Workers & Pages → seis-cuerdas → New deployment** y sube la carpeta `dist/` después del build. También se incluye Wrangler como dependencia de desarrollo y `wrangler.jsonc` con el nombre de este mismo Worker. Para publicar por CLI, ejecuta `npx wrangler login` y después `npm run deploy`; no se configuraron credenciales de CLI durante la publicación inicial.

El intento previo con Sites no creó ningún Site porque ese servicio no estaba habilitado en la cuenta.

Una vez publicada, abre la URL HTTPS en Chrome para Android y usa ⋮ → «Instalar aplicación» o «Añadir a pantalla de inicio». La primera carga requiere internet. El service worker conserva los recursos necesarios para abrir la biblioteca y el afinador sin conexión después de esa carga. El micrófono sigue sujeto al permiso del navegador.

Los cambios del service worker se activan al cerrar las pestañas de la versión anterior y volver a abrir la app. Al modificar los archivos publicados, cambia el identificador `CACHE` en `sw.js` y vuelve a ejecutar el build.

Referencias técnicas: [micrófono y HTTPS en MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [manifest PWA](https://web.dev/learn/pwa/web-app-manifest).

## Verificación

```sh
npm test
npm run build
```

17 pruebas: las seis afinaciones a dos tasas de muestreo con armónicos/ruido, rechazo de silencio/ruido, cuerda y octava, selección manual, validación de capo, conservación literal del texto al importar y rechazo de respaldos inválidos.

La revisión manual en el navegador cubre creación de borradores, aprobación del ejercicio de prueba, edición de capo que vuelve a requerir revisión, persistencia tras recargar y presentación a 390 px. Se apagó el servidor local y se comprobó que la biblioteca recargaba desde la caché y que la interfaz del afinador permitía cambiar a Drop D sin conexión al servidor. No se activó un micrófono real durante estas pruebas.
