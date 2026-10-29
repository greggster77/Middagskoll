import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {buildWeb} from '../scripts/build-web.mjs';

const state={people:4,boxes:2,pantry:[],plan:[55,147,3,7,5,9,11],excludeNuts:true};
function runtime({mode='browser',blocked=false}={}){
 const storage=new Map(),requests=[],description={textContent:''};
 const context=vm.createContext({
  Response,URL,AbortSignal,
  document:{currentScript:{getAttribute:()=>mode},getElementById:()=>description},
  localStorage:{
   getItem:key=>storage.get(key)??null,
   setItem(key,value){if(blocked)throw Error('Storage blocked');storage.set(key,value);},
   removeItem:key=>storage.delete(key)
  },
  navigator:{locks:{request:async(key,operation)=>operation()}},
  OFFER_DATA:{offers:[],stores:[]},
  fetch:async(...args)=>{requests.push(args);return Response.json({server:true});}
 });
 vm.runInContext(fs.readFileSync('public/ui/runtime.js','utf8'),context);
 return{context,requests,storage,description,api:vm.runInContext('MealRuntime',context)};
}

test('public build contains the real app and only browser assets, with relative working links',()=>{
 const output=fs.mkdtempSync(path.join(os.tmpdir(),'middagskollen-web-'));
 try{
  buildWeb(output);
  const html=fs.readFileSync(path.join(output,'index.html'),'utf8');
  assert(html.includes('id="days"'));
  assert(html.includes('data-runtime="browser"'));
  assert(!html.includes('data-runtime="server"'));
  assert(fs.existsSync(path.join(output,'.nojekyll')));
  const base='https://example.github.io/Middagskoll/';
  for(const [,relative] of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
   if(/^(?:data:|https?:)/.test(relative))continue;
   assert(new URL(relative,base).href.startsWith(base),relative);
   assert(fs.statSync(path.join(output,relative)).isFile(),relative);
  }
  for(const file of ['server.mjs','initial-state.json','worker','tests','archive','src','data','package.json','README.md']){
   assert(!fs.existsSync(path.join(output,file)),file);
  }
  for(const file of ['ZXing-browser.txt','ZXing-library.txt','ZXing-text-encoding.txt']){
   assert(fs.existsSync(path.join(output,'licenses',file)),file);
  }
  assert(fs.readFileSync('public/index.html','utf8').includes('data-runtime="server"'));
 }finally{fs.rmSync(output,{recursive:true,force:true});}
});

test('browser data persists locally, detects stale writes and never uses a shared API',async()=>{
 const first=runtime(),second=runtime();
 const put=(api,next,revision)=>api.fetch('api/state',{method:'PUT',body:JSON.stringify({state:next,revision})});
 assert.deepEqual(await(await first.api.fetch('api/state')).json(),{state:null,revision:0});
 assert.equal((await put(first.api,state,0)).status,200);
 assert.deepEqual(await(await first.api.fetch('api/state')).json(),{state,revision:1});
 assert.equal((await put(first.api,{...state,people:6},0)).status,409);
 assert.equal((await put(first.api,{...state,people:6},1)).status,200);
 assert.equal((await(await first.api.fetch('api/state')).json()).state.people,6);
 assert.deepEqual(await(await second.api.fetch('api/state')).json(),{state:null,revision:0});
 assert.equal(first.requests.length,0);
 assert.equal(second.requests.length,0);
 assert(first.description.textContent.includes('utan konto'));
});

test('browser runtime reports blocked storage and invalid data explicitly',async()=>{
 assert.equal((await runtime({blocked:true}).api.fetch('api/state')).status,503);
 const {api}=runtime();
 assert.equal((await api.fetch('api/state',{method:'PUT',body:'invalid'})).status,400);
 assert.equal((await api.fetch('api/state',{method:'PUT',body:JSON.stringify({state:{...state,people:99},revision:0})})).status,400);
 assert.equal((await api.fetch('api/offers')).status,503);
 assert.equal((await api.fetch('api/product?ean=invalid')).status,400);
});

test('local server mode still forwards state requests to its existing backend',async()=>{
 const {api,requests}=runtime({mode:'server'});
 assert(api.isServer);
 await api.fetch('api/state');
 assert.equal(requests[0][0],'api/state');
});
