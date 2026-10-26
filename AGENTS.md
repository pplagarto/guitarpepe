# Seis Cuerdas

## Fuente y publicación

- El usuario requiere que todo el desarrollo y la publicación se basen en GitHub: `https://github.com/pplagarto/guitarpepe`.
- La rama de producción actual es `codex/seis-cuerdas`. Cloudflare Workers Builds publica sus pushes en el Worker `seis-cuerdas`.
- Conserva los cambios en Git, ejecuta las pruebas y el build, y publica mediante push a GitHub. Verifica que Cloudflare haya desplegado ese commit antes de informar que está publicado.
- No uses cargas manuales del panel ni `wrangler deploy` local como vía normal de publicación.
- Mantén el nombre del Worker y su URL existentes. Las canciones se guardan por origen del navegador.

## Comprobaciones

- `npm test`: detección de afinación, revisión de canciones e importación de respaldos.
- `npm run build`: genera `dist/` mediante una lista explícita de archivos públicos.
- Cloudflare ejecuta `npm test && npm run build` antes de `npx wrangler deploy`.
- Cuando cambien archivos públicos, actualiza `CACHE` en `sw.js` para que la PWA instalada pueda recibir la nueva versión.

## Datos

- No incluyas bibliotecas de canciones, respaldos personales, capturas del panel, tokens ni archivos `.env` en commits o paquetes públicos.
- Conserva los espacios y saltos de línea de las tablaturas, y la revisión explícita antes de aprobar canciones.
