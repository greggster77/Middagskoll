'use strict';
const Studio=(()=>{
 const icon=n=>'<svg class="icon" aria-hidden="true"><use href="#i-'+n+'"></use></svg>';
 const shortMoney=LayoutModel.money;
 let pickerDay=0,activeDay=null,lastFishLimit=1;
 const labels={plan:['','Veckans middagar','Sju middagar som passar er, med färdig inköpslista och koll på matbudgeten.'],bank:['RECEPTBANK','Alla rätter','500 recept med ingredienser och riktpriser. Sök, filtrera och lägg det du gillar i veckan.'],shop:['','Inköpslista','Allt som veckans middagar kräver, sammanslaget och sorterat efter butiksdel.'],budget:['MATBUDGET','Budget och varupriser','Koll på veckans kostnad, dina riktpriser och vad du redan har hemma.'],deals:['DINA BUTIKER','Erbjudanden','Relevanta erbjudanden till middagen du har valt.'],pasta:['RECEPTBANK','Pasta','Hitta en ny pastafavorit och lägg till den i veckoplanen.'],pantry:['HEMMALAGER','Vad finns hemma?','Håll koll på ditt lager och handla det som faktiskt behövs.']};
 function badge(r){return '<span class="category-badge cat-'+LayoutModel.tone(r)+'">'+escape(r.cat)+'</span>';}
 function tabChanged(tab){
  const l=labels[tab]||labels.plan,w=LayoutModel.weekInfo();
  $('pageEyebrow').textContent=l[0]||w.label;$('pageTitle').textContent=l[1];$('pageDescription').textContent=l[2];
  $('planActions').hidden=tab!=='plan';$('shopActions').hidden=tab!=='shop';
  $('moreMenu').open=false;
  document.querySelectorAll('[data-tab]').forEach(el=>{if(el.classList.contains('nav-item'))el.setAttribute('aria-current',el.dataset.tab===tab?'page':'false');});
  summary();if(tab==='plan')week();if(tab==='shop')shop();if(tab==='bank')bank();window.scrollTo(0,0);
 }
 function settingSummary(){
  const choices=[];if(state.excludeShellfish)choices.push('Skaldjur');if(state.excludePork)choices.push('Fläskkött');if(state.maxFish===0)choices.push('Fisk');
  for(const {key,label} of FoodPreferences.options){$(key).checked=!!state[key];if(state[key])choices.push(label);}
  $('avoidSummary').textContent=choices.length===0?'Inget':choices.length===1?choices[0]:choices.length+' valda';
  $('excludeFish').checked=state.maxFish===0;
  $('fishLimitField').hidden=state.maxFish===0;
  $('maxFish').value=state.maxFish||lastFishLimit;
  $('peopleHelp').textContent=(state.people*7+state.boxes*5)+' portioner totalt';
  for(const el of document.querySelectorAll('[data-step-target]')){const input=$(el.dataset.stepTarget),v=Number(input.value)+Number(el.dataset.step);el.disabled=v<Number(input.min)||v>Number(input.max);}
 }
 function statsHTML(){
  const b=budgetResult(),count=Object.entries(shoppingItems()).filter(([k])=>!state.home[k]).length+state.extra.length;
  const percentage=state.budget>0?Math.round(b.purchase/state.budget*100):b.purchase>0?null:0;
  return '<article class="stat-card"><span class="stat-label">'+(b.missingBuy?'UPPSKATTAD DELKOSTNAD':'UPPSKATTAD KOSTNAD')+'</span><strong>'+shortMoney(b.purchase)+'</strong><small>'+count+' varor att handla'+(b.missingBuy?' · '+b.missingBuy+' utan komplett prisunderlag':'')+'</small></article>'+
   '<article class="stat-card"><span class="stat-label">PER PORTION'+(b.missing?' · DELKOSTNAD':'')+'</span><strong>'+shortMoney(b.cost/Math.max(1,b.portions))+'</strong><small>'+b.portions+' portioner i veckan</small></article>'+
   '<article class="stat-card"><span class="stat-label">VECKOBUDGET</span><strong>'+shortMoney(state.budget)+'</strong><small>'+shortMoney(Math.abs(b.remaining))+(b.remaining<0?' över budget':' kvar')+'</small></article>'+
   '<article class="stat-card budget-meter '+(b.remaining<0?'is-over':'')+'"><div><span class="stat-label">MOT BUDGET'+(b.missingBuy?' · HITTILLS':'')+'</span><b>'+(percentage===null?'—':percentage+'%')+'</b></div><progress max="100" value="'+Math.max(0,Math.min(100,percentage??100))+'" aria-label="Uppskattad inköpskostnad mot budget"></progress><small>'+(b.remaining<0?'Över med ':'Plats för ')+shortMoney(Math.abs(b.remaining))+(b.remaining>=0?' till':'')+'</small></article>';
 }
 function summary(){
  const b=budgetResult(),html=statsHTML();$('weekStats').innerHTML=html;$('budgetSummary').innerHTML='<div class="stats-grid">'+html+'</div>';
  $('budgetShop').textContent=(b.missingBuy?'Ofullständig uppskattning: ':'Uppskattat inköp: ')+shortMoney(b.purchase)+(b.missingBuy?' · '+b.missingBuy+' poster saknar komplett prisunderlag.':'')+' Hemmalagret är avdraget. Hela förpackningar kan kosta mer.';
  const count=Object.keys(shoppingItems()).filter(k=>!state.home[k]).length+state.extra.length;
  $('readySummary').textContent=count+' varor · '+(b.missingBuy?'uppskattad delkostnad ':'uppskattat ')+shortMoney(b.purchase);
  settingSummary();
 }
 function week(){
  const w=LayoutModel.weekInfo();
  $('weekStrip').innerHTML=state.plan.map((id,d)=>{const r=DATA.recipes[id];return '<button type="button" class="week-day '+(activeDay===d||activeDay===null&&w.isToday(w.dates[d])?'is-current':'')+'" data-picker="'+d+'" aria-label="Byt middag '+names[d]+'"><span>'+names[d].slice(0,3).toLocaleUpperCase('sv-SE')+'</span><small class="cat-'+LayoutModel.tone(r)+'">'+escape(r.cat)+'</small></button>';}).join('');
  $('days').innerHTML=state.plan.map((id,d)=>{
   const r=DATA.recipes[id],cost=LayoutModel.mealCost(r,portions(d),state,DATA),today=w.isToday(w.dates[d]);
   return '<article class="day meal-card cat-'+LayoutModel.tone(r)+(today?' is-today':'')+'" id="mealDay'+d+'"><div class="meal-date"><span>'+names[d].toLocaleUpperCase('sv-SE')+'</span><time datetime="'+w.dates[d].toISOString().slice(0,10)+'">'+w.dayLabel(w.dates[d])+'</time>'+(today?'<b>IDAG</b>':'')+'</div><button type="button" class="meal-title" data-recipe="'+d+'"><h3>'+escape(r.name)+'</h3></button><div class="meal-meta">'+badge(r)+'<span>'+icon('users')+portions(d)+' port.</span><span>'+icon('clock')+escape(r.timeLabel||r.time)+'</span><span class="meal-cost" title="'+(cost.missing?cost.missing+' ingredienser saknar beräknad kostnad':'Uppskattat från riktpriser och egna priser')+'">'+shortMoney(cost.cost)+(cost.missing?' · delkostnad':'')+'</span></div><div class="meal-actions"><button type="button" class="icon-button" data-refresh-day="'+d+'" aria-label="Föreslå annan middag '+names[d]+'" '+(state.keptDays[d]?'disabled':'')+'>'+icon('refresh')+'</button><button type="button" class="icon-button" data-picker="'+d+'" aria-label="Välj middag '+names[d]+'">'+icon('search')+'</button></div><label class="keepmeal"><input type="checkbox" data-keep="'+d+'" '+(state.keptDays[d]?'checked':'')+'>Behåll</label></article>';
  }).join('');
 }
 function bankCards(found){return found.map(r=>'<article class="recipe-card"><button type="button" class="recipe-open" data-bank-recipe="'+r.id+'">'+badge(r)+'<h3>'+escape(r.name)+'</h3><p class="recipe-facts">'+r.servings+' portion'+(r.servings===1?'':'er')+' · '+escape(r.timeLabel||r.time)+' · '+r.ingredientFacts.length+' ingredienser</p><p class="ingredient-preview">'+r.ingredientFacts.slice(0,4).map(i=>escape(i.name)).join(', ')+'</p><span class="sr-only">Öppna ingredienser och originalrecept från '+escape(r.source)+'</span></button></article>').join('');}
 function bank(){
  const query=$('recipeSearch').value.trim(),source=$('recipeSource').value,category=$('recipeCategory').value;
  const eligible=DATA.recipes.filter(r=>Food.isAllowed(r,state)&&(!$('dinnerOnly').checked||r.isDinner)&&(!source||r.source===source)&&Food.matchesCategory(r,category));
  const found=RecipeSearch.find(eligible,query);
  $('bankcount').textContent=query?found.length+' recept hittades för ”'+query+'”.':found.length+' rätter matchar';
  $('bankresults').innerHTML=bankCards(found.slice(0,bankLimit))||'<p class="empty-state">Inga recept matchar sökningen och dina matval. Prova ett annat ord eller ändra filtren.</p>';
  $('moreRecipes').hidden=found.length<=bankLimit;$('clearRecipeSearch').hidden=!query;$('clearAppSearch').hidden=!query;
  for(const el of document.querySelectorAll('[data-bank-category]')){const active=el.dataset.bankCategory===category;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));el.disabled=state.excludePork&&el.dataset.bankCategory==='Fläskkött';}
 }
 function pasta(){const found=RecipeSearch.find(DATA.recipes.filter(r=>r.pasta&&Food.isAllowed(r,state)),$('pastaSearch').value);$('pastaCount').textContent=found.length+' pastarätter';$('pastaresults').innerHTML=bankCards(found)||'<p class="empty-state">Inga pastarätter matchar dina matval.</p>';}
 function shop(){
  const items=shoppingItems(),rows=budgetResult().rows,byKey=new Map(rows.map(r=>[r.key,r]));
  const entries=Object.entries(items),groups=[...new Set(entries.map(([k])=>DATA.ingredients[k].group))];
  const order=['Grönt','Kött & fisk','Kylvaror','Skafferi'];groups.sort((a,b)=>(order.indexOf(a)<0?99:order.indexOf(a))-(order.indexOf(b)<0?99:order.indexOf(b)));
  const row=(key,name,quantity,extraIndex=null)=>{const home=!!state.home[key],selected=!!state.toBuy[key],data=byKey.get(key),amount=data?.priced?shortMoney(data.purchase):'—';return '<div class="row shop-row '+(selected?'selectedbuy ':'')+(home?'is-home':'')+'"><label class="buy-check"><input type="checkbox" '+(extraIndex===null?'data-to-buy="'+escape(key)+'"':'data-extra-buy="'+extraIndex+'"')+' '+(selected?'checked':'')+' '+(home?'disabled':'')+'><span class="sr-only">Ska köpa '+escape(name)+'</span></label><div class="item"><strong>'+escape(name)+'</strong></div><span class="shop-quantity">'+escape(quantity)+'</span><span class="shop-price" title="'+(data?.priced?'Uppskattat från riktpris eller eget pris':'Pris eller mängd saknas')+'">'+(home?'Hemma':amount)+'</span>'+(extraIndex===null?'<label class="home-choice '+(home?'is-active':'')+'"><input type="checkbox" data-home="'+escape(key)+'" '+(home?'checked':'')+'><span class="sr-only">Har hemma '+escape(name)+'</span>'+icon('home')+'</label>':'<button type="button" class="icon-button" data-remove="'+extraIndex+'" aria-label="Ta bort '+escape(name)+'">'+icon('trash')+'</button>')+'</div>';};
  $('shopping').innerHTML=groups.map((g,i)=>{const group=entries.filter(([k])=>DATA.ingredients[k].group===g).sort(([a],[b])=>DATA.ingredients[a].name.localeCompare(DATA.ingredients[b].name,'sv'));return '<section class="shopping-category"><div class="category-head"><h3>'+escape(g==='Grönt'?'Grönt & frukt':g)+'</h3><span>'+group.length+' varor</span></div>'+group.map(([k,q])=>row(k,DATA.ingredients[k].name,q===0?'Enligt recept':qty(k,q))).join('')+'</section>';}).join('')+(state.extra.length?'<section class="shopping-category"><div class="category-head"><h3>Övrigt – egna varor</h3><span>'+state.extra.length+' varor</span></div>'+state.extra.map((name,i)=>row('extra:'+name,name,'',i)).join('')+'</section>':'');
  const available=entries.filter(([k])=>!state.home[k]).map(([k])=>k).concat(state.extra.map(n=>'extra:'+n)),selected=available.filter(k=>state.toBuy[k]).length;
  const percentage=available.length?Math.round(selected/available.length*100):0;
  $('shopStats').innerHTML='<article class="stat-card"><span class="stat-label">ATT HANDLA</span><strong>'+available.length+' varor</strong><small>'+selected+' markerade till delning</small></article><article class="stat-card"><span class="stat-label">UPPSKATTAD '+(budgetResult().missingBuy?'DELKOSTNAD':'KOSTNAD')+'</span><strong>'+shortMoney(budgetResult().purchase)+'</strong><small>Alla varor att handla</small></article><article class="stat-card"><span class="stat-label">VALDA TILL INKÖPSLISTAN</span><progress max="100" value="'+percentage+'" aria-label="Andel varor markerade till delning"></progress><small>'+percentage+'% markerat</small></article>';
 }
 function render(){week();shop();renderBudget();renderDeals();bank();pasta();if(typeof renderPantry==='function')renderPantry();}
 function picker(){const query=$('pickerSearch').value;const found=RecipeSearch.find(DATA.recipes.filter(r=>r.isDinner&&LayoutModel.canUse(r,state,pickerDay,DATA)),query);$('pickerCount').textContent=found.length+' tillgängliga middagar';$('pickerResults').innerHTML=found.map(r=>'<button type="button" class="picker-option" data-pick-recipe="'+r.id+'">'+badge(r)+'<span>'+escape(r.name)+'</span>'+icon('arrow')+'</button>').join('')||'<p>Inga middagar matchar. Prova en annan sökning eller ändra matvalen.</p>';}
 function openPicker(day){pickerDay=day;activeDay=day;$('pickerTitle').textContent=names[day]+' – välj middag';$('pickerSearch').value='';picker();week();$('dayPicker').showModal();$('pickerSearch').focus();}
 function refreshDay(day){if(state.keptDays[day]){toast('Middagen är markerad Behåll. Avmarkera för att byta.');return;}const options=pool().filter(r=>r.id!==state.plan[day]&&LayoutModel.canUse(r,state,day,DATA));const unique=options.filter(r=>!state.plan.includes(r.id)),choices=unique.length?unique:options;if(!choices.length){toast('Inga andra middagar passar dina matval.');return;}state.plan[day]=choices[Math.floor(Math.random()*choices.length)].id;save();render();toast('Ny middag för '+names[day].toLocaleLowerCase('sv-SE')+'.');}
 function mount(){
  document.addEventListener('click',e=>{const button=e.target.closest('button');if(!button)return;
   if(button.dataset.stepTarget){const input=$(button.dataset.stepTarget),next=Number(input.value)+Number(button.dataset.step);if(next>=Number(input.min)&&next<=Number(input.max)){input.value=next;input.dispatchEvent(new Event('input',{bubbles:true}));}}
   if(button.dataset.picker!==undefined)openPicker(Number(button.dataset.picker));
   if(button.dataset.refreshDay!==undefined)refreshDay(Number(button.dataset.refreshDay));
   if(button.dataset.bankCategory!==undefined){$('recipeCategory').value=button.dataset.bankCategory;bankLimit=24;bank();}
   if(button.dataset.pickRecipe!==undefined){const id=Number(button.dataset.pickRecipe);if(canAssign(id,pickerDay)){state.plan[pickerDay]=id;save();render();$('dayPicker').close();toast('Middagen är uppdaterad.');}}
  });
  document.addEventListener('change',e=>{if(e.target.dataset.keep!==undefined)week();});
  document.addEventListener('click',e=>{for(const id of ['moreMenu','avoidMenu']){const menu=$(id);if(menu.open&&!menu.contains(e.target))menu.open=false;}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('moreMenu').open=false;$('avoidMenu').open=false;}});
  $('excludeFish').onchange=()=>{if($('excludeFish').checked&&state.maxFish>0)lastFishLimit=state.maxFish;setFoodPreferences({maxFish:$('excludeFish').checked?0:lastFishLimit||1});};
  $('dinnerOnly').onchange=()=>{bankLimit=24;bank();};$('pickerSearch').oninput=picker;$('closePicker').onclick=()=>$('dayPicker').close();
  $('selectAllShopping').onclick=()=>{for(const k of Object.keys(shoppingItems()))if(!state.home[k])state.toBuy[k]=true;for(const name of state.extra)state.toBuy['extra:'+name]=true;save();render();};
  $('extraForm').onsubmit=e=>{e.preventDefault();$('add').click();};
  document.addEventListener('click',e=>{if(e.target.closest('#openScanner'))$('moreMenu').open=false;});
  render();tabChanged(activeTab);
 }
 return{ready:true,mount,render,summary,week,bank,pasta,shop,tabChanged,openPicker,refreshDay};
})();
Studio.mount();
