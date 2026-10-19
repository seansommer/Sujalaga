import{build}from'esbuild';import{cp,mkdir,rm}from'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
await build({entryPoints:['src/main.js'],bundle:true,format:'esm',minify:true,outfile:'dist/app.js',target:['es2022'],external:['https://*'],legalComments:'eof'});
for(const f of ['index.html','styles.css','header.css','manifest.webmanifest','service-worker.js'])await cp(f,`dist/${f}`);
await mkdir('dist/assets',{recursive:true});for(const f of ['cover.webp','share.jpg','icon-512.png','icon-192.png','apple-touch-icon.png','hub-icon.png'])await cp(`assets/${f}`,`dist/assets/${f}`);
console.log('SUJALAGA! ready.');
