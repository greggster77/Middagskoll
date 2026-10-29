import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validState} from '../worker/index.js';

const nodes={};
const element=id=>nodes[id]??={
 value:'',innerHTML:'',textContent:'',style:{},dataset:{},hidden:false,
 classList:{toggle(){}},addEventListener(type,listener){this[type]=listener;},
 checkValidity(){return true;},querySelector(){return null;}
};
const context=vm.createContext({
 document:{getElementById:element,addEventListener(){},querySelectorAll(){return[];}},
 Intl,Date,console,URL,Blob,AbortSignal,clearTimeout(){},setTimeout(){},
 mealFetch:async()=>({json:async()=>({offers:[],stores:[]})})
});
for(const name of ['data','offers','shopping','preferences','core','search','app','price-data','price-book','budget']){
 vm.runInContext(fs.readFileSync(`public/ui/${name}.js`,'utf8'),context);
}
const run=source=>vm.runInContext(source,context);
const preferences=run('FoodPreferences'),food=run('Food'),data=run('DATA');
const recipe=(...names)=>({name:'Testmiddag',ingredientFacts:names.map(name=>({name}))});
const cases=[
 ['excludeNuts',['jordnötssmör','mandelspån','cashewnötter','pinjenötter','valnötter'],['nötfärs','muskotnöt','mandelpotatis','kokosmjölk']],
 ['excludeEggs',['ägg','äggulor','äggnudlar','majonnäs'],['äggplanta','äggfri majonnäs','risnudlar']],
 ['excludeDairy',['laktosfri mjölk','Arla Ko® Vispgrädde','parmesanost','crème fraîche','smör','halloumi','kvarg'],['kokosmjölk','kokosgrädde','havremjölk','jordnötssmör','växtbaserad crème fraiche','soya crème fraiche','smörgåskrasse']],
 ['excludeGluten',['vetemjöl','pasta','panko','tortillabröd','bulgur','äggnudlar','japansk soja'],['potatismjöl','risnudlar','glasnudlar','glutenfri pasta','glutenfria lasagneplattor','röd currypasta','tahinipasta','tomatsås för pizza eller pasta']],
 ['excludeSoy',['soja','sojabönor','tamarisoja','tofu','vit misopasta','edamamebönor'],['kokosmjölk','sojafri soja','ris']],
 ['excludeOnion',['gul lök','vitlöksklyfta','purjolök','gräslök','schalottenlöksfond','lökpulver'],['morot','potatis','kål']]
];

for(const [key,excluded,allowed] of cases){
 test(`${key} matches ingredients without confusing similarly named foods`,()=>{
  for(const name of excluded)assert(!preferences.isAllowed(recipe(name),{[key]:true}),name);
  for(const name of allowed)assert(preferences.isAllowed(recipe(name),{[key]:true}),name);
  assert(preferences.isAllowed(recipe(...excluded),{}));
 });
}

test('ingredient alternatives and notes remain visible to the preference filter',()=>{
 assert(!preferences.isAllowed(recipe('glutenfri pasta eller vetemjöl'),{excludeGluten:true}));
 assert(!preferences.isAllowed(recipe('växtbaserad grädde eller smör'),{excludeDairy:true}));
 assert(!preferences.isAllowed({ingredientFacts:[{name:'olja',note:'eller smör'}]},{excludeDairy:true}));
});

test('every new preference filters the real recipe pool and updates locked week meals',()=>{
 for(const {key} of preferences.options){
  const excluded=data.recipes.find(r=>preferences.contains(r,key));
  assert(excluded,key);
  const state={maxFish:7,diet:'Allt',plan:Array(7).fill(excluded.id),keptDays:{0:true},[key]:true};
  const plan=food.allowedPlan(data,state);
  assert(food.planAllowed(data,state,plan),key);
  assert(plan.every(id=>!preferences.contains(data.recipes[id],key)),key);
  const filtered=data.recipes.filter(r=>food.isAllowed(r,state));
  assert(filtered.length>0&&filtered.length<data.recipes.length,key);
  assert(filtered.filter(r=>r.pasta).every(r=>!preferences.contains(r,key)),key);
 }
});

