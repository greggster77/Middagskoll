import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {handleAPI,validState} from './worker/index.js';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'};
const MAX_BODY=250000;
const HEADERS={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Permissions-Policy':'camera=(self), geolocation=(self), web-share=(self)','X-Frame-Options':'SAMEORIGIN','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://assets.icanet.se https://www.koket.se https://images.koket.se https://img.koket.se https://cdn.koket.se https://www.arla.se; connect-src 'self' https://geocoding-api.open-meteo.com https://overpass-api.de; media-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'"};

export function supervisorPeer(address){return String(address).replace(/^::ffff:/,'')==='172.30.32.2';}
function respond(res,status,body,type='application/json; charset=utf-8',extra={}){res.writeHead(status,{...HEADERS,'Content-Type':type,...extra});res.end(body);}
function json(res,status,data){respond(res,status,JSON.stringify(data));}

// Ingress authenticates the user before forwarding the request. Require a custom
// header on writes and do not enable CORS: cross-origin pages cannot send it.
// Unlike Host, Origin remains the browser's external HA origin behind proxies.
export function writeOrigin(headers,{ingressOnly=false}={}){
 if(headers['x-middagskollen']!=='1'||!/^application\/json(?:;|$)/i.test(headers['content-type']||'')||headers['sec-fetch-site']==='cross-site')return null;
 try{
  const origin=new URL(headers.origin);
  if(!['http:','https:'].includes(origin.protocol)||origin.origin!==headers.origin)return null;
  if(!ingressOnly&&origin.host!==headers.host)return null;
  return origin.origin;
 }catch{return null;}
}

export function createApp({dataDir=process.env.DATA_DIR||path.join(ROOT,'data'),ingressOnly=process.env.HA_INGRESS_ONLY==='1',preview=process.env.LOCAL_PREVIEW==='1',api=handleAPI,seedFile=path.join(ROOT,'initial-state.json')}={}){
 fs.mkdirSync(dataDir,{recursive:true,mode:0o700});
 const database=new DatabaseSync(path.join(dataDir,'middagskollen.sqlite'));
 database.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS app_state (id TEXT PRIMARY KEY NOT NULL,payload TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL);');
 // Import the exported household once. An existing local installation always
 // wins, including after an update or reinstallation with the data retained.
 if(seedFile&&fs.existsSync(seedFile)&&!database.prepare('SELECT id FROM app_state WHERE id = ?').get('household')){
  const backup=JSON.parse(fs.readFileSync(seedFile,'utf8'));
  if(backup.app!=='middagskollen'||backup.version!==1||!validState(backup.state))throw Error('Den medföljande säkerhetskopian är ogiltig.');
  database.prepare('INSERT INTO app_state (id,payload,revision,updated_at) VALUES (?,?,1,?)').run('household',JSON.stringify(backup.state),new Date().toISOString());
 }
 const DB={prepare(sql){return{bind(...values){return{async first(){return database.prepare(sql).get(...values)||null;},async run(){return{meta:database.prepare(sql).run(...values)};}};}};}};
 const server=http.createServer(async(req,res)=>{
  try{
   if(ingressOnly&&!supervisorPeer(req.socket.remoteAddress)){json(res,403,{error:'Öppna Middagskollen genom Home Assistant.'});return;}
   const url=new URL(req.url,'http://local.invalid');
   let pathname=url.pathname;
   // Only the local QA process simulates the varying prefix used by HA Ingress.
   if(preview&&pathname.startsWith('/__qa/ingress/'))pathname=pathname.slice('/__qa/ingress'.length);
   if(preview&&pathname==='/__qa/mobile'){
    const width=[360,390,430,768,1280].includes(+url.searchParams.get('width'))?+url.searchParams.get('width'):390;
    respond(res,200,`<!doctype html><html lang="sv"><meta charset="utf-8"><title>Mobilkontroll</title><body style="margin:0;background:#ddd"><iframe title="Middagskollen mobil" src="/__qa/ingress/" allow="camera; geolocation; web-share" style="display:block;width:${width}px;height:844px;border:0"></iframe></body></html>`,'text/html; charset=utf-8');return;
   }
   if(pathname==='/health'&&req.method==='GET'){json(res,200,{ok:true});return;}
   if(pathname.startsWith('/api/')){
    if(!['GET','PUT'].includes(req.method)){json(res,405,{error:'Metoden stöds inte'});return;}
    let origin='http://local.invalid';
    if(req.method==='PUT'){
     origin=writeOrigin(req.headers,{ingressOnly});
     if(!origin){json(res,403,{error:'Ogiltig begäran. Ladda om sidan och försök igen.'});return;}
    }
    if(Number(req.headers['content-length'])>MAX_BODY){json(res,413,{error:'För mycket data'});req.resume();return;}
    const chunks=[];let length=0;
    for await(const chunk of req){length+=chunk.length;if(length>MAX_BODY){json(res,413,{error:'För mycket data'});req.resume();return;}chunks.push(chunk);}
    const headers=new Headers({'Content-Type':'application/json'});
    if(req.method==='PUT')headers.set('Origin',origin);
    const request=new Request(origin+pathname+url.search,{method:req.method,headers,body:req.method==='PUT'?Buffer.concat(chunks):undefined});
    const result=await api(request,{DB});
    respond(res,result.status,Buffer.from(await result.arrayBuffer()),result.headers.get('Content-Type')||'application/json');return;
   }
   if(!['GET','HEAD'].includes(req.method)){json(res,405,{error:'Metoden stöds inte'});return;}
   let decoded;try{decoded=decodeURIComponent(pathname);}catch{json(res,400,{error:'Ogiltig sökväg'});return;}
   // Serve only public assets; never the DB, source, licenses or runtime options.
   const relative=decoded==='/'?'index.html':decoded.slice(1);
   if(relative.includes('\\')||relative.includes('\0')||relative.split('/').some(p=>p==='..'||p.startsWith('.'))){json(res,404,{error:'Sidan finns inte'});return;}
   const base=path.join(ROOT,'public'),file=path.resolve(base,relative);
   if(!file.startsWith(base+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){json(res,404,{error:'Sidan finns inte'});return;}
   respond(res,200,req.method==='HEAD'?'':fs.readFileSync(file),MIME[path.extname(file)]||'application/octet-stream');
  }catch(error){console.error('Middagskollen:',error.message);if(!res.headersSent)json(res,503,{error:'Tjänsten kunde inte nås. Prova igen.'});else res.end();}
 });
 server.requestTimeout=30000;server.headersTimeout=15000;
 server.on('close',()=>database.close());
 return server;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const server=createApp();
 const ingressOnly=process.env.HA_INGRESS_ONLY==='1';
 const host=process.env.HOST||(ingressOnly?'0.0.0.0':'127.0.0.1'),port=Number(process.env.PORT||8099);
 server.listen(port,host,()=>console.log(`Middagskollen körs på port ${port}. ${ingressOnly?'Åtkomst endast genom Home Assistant Ingress.':'Lokal körning.'}`));
 for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{server.close(()=>process.exit(0));server.closeIdleConnections();setTimeout(()=>process.exit(1),10000).unref();});
}
