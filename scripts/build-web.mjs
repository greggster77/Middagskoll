import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OUTPUT=path.join(ROOT,'.web-dist');

export function buildWeb(output){
 fs.mkdirSync(output,{recursive:true});
 assert.equal(fs.readdirSync(output).length,0,'Webbbyggets målmapp måste vara tom.');
 const source=path.join(ROOT,'public');
 const html=fs.readFileSync(path.join(source,'index.html'),'utf8');
 assert.equal((html.match(/data-runtime="server"/g)||[]).length,1);
 fs.writeFileSync(path.join(output,'index.html'),html.replace('data-runtime="server"','data-runtime="browser"'));
 fs.cpSync(path.join(source,'ui'),path.join(output,'ui'),{recursive:true});
 for(const name of ['icon-180.png','icon-192.png','icon-512.png','manifest.webmanifest']){
  fs.copyFileSync(path.join(source,name),path.join(output,name));
 }
 fs.cpSync(path.join(ROOT,'licenses'),path.join(output,'licenses'),{recursive:true});
 fs.writeFileSync(path.join(output,'.nojekyll'),'');
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 fs.rmSync(OUTPUT,{recursive:true,force:true});
 buildWeb(OUTPUT);
 console.log('Webbversionen finns i .web-dist/. Publicera innehållet på en statisk HTTPS-webbserver.');
}
