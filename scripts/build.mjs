import{build}from'esbuild';import{cp,mkdir,rm,readFile,writeFile,rename}from'node:fs/promises';import{createHash}from'node:crypto';
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
await build({entryPoints:['src/main.js'],bundle:true,format:'esm',minify:true,outfile:'dist/app.js',target:['es2022'],external:['https://*'],legalComments:'eof'});
for(const f of ['index.html','styles.css','header.css','manifest.webmanifest'])await cp(f,`dist/${f}`);
// Content names prevent an installed app mixing old scripts with a new interface.
let html=await readFile('dist/index.html','utf8');const files=[];
for(const file of ['app.js','styles.css','header.css']){const bytes=await readFile(`dist/${file}`),hash=createHash('sha256').update(bytes).digest('hex').slice(0,12),name=file.replace(/\.(js|css)$/,`.${hash}.$1`);await rename(`dist/${file}`,`dist/${name}`);html=html.replaceAll(`./${file}`,`./${name}`);files.push(`./${name}`);}
await writeFile('dist/index.html',html);
await mkdir('dist/assets',{recursive:true});for(const f of ['cover.webp','share.jpg','icon-512.png','icon-192.png','apple-touch-icon.png','hub-icon.png'])await cp(`assets/${f}`,`dist/assets/${f}`);
await cp('assets/audio','dist/assets/audio',{recursive:true});
const release=createHash('sha256').update(html).digest('hex').slice(0,12),precache=['./',...files,'./assets/cover.webp','./assets/icon-192.png'];
const worker=(await readFile('service-worker.js','utf8')).replace('__RELEASE__',release).replace('__PRECACHE__',JSON.stringify(precache));await writeFile('dist/service-worker.js',worker);
console.log(`SUJALAGA! ready · ${release}`);
