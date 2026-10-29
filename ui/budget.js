'use strict';
const Budget=(()=>{
 const validPrice=p=>typeof p==='number'&&Number.isFinite(p)&&p>=0&&p<=1000000;
 const isIcaAlvangenOffer=offer=>{
  if(!offer||offer.store!=='ica-alv'||typeof offer.name!=='string'||typeof offer.label!=='string')return false;
  if(!(Number.isFinite(offer.unitPrice)&&offer.unitPrice>=0||Number.isFinite(offer.packPrice)&&offer.packPrice>=0))return false;
  try{const source=new URL(offer.source);return source.protocol==='https:'&&source.hostname==='www.ica.se'&&source.pathname.endsWith('-1004553/');}catch{return false;}
 };
 function matchingIcaOffers(items,ingredients,offers,home={}){
  return offers.filter(isIcaAlvangenOffer).map(offer=>({
   offer,
   keys:Object.keys(items).filter(key=>!home[key]&&ingredients[key]&&(items[key]===0||items[key]>0)&&Food.offerMatches(offer.name,ingredients[key]))
  })).filter(match=>match.keys.length);
 }
 function calculate(items,ingredients,s){
  const rows=Object.entries(items).filter(([k])=>s.includeStaples||!isStaple(ingredients[k].name)).map(([key,amount])=>{
   const item=ingredients[key],fixed=amount===0,reference=typeof PriceBook!=='undefined'?PriceBook.lookup(item):null,manual=validPrice(s.prices?.[key]),price=manual?s.prices[key]:!fixed&&!reference?.hint?reference?.value:undefined,need=s.home[key]?0:fixed?1:Food.remaining(s,key,amount),priced=validPrice(price);
   return {key,name:item.name,unit:item.unit,amount,need,price,priced,fixed,reference,manual,extra:false,cost:priced?price*(fixed?1:amount):0,purchase:priced?price*need:0};
  });
  for(const name of new Set(s.extra||[])){const key='extra:'+name,price=s.prices?.[key],priced=validPrice(price);rows.push({key,name,unit:'veckobelopp',amount:1,need:1,price,priced,fixed:true,manual:priced,extra:true,cost:0,purchase:priced?price:0});}
  const automatic=rows.filter(r=>r.priced&&!r.manual&&!r.extra).length;
  const cost=rows.reduce((n,r)=>n+r.cost,0),purchase=rows.reduce((n,r)=>n+r.purchase,0),missing=rows.filter(r=>!r.priced&&!r.extra).length,missingBuy=rows.filter(r=>!r.priced&&r.need>0).length;
  const missingAmounts=rows.filter(r=>!r.priced&&r.need>0&&r.fixed&&!r.extra).length;
  return {rows,cost,purchase,missing,missingBuy,missingAmounts,automatic,remaining:s.budget-purchase,portions:s.people*7+s.boxes*5};
 }
 return {validPrice,calculate,matchingIcaOffers};
})();
function currentOfferSnapshot(){return typeof currentOffers!=='undefined'?currentOffers:OFFER_DATA;}
function neededIngredients(){
 return Object.fromEntries(Object.entries(totals()).filter(([key,amount])=>
  !state.home[key]&&(amount===0||Food.remaining(state,key,amount)>0)
 ));
}
function matchedIcaOffers(){
 const snapshot=currentOfferSnapshot();
 const offers=(snapshot.offers||[]).filter(offer=>(!offer.start||state.shopdate>=offer.start)&&(!offer.end||state.shopdate<=offer.end));
 return Budget.matchingIcaOffers(neededIngredients(),DATA.ingredients,offers);
}
function renderBudgetSummary(){
 const matches=matchedIcaOffers(),covered=new Set(matches.flatMap(match=>match.keys)),total=Object.keys(neededIngredients()).length;
 const snapshot=currentOfferSnapshot(),checked=snapshot.checked||OFFER_DATA.checked;
 const unknownDates=matches.some(match=>!match.offer.end);
 $('budgetSummary').innerHTML=`<div class="budget-heading"><strong>Veckans kostnad kan inte summeras ännu</strong></div><div class="budget-stats"><div><span>Din veckobudget</span><strong>${money(state.budget)}</strong></div><div><span>Varor med ICA-erbjudande</span><strong>${covered.size} av ${total}</strong></div><div><span>Veckans inköp</span><strong aria-label="Inte tillgänglig">—</strong></div></div><p class="muted">Endast matchande erbjudanden från ICA Supermarket Älvängen visas. Övriga priser, egna prisinställningar och Mathem-riktpriser räknas inte in. Underlaget kontrollerades ${escape(checked)}${unknownDates?'; giltighetsdatum saknas för vissa erbjudanden':''}. Kontrollera aktuellt pris och villkor hos ICA. Ingen totalsumma eller jämförelse mot budgeten visas.</p>`;
 $('budgetSummary').classList.remove('over-budget');
 $('budgetShop').textContent='';
}
function renderBudget(){
 const matches=matchedIcaOffers(),snapshot=currentOfferSnapshot(),checked=snapshot.checked||OFFER_DATA.checked;
 const query=Food.norm($('priceSearch').value);
 const keys=new Set(matches.flatMap(match=>match.keys));
 $('priceCount').textContent=`${matches.length} ICA-erbjudanden matchar ${keys.size} varor i veckans inköpslista.`;
 $('priceRows').innerHTML=matches.filter(({offer,keys:matchedKeys})=>!query||Food.norm(offer.name).includes(query)||matchedKeys.some(key=>Food.norm(DATA.ingredients[key].name).includes(query))).map(({offer,keys:matchedKeys})=>{
  const matchedNames=matchedKeys.map(key=>DATA.ingredients[key].name);
  const validity=offer.start&&offer.end?`Gäller ${offer.start}–${offer.end}`:offer.end?`Gäller till ${offer.end}`:'Giltighetsdatum saknas';
  let source='https://www.ica.se/';
  try{const candidate=new URL(offer.source);if(candidate.protocol==='https:'&&candidate.hostname==='www.ica.se')source=candidate.href;}catch{}
  return `<article class="budget-price ica-offer"><div><strong>${escape(offer.name)}</strong><small>Matchar veckans vara${matchedNames.length===1?'':'or'}: ${matchedNames.map(escape).join(', ')}</small><div class="price-source"><span class="price-badge">ICA Supermarket Älvängen · ${escape(offer.label||'Pris saknas')}</span><small>Kontrollerat ${escape(checked)} · ${escape(validity)}. Kontrollera aktuellt pris och villkor.</small>${offer.note?'<small>'+escape(offer.note)+'</small>':''}</div><a href="${escape(source)}" target="_blank" rel="noopener noreferrer">Kontrollera erbjudandet hos ICA</a></div></article>`;
 }).join('')||'<p>Inga ICA-erbjudanden matchar veckans inköpslista.</p>';
 renderBudgetSummary();
}
$('priceSearch').oninput=renderBudget;
$('budgetLimit').addEventListener('input',e=>{if(e.target.value===''||!e.target.checkValidity())return;const n=Number(e.target.value);if(!Number.isFinite(n)||n<0||n>50000)return;state.budget=n;save();renderBudgetSummary();});

render();
