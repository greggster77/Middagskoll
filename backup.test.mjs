import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {test} from 'node:test';

function setup(status=200){
 const nodes={},initial={people:4,boxes:2,plan:[0,1,2,3,4,5,6],budget:1200,prices:{pasta:32},pantry:[],home:{},toBuy:{}};
 const c={state:structuredClone(initial),syncReady:true,conflict:false,dirty:false,saving:false,saveTimer:null,serverRevision:5,DATA:{recipes:Array.from({length:500},()=>({}))},Blob,AbortSignal,Date,URL:{createObjectURL(blob){c.download=blob;return'blob:local'},revokeObjectURL(){}},setTimeout(){},clearTimeout(){},confirm:()=>true,flushSave:async()=>{},normalizeState:s=>structuredClone(s),applyFoodPreferences(){},updateControls(){},render(){},syncMessage(){},document:{createElement(){return{click(){c.clicked=true;}}}},fetch:async(url,options)=>{c.request={url,options};return{ok:status===200,status,json:async()=>({revision:6})};},$:id=>nodes[id]??={hidden:true,textContent:''}};
 vm.createContext(c);vm.runInContext(fs.readFileSync('public/local-backup.js','utf8'),c);return{c,nodes,initial};
}
const file=backup=>({size:1000,text:async()=>JSON.stringify(backup)});

test('backup export includes prices, budget and all current household choices',async()=>{
 const {c,nodes,initial}=setup();await nodes.exportBackup.onclick();
 assert(c.clicked);assert.deepEqual(JSON.parse(await c.download.text()).state,initial);
 c.syncReady=false;c.clicked=false;await nodes.exportBackup.onclick();assert(!c.clicked);
});

test('valid restore saves through the local API with revision and the required header',async()=>{
 const {c,nodes,initial}=setup(),next={...initial,budget:2450,prices:{pasta:49}};
 await nodes.importBackup.onchange({target:{files:[file({app:'middagskollen',version:1,state:next})],value:'backup.json'}});
 assert.equal(c.request.url,'api/state');assert.equal(c.request.options.headers['X-Middagskollen'],'1');
 assert.equal(JSON.parse(c.request.options.body).revision,5);assert.deepEqual(c.state,next);assert.equal(c.serverRevision,6);
});

test('invalid backup and failed or conflicting writes preserve current choices',async()=>{
 for(const status of [400,409,503]){
  const {c,nodes,initial}=setup(status),next={...initial,budget:4321};
  await nodes.importBackup.onchange({target:{files:[file({app:'middagskollen',version:1,state:next})],value:'backup.json'}});
  assert.deepEqual(c.state,initial);assert.equal(c.conflict,status===409);
 }
 const {c,nodes,initial}=setup();await nodes.importBackup.onchange({target:{files:[file({state:{...initial,people:100}})],value:'bad.json'}});assert.equal(c.request,undefined);assert.deepEqual(c.state,initial);
});
