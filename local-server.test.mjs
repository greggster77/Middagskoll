import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {once} from 'node:events';
import {createApp,supervisorPeer,writeOrigin} from '../server.mjs';
import {handleAPI} from '../worker/index.js';

const state={people:4,boxes:2,plan:[55,147,3,7,5,9,11],pantry:[{key:'food:pasta:kg',name:'Pasta',amount:.5}],budget:1550,prices:{'food:pasta:kg':42,'extra:Kaffe':79},extra:['Kaffe'],home:{gurka:true},toBuy:{'extra:Kaffe':true},keptDays:{0:true},excludeShellfish:true,maxFish:1};
async function start(options){const server=createApp({seedFile:null,...options});server.listen(0,'127.0.0.1');await once(server,'listening');return{server,url:'http://127.0.0.1:'+server.address().port};}
async function stop(server){await new Promise(resolve=>server.close(resolve));}
const put=(url,s,revision=0,headers={})=>fetch(url+'/api/state',{method:'PUT',headers:{'Content-Type':'application/json','X-Middagskollen':'1',Origin:url,...headers},body:JSON.stringify({state:s,revision})});

test('local server persists all household fields across restarts and rejects stale writes',async()=>{
 const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'middagskollen-test-'));
 let app=await start({dataDir});
 try{
  assert.deepEqual(await(await fetch(app.url+'/api/state')).json(),{state:null,revision:0});
  assert.equal((await put(app.url,state)).status,200);
  assert.equal((await put(app.url,{...state,budget:99})).status,409);
  await stop(app.server);app=await start({dataDir});
  assert.deepEqual(await(await fetch(app.url+'/api/state')).json(),{state,revision:1});
  assert.equal((await put(app.url,{...state,people:6},1)).status,200);
  assert.equal((await put(app.url,{...state,budget:-1},2)).status,400);
  assert.equal((await(await fetch(app.url+'/api/state')).json()).state.budget,1550);
 }finally{await stop(app.server);fs.rmSync(dataDir,{recursive:true,force:true});}
});

test('relative client files and APIs work under a simulated changing Ingress prefix',async()=>{
 const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'middagskollen-prefix-'));let called=[];
 const api=async(req,env)=>{called.push(new URL(req.url).pathname);if(req.url.includes('/api/product'))return Response.json({found:true,name:'Testpasta',ean:'7318690099700'});if(req.url.includes('/api/offers'))return Response.json({offers:[],stores:[],checked:'2026-10-25'});return handleAPI(req,env);};
 const app=await start({dataDir,preview:true,api});
 try{
  const base=app.url+'/__qa/ingress/';
  const html=await(await fetch(base)).text();
  assert(html.includes('id="appSearch"'));assert(html.includes('id="budgetLimit"'));
  for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
   if(/^(?:data:|https?:)/.test(match[1]))continue;
   assert(!match[1].startsWith('/'),match[1]);
   assert.equal((await fetch(new URL(match[1],base))).status,200,match[1]);
  }
  assert.equal((await fetch(base+'api/state')).status,200);
  assert.equal((await fetch(base+'api/product?ean=7318690099700')).status,200);
  assert.equal((await fetch(base+'api/offers')).status,200);
  assert(called.includes('/api/product'));assert(called.includes('/api/offers'));
  for(const file of ['app.js','pantry.js','sync.js','local-backup.js'])assert(!/fetch\(['"]\//.test(fs.readFileSync('public/'+file,'utf8')),file);
  for(const file of ['server.mjs','initial-state.json','data/middagskollen.sqlite','.env','package.json','worker/index.js'])assert.equal((await fetch(app.url+'/'+file)).status,404,file);
 }finally{await stop(app.server);fs.rmSync(dataDir,{recursive:true,force:true});}
});

test('Ingress only accepts Supervisor connections; writes require a non-simple same-site request',async()=>{
 assert(supervisorPeer('172.30.32.2'));assert(supervisorPeer('::ffff:172.30.32.2'));assert(!supervisorPeer('127.0.0.1'));assert(!supervisorPeer('172.30.32.20'));
 const headers={'x-middagskollen':'1','content-type':'application/json',origin:'https://home.example',host:'172.30.33.4:8099','sec-fetch-site':'same-origin'};
 assert.equal(writeOrigin(headers,{ingressOnly:true}),'https://home.example');
 assert.equal(writeOrigin({...headers,'sec-fetch-site':'cross-site'},{ingressOnly:true}),null);
 assert.equal(writeOrigin({...headers,'x-middagskollen':undefined},{ingressOnly:true}),null);
 assert.equal(writeOrigin({...headers,origin:'null'},{ingressOnly:true}),null);
 const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'middagskollen-security-'));
 let app=await start({dataDir});
 try{
  assert.equal((await put(app.url,state,0,{'X-Middagskollen':''})).status,403);
  assert.equal((await put(app.url,state,0,{Origin:'https://attacker.invalid'})).status,403);
  assert.equal((await put(app.url,state,0,{'Sec-Fetch-Site':'cross-site'})).status,403);
  assert.equal((await fetch(app.url+'/api/state',{method:'OPTIONS',headers:{Origin:'https://attacker.invalid','Access-Control-Request-Headers':'X-Middagskollen'}})).headers.get('Access-Control-Allow-Origin'),null);
  await stop(app.server);app=await start({dataDir,ingressOnly:true});
  assert.equal((await fetch(app.url+'/')).status,403);
 }finally{await stop(app.server);fs.rmSync(dataDir,{recursive:true,force:true});}
});

test('clean defaults are imported once and never overwrite newer local choices',async()=>{
 const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'middagskollen-seed-'));
 const seedFile=path.resolve('initial-state.json');
 const backup=JSON.parse(fs.readFileSync(seedFile,'utf8'));
 let app=await start({dataDir,seedFile});
 try{
  const d=await(await fetch(app.url+'/api/state')).json();
  assert.deepEqual(d.state,backup.state);assert.equal(d.revision,1);
  assert.equal((await put(app.url,{...d.state,budget:4321},d.revision)).status,200);
  await stop(app.server);app=await start({dataDir,seedFile});
  assert.equal((await(await fetch(app.url+'/api/state')).json()).state.budget,4321);
 }finally{await stop(app.server);fs.rmSync(dataDir,{recursive:true,force:true});}
});
