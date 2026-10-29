import fs from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
for(const file of fs.readdirSync('public',{recursive:true}).filter(n=>n.endsWith('.js'))){const result=spawnSync(process.execPath,['--check','public/'+file],{stdio:'inherit'});assert.equal(result.status,0,file);}
for(const file of ['server.mjs','worker/index.js','worker/adapters.js'])assert.equal(spawnSync(process.execPath,['--check',file],{stdio:'inherit'}).status,0,file);
const context={};vm.createContext(context);vm.runInContext(fs.readFileSync('public/data.js','utf8'),context);assert.equal(vm.runInContext('DATA.recipes.length',context),500);
const uiContext={};vm.createContext(uiContext);vm.runInContext(fs.readFileSync('public/ui/data.js','utf8'),uiContext);assert.equal(vm.runInContext('DATA.recipes.length',uiContext),500);
for(const file of ['search.js','budget.js','price-book.js','price-data.js','scanner-lib.js','shopping.js','sync.js','local-backup.js'])assert(fs.existsSync('public/'+file));
assert(!fs.readFileSync('public/phone.js','utf8').includes('getRegistrations'));
console.log('Alla JavaScript-filer är syntaktiskt giltiga. 500 recept samt budget, sökning, priser, kamera, inköpslista och lokal synkning finns med.');
