import fs from 'node:fs/promises';
const files=['index.html','styles.css','app.js','core.js','sw.js','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png'];
await fs.mkdir(new URL('./dist/',import.meta.url),{recursive:true});
for(const file of files)await fs.copyFile(new URL(file,import.meta.url),new URL(`./dist/${file}`,import.meta.url));
console.log(`Build listo: ${files.length} archivos en dist/`);