test('changing preferences updates shopping ingredients and rejects an impossible combination',()=>{
 run('state.excludeDairy=false;state.excludeShellfish=false;state.maxFish=7;state.diet="Allt";');
 const dairyRecipe=data.recipes.find(r=>preferences.contains(r,'excludeDairy'));
 run(`state.plan=Array(7).fill(${dairyRecipe.id});state.keptDays={0:true};`);
 assert(run('setFoodPreferences({excludeDairy:true})'));
 assert(run('state.plan.every(id=>Food.isAllowed(DATA.recipes[id],state))'));
 assert(run('Object.keys(shoppingItems()).every(key=>FoodPreferences.isAllowed({name:DATA.ingredients[key].name},state))'));
 const before=run('JSON.stringify(state)');
 run('const originalAllowedPlan=Food.allowedPlan;Food.allowedPlan=()=>Array(7).fill('+dairyRecipe.id+');');
 assert.equal(run('setFoodPreferences({excludeOnion:true})'),false);
 assert.equal(run('JSON.stringify(state)'),before);
 assert(nodes.toast.textContent.includes('Senaste ändringen har inte sparats'));
 run('Food.allowedPlan=originalAllowedPlan;');
});

test('normalization retains new choices and clears them for older backups',()=>{
 const source=fs.readFileSync('public/ui/sync.js','utf8');
 vm.runInContext(source.slice(0,source.indexOf('function updateControls')),context);
 for(const {key} of preferences.options){
  assert(run(`normalizeState({...state,${key}:true}).${key}`),key);
 }
 assert(run('FoodPreferences.options.every(({key})=>normalizeState({people:4,boxes:2,pantry:[],plan:[55,147,3,7,5,9,11]})[key]===false)'));
});

test('server accepts optional boolean preferences and rejects malformed values',()=>{
 const state={people:4,boxes:2,pantry:[],plan:[55,147,3,7,5,9,11]};
 assert(validState(state));
 for(const {key} of preferences.options){
  assert(validState({...state,[key]:true}),key);
  assert(validState({...state,[key]:false}),key);
  for(const invalid of ['true',1,null,{}])assert(!validState({...state,[key]:invalid}),key);
 }
});

test('fish exclusion is separate from the weekly limit and hides the limit control',()=>{
 const html=fs.readFileSync('public/index.html','utf8');
 const select=html.match(/<select id="maxFish">([\s\S]*?)<\/select>/)[1];
 assert(!select.includes('value="0"'));
 for(const value of [1,2,7])assert(select.includes(`value="${value}"`));
 const source=fs.readFileSync('public/ui/studio.js','utf8');
 const summary=source.slice(source.indexOf(' function settingSummary()'),source.indexOf(' function statsHTML()'));
 const nodes={};
 const c=vm.createContext({
  state:{people:4,boxes:2,maxFish:0},FoodPreferences:preferences,lastFishLimit:2,
  $:id=>nodes[id]??={},document:{querySelectorAll:()=>[]}
 });
 vm.runInContext(summary+';settingSummary();',c);
 assert.equal(nodes.excludeFish.checked,true);
 assert.equal(nodes.fishLimitField.hidden,true);
 assert.equal(nodes.maxFish.value,2);
 vm.runInContext('state.maxFish=2;settingSummary();',c);
 assert.equal(nodes.excludeFish.checked,false);
 assert.equal(nodes.fishLimitField.hidden,false);
 assert.equal(nodes.maxFish.value,2);
});

test('paused prices do not appear in week cards or shopping summaries and stored prices remain intact',()=>{
 vm.runInContext(fs.readFileSync('public/ui/layout-model.js','utf8'),context);
 vm.runInContext(fs.readFileSync('public/ui/studio.js','utf8').replace('Studio.mount();',''),context);
 const previous=run('JSON.stringify({budget:state.budget,prices:state.prices})');
 run('Studio.summary();Studio.week();Studio.shop();');
 for(const id of ['weekStats','days','shopping','shopStats','readySummary']){
  assert(!/\bkr\b|kostnad|riktpris|budget|shop-price|meal-cost/i.test(nodes[id].innerHTML+' '+nodes[id].textContent),id);
 }
 assert(nodes.shopping.innerHTML.includes('shop-quantity'));
 assert(nodes.shopStats.innerHTML.includes('ATT HANDLA'));
 assert.equal(run('JSON.stringify({budget:state.budget,prices:state.prices})'),previous);
 run('selectTab("budget");selectTab("deals");');
 assert.equal(run('activeTab'),'plan');
 const html=fs.readFileSync('public/index.html','utf8');
 assert(/data-tab="budget"[^>]*hidden/.test(html));
 assert(/data-tab="deals"[^>]*hidden/.test(html));
});
