'use strict';
function isStaple(name){const n=name.toLocaleLowerCase('sv-SE').replace(/[()]/g,' ').replace(/\s+/g,' ').trim();return /^(?:(?:fint|grovt|finkornigt|finmalet|havssalt|flingsalt|salt|örtsalt)(?: salt)?|(?:nymalen |mald |malen |hel |vit |svart )?(?:svartpeppar|vitpeppar|peppar)|salt och (?:peppar|kryddor)|(?:kallt |varmt |kokande |ljummet )?vatten|(?:neutral |neutral mat|neutral raps|raps|mat)?olja(?: till stekning)?(?: t ex rapsolja)?)$/.test(n);}
function shoppingItems(){return Object.fromEntries(Object.entries(totals()).filter(([k])=>state.includeStaples||!isStaple(DATA.ingredients[k].name)).map(([k,q])=>[k,state.home[k]?q:Food.remaining(state,k,q)]).filter(([k,q])=>q>0||totals()[k]===0));}
function shoppingExport(now=new Date()){
 const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).format(now),title='Inköpslista '+date;
 const entries=Object.entries(shoppingItems()).filter(([k])=>state.toBuy[k]&&!state.home[k]),groups={};
 entries.forEach(([k,q])=>{const item=DATA.ingredients[k],g=item.group||'Övrigt';(groups[g]??=[]).push({name:item.name,quantity:qty(k,q),checked:false});});
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
