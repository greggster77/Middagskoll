'use strict';
function isStaple(name){const n=name.toLocaleLowerCase('sv-SE').replace(/[()]/g,' ').replace(/\s+/g,' ').trim();return /^(?:(?:fint|grovt|finkornigt|finmalet|havssalt|flingsalt|salt|örtsalt)(?: salt)?|(?:nymalen |mald |malen |hel |vit |svart )?(?:svartpeppar|vitpeppar|peppar)|salt och (?:peppar|kryddor)|(?:kallt |varmt |kokande |ljummet )?vatten|(?:neutral |neutral mat|neutral raps|raps|mat)?olja(?: till stekning)?(?: t ex rapsolja)?)$/.test(n);}
function isShoppingSpice(name){
 const n=name.toLocaleLowerCase('sv-SE').replace(/\([^)]*\)/g,'').replace(/,\s*(?:nymalen|malen).*$/,'').replace(/ (?:att smaka av med|från kvarnen)$/,'').trim();
 if(/^salt och (?:nymalen |nymald |malen |mald )?(?:svartpeppar|vitpeppar|peppar)$/.test(n))return true;
 if(/^(?:påse |spicy )?(?:taco(?:\s*kryddmix|krydda)|kryddmix taco|kryddmix till enchilada|tikka masala kryddmix|fajita\s+kryddmix)(?: à.*)?$/.test(n))return true;
 return /^(?:(?:finmalen|finmald|grovmalen|grovmald|malen|mald|nymalen|nymald|torkad|torkade|hel|hela|krossad|krossade|stött|lätt krossad|grovt malen|grovkrossad)\s+)*(?:svartpeppar(?:korn)?|vitpeppar(?:korn)?|kryddpeppar(?:korn)?|rosépeppar|grönpeppar|cayennepeppar|kajennpeppar|citronpeppar|paprikapulver|vitlökspulver|lökpulver|spiskummin|kummin|kanel|kardemumma|kryddnejlikor?|gurkmeja|ingefära|oregano|timjan|basilika|rosmarin|dragon|mejram|curry|chiliflakes|chilipulver|pizzakrydda|fyra kryddor)$/.test(n)&&(!/ingefära/.test(n)||/torkad|malen|mald/.test(n));
}
function shoppingName(name){
 let n=name.toLocaleLowerCase('sv-SE').normalize('NFC').replace(/\([^)]*\)/g,' ').replace(/,\s*(?:finrivet skal|finhackad|hackad|finriven|riven|pressad saft|i klyftor|nymalen).*$/,'').replace(/\s+/g,' ').trim();
 n=n.replace(/^(?:(?:finhackad[e]?|hackad[e]?|finriven|finrivna|riven|rivna|pressad|skalad[e]?|skivad[e]?|strimlad[e]?|färdigstrimlad[e]?|liten|stor|ekologisk)\s+)+/,'');
 n=n.replace(/^(?:fryst eller färsk|färsk|fryst) (kyckling(?:bröst)?filé(?:er)?)$/,'$1');
 if(/^(?:vitlök|vitlöksklyfta|vitlöksklyftor)$/.test(n))n='vitlök';
 if(/^(?:körsbärstomat|körsbärstomater)$/.test(n))n='körsbärstomater';
 if(/^(?:citron|citroner|citronskal|skal av (?:\d+(?:\/\d+)? )?citron(?:er)?)$/.test(n))n='citron';
 if(/^(?:kycklingfilé|kycklingfiléer|kycklingbröstfilé|kycklingbröstfiléer|minutfiléer av kyckling)$/.test(n))n='kycklingfilé';
 if(n==='senap dijon')n='dijonsenap';
 const aliases={'tomater':'tomat','gurkor':'gurka','morötter':'morot','gula lökar':'gul lök','röda lökar':'röd lök','potatisar':'potatis'};
 n=aliases[n]||n;
 return n.charAt(0).toLocaleUpperCase('sv-SE')+n.slice(1);
}
function shoppingItems(){const needed=totals();return Object.fromEntries(Object.entries(needed).filter(([k])=>state.includeStaples||!isStaple(DATA.ingredients[k].name)&&!isShoppingSpice(DATA.ingredients[k].name)).map(([k,q])=>[k,state.home[k]?q:Food.remaining(state,k,q)]).filter(([k,q])=>q>0||needed[k]===0));}
function shoppingRows(items=shoppingItems()){
 const groups=new Map();
 for(const [key,amount] of Object.entries(items)){
  const item=DATA.ingredients[key],name=shoppingName(item.name);
  if(!groups.has(name))groups.set(name,{key,keys:[],name,group:item.group,parts:[],home:true,selected:false});
  const row=groups.get(name);
  row.keys.push(key);row.parts.push({key,amount,unit:row.name==='Vitlök'&&/^(?:st|klyfta|klyftor)$/.test(item.unit)?'klyftor':item.unit});
  row.home=row.home&&!!state.home[key];
 }
 return [...groups.values()].map(row=>{
  const amounts=new Map(),parts=row.parts.filter(p=>row.home||!state.home[p.key]);
  row.selected=!row.home&&parts.every(p=>!!state.toBuy[p.key]);
  for(const part of parts){const total=amounts.get(part.unit)||{...part,amount:0};total.amount+=part.amount;amounts.set(part.unit,total);}
  row.quantity=/^(?:dijonsenap|senap|sötstark senap|grovkornig sötstark senap|ketchup|tomatpuré|soja|japansk soja|kinesisk soja|sambal oelek|sriracha|tabasco|vitvinsvinäger|rödvinsvinäger|balsamvinäger)$/i.test(row.name)?'':[...amounts.values()].map(p=>{
   if(p.amount===0)return 'Enligt recept';
   if(p.unit==='klyftor')return Number(p.amount.toFixed(2)).toLocaleString('sv-SE')+' klyftor';
   return qty(p.key,p.amount);
  }).join(' + ');
  return row;
 });
}
function setShoppingChoice(key,kind,checked){
 const row=shoppingRows().find(row=>row.key===key);
 for(const member of row?.keys||[key]){
  if(kind==='home'){state.home[member]=checked;if(checked)state.toBuy[member]=false;}
  else if(!state.home[member])state.toBuy[member]=checked;
 }
}
function shoppingExport(now=new Date()){
 const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).format(now),title='Inköpslista '+date;
 const entries=shoppingRows(Object.fromEntries(Object.entries(shoppingItems()).filter(([k])=>state.toBuy[k]&&!state.home[k]))),groups={};
 entries.forEach(row=>{const g=row.group||'Övrigt';(groups[g]??=[]).push({name:row.name,quantity:row.quantity,checked:false});});
 const extras=state.extra.filter(name=>state.toBuy['extra:'+name]);if(extras.length)groups['Övrigt – egna varor']=extras.map(name=>({name,quantity:'',checked:false}));
 const order=['Grönt','Kött & fisk','Kylvaror','Skafferi','Övriga ingredienser','Övrigt – egna varor'];const categories=Object.keys(groups).sort((a,b)=>(order.includes(a)?order.indexOf(a):99)-(order.includes(b)?order.indexOf(b):99)||a.localeCompare(b,'sv'));
 const lines=[title,''];categories.forEach(g=>{lines.push(g);groups[g].sort((a,b)=>a.name.localeCompare(b.name,'sv')).forEach(x=>lines.push(`${x.checked?'☑':'☐'} ${x.name}${x.quantity?' – '+x.quantity:''}`));lines.push('');});
 const weeklyRecipes=DATA.recipes&&Array.isArray(state.plan)?[...new Set(state.plan)].map(id=>DATA.recipes[id]).filter(Boolean):[];
 if(weeklyRecipes.length){lines.push('VECKANS RECEPT OCH KÄLLOR');weeklyRecipes.forEach(r=>lines.push(`${r.name}\nKälla: ${r.source}\n${r.url}`));lines.push('');}
 if(!categories.length)lines.push('Inga varor att handla.');return {title,text:lines.join('\n').trim(),count:entries.length+extras.length};
}
let currentShoppingExport=null;
function openShoppingExport(message=''){currentShoppingExport=shoppingExport();$('exportTitle').textContent=currentShoppingExport.title;$('exportText').value=currentShoppingExport.text;$('exportStatus').textContent=message;$('shareAgain').hidden=!navigator.share;if(!$('exportList').open)$('exportList').showModal();}
async function shareShoppingList(){const payload=shoppingExport();if(!payload.count){toast('Markera minst en vara med Ska köpa först.');return;}if(!navigator.share){openShoppingExport('Telefonens delningsmeny stöds inte här. Kopiera listan eller ladda ned textfilen.');return;}try{await navigator.share({title:payload.title,text:payload.text});toast('Listan har delats till vald app.');}catch(e){if(e.name==='AbortError')return;openShoppingExport('Delningen kunde inte öppnas. Kopiera listan eller ladda ned textfilen.');}}
function setupShoppingExport(){const $=id=>document.getElementById(id);
 $('shareAgain').onclick=shareShoppingList;
 $('copyList').onclick=async()=>{const payload=currentShoppingExport||shoppingExport();try{if(!navigator.clipboard?.writeText)throw new Error();await navigator.clipboard.writeText(payload.text);$('exportStatus').textContent='Listan är kopierad. Klistra in den i din anteckningsapp.';}catch{$('exportText').focus();$('exportText').select();$('exportStatus').textContent='Markera och kopiera texten ovan, och klistra in den i din anteckningsapp.';}};
 $('saveListFile').onclick=()=>{const payload=currentShoppingExport||shoppingExport(),a=document.createElement('a'),url=URL.createObjectURL(new Blob(['\uFEFF'+payload.text],{type:'text/plain;charset=utf-8'}));a.href=url;a.download=payload.title+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('exportStatus').textContent='Textfilen har skickats till telefonens nedladdningar.';};$('closeExport').onclick=()=>$('exportList').close();
}
setupShoppingExport();
