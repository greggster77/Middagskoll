'use strict';
let selectedRecipe=null,bankLimit=24,activeTab='plan';
const $=id=>document.getElementById(id), money=n=>new Intl.NumberFormat('sv-SE',{style:'currency',currency:'SEK',minimumFractionDigits:2,maximumFractionDigits:2}).format(n), names=['Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag','Söndag'];
let state={budget:1200,prices:{},people:4,boxes:2,diet:'Allt',excludeShellfish:true,excludePork:false,maxFish:1,pantry:[],plan:[55,147,3,7,5,9,11],home:{},bought:{},toBuy:{},keptDays:{},extra:[],lidlMember:false,shopdate:new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Stockholm"}).format(new Date())};
if(!state.selectionVersion){state.toBuy={...state.bought};state.selectionVersion=1;}
if(!state.keptDays||typeof state.keptDays!=='object')state.keptDays={};
function save(){if(typeof queueSave==='function')queueSave();}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function portions(day){return state.people+(day<5?state.boxes:0);}
function pool(){return DATA.recipes.filter(r=>r.isDinner&&!r.quantityWarning&&Food.isAllowed(r,state)&&Food.matchesCategory(r,state.diet));}
function totals(){return Food.needItems(DATA,state);}
function qty(k,q){let u=DATA.ingredients[k].unit;if(q===0)return 'Mängd enligt originalrecept';return u==='kg'?(q<1?Math.round(q*1000)+' g':Number(q.toFixed(2)).toLocaleString('sv-SE')+' kg'):u==='l'?Number((q*10).toFixed(2)).toLocaleString('sv-SE')+' dl':Number(q.toFixed(2)).toLocaleString('sv-SE')+' '+u;}
function render(){if(typeof Studio!=='undefined'&&Studio.ready){Studio.render();return;}const items=shoppingItems();
$('days').innerHTML=state.plan.map((id,d)=>{let r=DATA.recipes[id],p=portions(d);return `<article class="day"><div class="daytop"><span>${names[d]}</span><span>${p} portioner</span></div><select aria-label="Middag ${names[d]}" data-day="${d}">${DATA.recipes.filter(x=>Food.isAllowed(x,state)).map(x=>`<option value="${x.id}" ${x.id===id?'selected':''}>${escape(x.name)}</option>`).join('')}</select>${r.image?`<img class="mealimage" src="${escape(r.image)}" alt="${escape(r.name)}" loading="lazy">`:''}<div class="meta"><span>${r.cat}${r.isDinner?'':' · Tillbehör/övrigt'}</span><span>◷ ${escape(r.timeLabel||r.time)}</span>${d<5&&state.boxes?`<span>${state.boxes} matlådor</span>`:''}</div><div class="daybottom"><label class="keepmeal"><input type="checkbox" data-keep="${d}" ${state.keptDays[d]?'checked':''}>Behåll</label><button class="secondary" data-recipe="${d}">Recept</button></div></article>`;}).join('');
let groups=[...new Set(Object.keys(items).map(k=>DATA.ingredients[k].group))].sort();
$('shopping').innerHTML=groups.map(g=>`<h3>${g}</h3>`+Object.entries(items).filter(([k])=>DATA.ingredients[k].group===g).map(([k,q])=>`<div class="row ${state.toBuy[k]?'selectedbuy':''}"><div class="item"><strong>${escape(DATA.ingredients[k].name)}</strong><small>${qty(k,q)}</small>${typeof shoppingPrice==='function'?'<small class="shopping-price">'+escape(shoppingPrice(k,q))+'</small>':''}</div><label><input type="checkbox" data-home="${k}" ${state.home[k]?'checked':''}>Har hemma</label><label><input type="checkbox" data-to-buy="${k}" ${state.toBuy[k]?'checked':''} ${state.home[k]?'disabled':''}>Ska köpa</label></div>`).join('')).join('')+(state.extra.length?'<h3>Övrigt – egna varor</h3>':'')+state.extra.map((x,i)=>`<div class="row ${state.toBuy['extra:'+x]?'selectedbuy':''}"><span class="item">${escape(x)}</span><label><input type="checkbox" data-extra-buy="${i}" ${state.toBuy['extra:'+x]?'checked':''}>Ska köpa</label><button class="secondary" data-remove="${i}">Ta bort</button></div>`).join('');
if(typeof renderBudget==='function')renderBudget();renderDeals();renderBank();if(typeof renderPantry==='function')renderPantry();renderPasta();
}
function toast(s){$('toast').textContent=s;$('toast').style.display='block';setTimeout(()=>$('toast').style.display='none',2500);}
['people','boxes','diet'].forEach(k=>{$(k).value=state[k];$(k).addEventListener(k==='diet'?'change':'input',()=>{let el=$(k);if(k!=='diet'){if(!el.checkValidity())return;state[k]=Math.floor(Number(el.value));el.value=state[k];}else {setFoodPreferences({diet:el.value});return;}save();render();});});
function replaceUnlockedMeals(){
 const unlocked=names.map((_,d)=>d).filter(d=>!state.keptDays[d]);if(!unlocked.length){toast('Alla middagar är markerade Behåll. Avmarkera en dag för att byta.');return;}
 const used=new Set(state.plan.filter((_,d)=>state.keptDays[d]));let candidates=pool().map(r=>r.id).filter(id=>!used.has(id));if(!candidates.length){toast('Inga andra recept passar ditt matval. Välj en annan kategori.');return;}
 for(let i=candidates.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
 let fishCount=state.plan.filter((id,d)=>state.keptDays[d]&&DATA.recipes[id].cat==='Fisk').length;unlocked.forEach(d=>{let allowed=candidates.filter(id=>DATA.recipes[id].cat!=='Fisk'||fishCount<state.maxFish);let available=allowed.filter(id=>!used.has(id)&&id!==state.plan[d]);if(!available.length)available=allowed.filter(id=>!used.has(id));if(!available.length)available=allowed;if(!available.length)return;const id=available[0];state.plan[d]=id;if(DATA.recipes[id].cat==='Fisk')fishCount++;used.add(id);});save();render();toast('Nya förslag klara. Markerade middagar är kvar.');
}
$('generate').onclick=replaceUnlockedMeals;
document.addEventListener('change',e=>{const t=e.target;if(t.dataset.keep!==undefined){state.keptDays[+t.dataset.keep]=t.checked;save();return;}if(t.dataset.extraBuy!==undefined){state.toBuy['extra:'+state.extra[+t.dataset.extraBuy]]=t.checked;save();render();return;}if(t.dataset.day!==undefined){if(!canAssign(+t.value,+t.dataset.day)){t.value=state.plan[+t.dataset.day];return;}state.plan[+t.dataset.day]=+t.value;save();render();}if(t.dataset.home){state.home[t.dataset.home]=t.checked;if(t.checked)state.toBuy[t.dataset.home]=false;save();render();}if(t.dataset.toBuy){state.toBuy[t.dataset.toBuy]=t.checked;save();render();}});
document.addEventListener('click',e=>{let t=e.target.closest('button');if(!t)return;if(t.dataset.tab)selectTab(t.dataset.tab);if(t.dataset.recipe!==undefined){let d=+t.dataset.recipe;showRecipe(state.plan[d],portions(d),false);}if(t.dataset.bankRecipe!==undefined){showRecipe(+t.dataset.bankRecipe,state.people,true);}if(t.dataset.remove!==undefined){state.extra.splice(+t.dataset.remove,1);save();render();}});
$('close').onclick=()=>$('recipe').close();$('add').onclick=()=>{let v=$('extra').value.trim().slice(0,100);if(v){state.extra.push(v);$('extra').value='';save();render();}};
$('download').onclick=shareShoppingList;
$('clearShopping').onclick=()=>{state.toBuy={};save();render();toast('Alla Ska köpa-markeringar är rensade.');};
$('includeStaples').checked=!!state.includeStaples;$('includeStaples').onchange=()=>{state.includeStaples=$('includeStaples').checked;save();render();};

let currentOffers={offers:[],stores:OFFER_DATA.stores},dealDay=0,offersLoaded=false;
function renderDeals(){
 const items=Food.needItems(DATA,state,dealDay),date=state.shopdate,matched=currentOffers.offers.filter(o=>FoodPreferences.isAllowed({name:o.name},state)&&(!state.excludePork||Food.isAllowed(Food.meatKinds({name:o.name}),state))&&o.end&&date<=o.end&&(!o.start||date>=o.start)).map(o=>({...o,keys:Object.keys(items).filter(k=>!state.home[k]&&(items[k]===0||Food.remaining(state,k,items[k])>0)&&Food.offerMatches(o.name,DATA.ingredients[k]))})).filter(o=>o.keys.length);
 $('savingsSummary').hidden=true;
 $('dealresults').innerHTML=matched.map(o=>{const store=currentOffers.stores.find(s=>s.id===o.store),member=o.member&&(o.store==='lidl'?!state.lidlMember:!state.icaMember);return `<article class="dealcard"><strong>${escape(store?.name||o.store)}</strong><h4>${escape(o.name)}</h4><strong>${escape(o.label)}</strong><p>${escape(o.pack||'')}<br>Till ${escape(DATA.recipes[state.plan[dealDay]].name)}: ${o.keys.map(k=>escape(DATA.ingredients[k].name)).join(', ')}<br>${o.start?'Gäller '+o.start+'–'+o.end:'Gäller till '+o.end+' · kontrollera startdatum i bladet'}${o.member?' · '+(o.store==='lidl'?'Lidl Plus':'ICA Stammis')+' krävs':''}${member?' (medlemskap ej valt)':''}<br>${escape(o.note||'')}</p><a href="${escape(o.source)}" target="_blank" rel="noopener noreferrer">Öppna erbjudandet</a></article>`;}).join('')||'<p>Inga aktuella matchande erbjudanden hittades för den här middagen. Se butikernas reklamblad nedan.</p>';
 $('storelinks').innerHTML=currentOffers.stores.map(s=>`<div class="storelink"><a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.name)}</a><p class="muted">${escape(s.status||'Öppna butikens aktuella reklamblad.')}</p></div>`).join('');
 $('dealDay').innerHTML=names.map((n,d)=>`<option value="${d}" ${d===dealDay?'selected':''}>${n}: ${escape(DATA.recipes[state.plan[d]].name)}</option>`).join('');
}
async function refreshOffers(){if(typeof MealRuntime!=='undefined'&&!MealRuntime.isServer){$('offersStatus').textContent='Aktuella reklamblad hämtas i serverversionen. Starta den med STARTA_WINDOWS.cmd. Du kan öppna butikernas reklamblad nedan.';renderDeals();return;}const b=$('refreshOffers');b.disabled=true;$('offersStatus').textContent='Hämtar aktuella erbjudanden …';try{const r=await mealFetch('api/offers');if(!r.ok)throw Error();const d=await r.json();if(!Array.isArray(d.offers))throw Error();if(d.offers.length){currentOffers=d;offersLoaded=true;}else {$('offersStatus').textContent='Inga nya prisdata kunde läsas. Visar bara fortfarande giltiga sparade erbjudanden.';renderDeals();return;}$('offersStatus').textContent='Kontrollerat '+new Date(d.checked).toLocaleString('sv-SE')+'. Saknas en butik kan du öppna dess reklamblad nedan.';renderDeals();}catch{$('offersStatus').textContent='Källorna kunde inte nås. Visar bara giltiga sparade erbjudanden. Prova igen.';renderDeals();}finally{b.disabled=false;}}
$('refreshOffers').onclick=refreshOffers;$('dealDay').onchange=()=>{dealDay=Number($('dealDay').value);renderDeals();};
['lidlMember','icaMember'].forEach(k=>{$(k).checked=!!state[k];$(k).onchange=()=>{state[k]=$(k).checked;save();renderDeals();};});$('shopdate').value=state.shopdate;$('shopdate').onchange=()=>{if($('shopdate').value){state.shopdate=$('shopdate').value;save();renderDeals();}};
function showRecipe(id,p,canAssign){
 const r=DATA.recipes[id];selectedRecipe=id;
 $('recipebody').innerHTML=`<span class="eyebrow">${escape(r.cat)} · ${escape(r.source)}</span><h2>${escape(r.name)}</h2>${r.image?`<img class="mealimage" src="${escape(r.image)}" alt="${escape(r.name)}">`:''}<label>Portioner<input id="recipePortions" type="number" min="1" max="12" value="${p}"></label>${r.quantityWarning?'<p class="warning">Källan saknar enhet för en ingrediens. Den skalas inte automatiskt; kontrollera originalet.</p>':''}<p>Grundrecept: ${r.servings} portioner. ${escape(r.timeLabel)}</p><h3>Ingredienser för ${p} portioner</h3><ul>${r.ingredientFacts.map(i=>`<li>${i.amount==null?'Kontrollera mängd i originalet':Number((i.amount*p/r.servings).toFixed(2)).toLocaleString('sv-SE')+' '+escape(i.unit)} ${escape(i.name)}${i.note?' ('+escape(i.note)+')':''}</li>`).join('')}</ul><h3>Tillbehör från Middagskollen</h3><p>${Math.round(.15*p/4*1000)} g grönsallad och ${Math.round(.2*p/4*1000)} g gurka, utöver originalreceptet.</p><a class="originalrecipe" href="${r.url}" target="_blank" rel="noopener noreferrer">Öppna hela receptet hos ${escape(r.source)}</a><button id="saveRecipeSource" class="secondary recipe-note" type="button">Spara recept och källa i Anteckningar</button><p class="muted">Tillagningsbeskrivningen finns hos originalkällan. Kontrollera där även mängder för tillval och alternativa ingredienser. Mängder är skalade matematiskt; styckvaror kan behöva avrundas vid inköp.</p>`;
 $('assignRecipe').hidden=!canAssign;if(!$('recipe').open)$('recipe').showModal();$('recipePortions').onchange=e=>{const v=Number(e.target.value);if(Number.isInteger(v)&&v>=1&&v<=12)showRecipe(id,v,canAssign);};$('saveRecipeSource').onclick=()=>shareRecipeSource(r,p);
}
async function shareRecipeSource(r,p){
 const ingredients=r.ingredientFacts.map(i=>`${i.amount==null?'Mängd enligt originalrecept':Number((i.amount*p/r.servings).toFixed(2)).toLocaleString('sv-SE')+' '+i.unit} ${i.name}${i.note?' ('+i.note+')':''}`);
 const text=[r.name,`${p} portioner`,'',`Källa: ${r.source}`,r.url,'','INGREDIENSER',...ingredients.map(x=>'☐ '+x),'','Tillagning och originalmängder finns via länken ovan.'].join('\n');
 try{if(navigator.share){await navigator.share({title:r.name,text});return;}if(!navigator.clipboard?.writeText)throw Error();await navigator.clipboard.writeText(text);toast('Recept och källa kopierade. Klistra in i Anteckningar.');}
 catch(e){if(e.name!=='AbortError')toast('Kunde inte öppna delningsmenyn. Öppna originalreceptet via länken.');}
}
function renderBank(){
 if(typeof Studio!=='undefined'&&Studio.ready){Studio.bank();return;}
 const query=($('recipeSearch').value||'').trim(),source=$('recipeSource').value||'',cat=$('recipeCategory').value||'';
 const eligible=DATA.recipes.filter(r=>Food.isAllowed(r,state)&&(!source||r.source===source)&&Food.matchesCategory(r,cat));
 const found=RecipeSearch.find(eligible,query),limit=typeof bankLimit==='undefined'?24:bankLimit;
 $('bankcount').textContent=query?found.length+' recept hittades för ”'+query+'”.':found.length+' av '+DATA.recipes.length+' recept';
 $('clearRecipeSearch').hidden=!query;$('clearAppSearch').hidden=!$('appSearch').value;
 $('bankresults').innerHTML=found.slice(0,limit).map(r=>{const matching=RecipeSearch.ingredientMatches(r,query);return `<article class="day"><div class="daytop"><span>${escape(r.cat)}</span><span>${escape(r.source)}</span></div><h3>${escape(r.name)}</h3><div class="meta">${escape(r.timeLabel)} · ${r.servings} grundportioner</div>${matching.length?'<p class="search-match">Ingredienser: '+matching.map(escape).join(', ')+'</p>':''}<button class="secondary" data-bank-recipe="${r.id}">Ingredienser och recept</button></article>`;}).join('')||'<p class="search-empty">Inga recept matchar sökningen och dina matval. Prova en annan rätt eller ingrediens, eller ändra filtren ovan.</p>';
 $('moreRecipes').hidden=found.length<=limit;
}
function showSearchResults(){bankLimit=24;renderBank();$('recipeSearch').blur?.();$('appSearch').blur?.();selectTab('bank');$('bank').scrollIntoView?.({block:'start'});$('bankcount').focus?.({preventScroll:true});}
$('appSearch').oninput=()=>{$('recipeSearch').value=$('appSearch').value;bankLimit=24;renderBank();};
$('appSearchForm').onsubmit=e=>{e.preventDefault();$('recipeSearch').value=$('appSearch').value.trim();$('recipeSource').value='';$('recipeCategory').value='';showSearchResults();};
$('recipeSearchForm').onsubmit=e=>{e.preventDefault();$('appSearch').value=$('recipeSearch').value.trim();showSearchResults();};
$('recipeSearch').oninput=()=>{$('appSearch').value=$('recipeSearch').value;bankLimit=24;renderBank();};
function clearRecipeQuery(){$('appSearch').value='';$('recipeSearch').value='';bankLimit=24;renderBank();}
$('clearAppSearch').onclick=clearRecipeQuery;$('clearRecipeSearch').onclick=clearRecipeQuery;
['recipeSource','recipeCategory'].forEach(k=>$(k).addEventListener('change',()=>{bankLimit=24;renderBank();}));
$('moreRecipes').onclick=()=>{bankLimit+=24;renderBank();};
$('assignButton').onclick=()=>{if(selectedRecipe===null)return;if(!canAssign(selectedRecipe,Number($('assignDay').value)))return;state.plan[Number($('assignDay').value)]=selectedRecipe;save();render();$('recipe').close();toast('Receptet är valt till veckan.');};
renderBank();
function selectTab(tab){activeTab=tab;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));['plan','shop','deals','bank','pasta','pantry','budget'].forEach(k=>$(k).hidden=k!==tab);if(tab==='deals'&&!offersLoaded)refreshOffers();if(typeof Studio!=='undefined'&&Studio.ready)Studio.tabChanged(tab);}
function canAssign(id,day){const r=DATA.recipes[id];if(!Food.isAllowed(r,state)){toast('Receptet passar inte dina matval.');return false;}const fish=state.plan.filter((x,d)=>d!==day&&DATA.recipes[x].cat==='Fisk').length;if(r.cat==='Fisk'&&fish>=state.maxFish){toast('Gränsen för fiskmiddagar är nådd. Ändra matvalet om du vill ha fler.');return false;}return true;}
function updateMeatControls(){
 if(state.excludePork&&state.diet==='Fläskkött')state.diet='Allt';
 $('diet').value=state.diet;$('excludePork').checked=!!state.excludePork;
 for(const id of ['diet','recipeCategory']){const option=$(id).querySelector?.('option[value="Fläskkött"]');if(option)option.disabled=!!state.excludePork;}
 if(state.excludePork&&$('recipeCategory').value==='Fläskkött')$('recipeCategory').value='';
}
function applyFoodPreferences(){
 updateMeatControls();state.plan=Food.allowedPlan(DATA,state);
}
function setFoodPreferences(changes){
 const next={...state,...changes};
 if(next.excludePork&&next.diet==='Fläskkött')next.diet='Allt';
 const plan=Food.allowedPlan(DATA,next);
 if(!Food.planAllowed(DATA,next,plan)){
  $('diet').value=state.diet;$('maxFish').value=state.maxFish;
  for(const key of ['excludeShellfish','excludePork',...FoodPreferences.options.map(o=>o.key)])$(key).checked=!!state[key];
  $('excludeFish').checked=state.maxFish===0;
  toast('Inga middagar passar den kombinationen. Senaste ändringen har inte sparats. Välj färre bortval.');
  return false;
 }
 state={...next,plan};updateMeatControls();save();render();return true;
}
function renderPasta(){if(typeof Studio!=='undefined'&&Studio.ready){Studio.pasta();return;}const q=($('pastaSearch').value||'');const found=RecipeSearch.find(DATA.recipes.filter(r=>r.pasta&&Food.isAllowed(r,state)),q);$('pastaCount').textContent=found.length+' pastarätter';$('pastaresults').innerHTML=found.map(r=>`<article class="day"><div class="daytop">${escape(r.cat)} · ${escape(r.source)}</div><h3>${escape(r.name)}</h3><p>${escape(r.timeLabel)}</p><button class="secondary" data-bank-recipe="${r.id}">Ingredienser och recept</button></article>`).join('');}
['maxFish','excludeShellfish','excludePork',...FoodPreferences.options.map(o=>o.key)].forEach(k=>$(k).onchange=()=>setFoodPreferences({[k]:k==='maxFish'?Number($(k).value):$(k).checked}));
render();

mealFetch('offer-snapshot.json').then(r=>r.json()).then(d=>{if(!offersLoaded){currentOffers=d;renderDeals();$('offersStatus').textContent='Sparade priser, kontrollerade '+new Date(d.checked).toLocaleString('sv-SE')+'. Bara priser med giltigt slutdatum visas.';}}).catch(()=>{});

$('pastaSearch').oninput=renderPasta;
