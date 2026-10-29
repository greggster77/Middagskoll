'use strict';
const MealRuntime=(()=>{
 const isServer=document.currentScript?.getAttribute('data-runtime')==='server';
 const KEY='middagskollen-html-v1';
 const result=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8'}});
 function readLocal(){
  const probe=KEY+':check';localStorage.setItem(probe,'1');localStorage.removeItem(probe);
  const raw=localStorage.getItem(KEY);if(!raw)return{state:null,revision:0};
  const saved=JSON.parse(raw);
  if(!Number.isInteger(saved.revision)||saved.revision<1||!validLocalState(saved.state))throw Error('Sparade val kunde inte läsas.');
  return saved;
 }
 async function localState(options){
  const operation=()=>{
   try{
    const saved=readLocal(),method=options.method||'GET';
    if(method==='GET')return result(saved);
    if(method!=='PUT')return result({error:'Metoden stöds inte'},405);
    if(typeof options.body!=='string'||options.body.length>250000)return result({error:'För mycket data'},413);
    let next;try{next=JSON.parse(options.body);}catch{return result({error:'Ogiltiga uppgifter'},400);}
    if(!validLocalState(next.state)||!Number.isInteger(next.revision)||next.revision<0)return result({error:'Kontrollera uppgifterna'},400);
    if(next.revision!==saved.revision)return result({error:'Appen har ändrats i en annan flik. Hämta senaste sparade val.'},409);
    const revision=saved.revision+1;
    localStorage.setItem(KEY,JSON.stringify({state:next.state,revision}));
    return result({revision});
   }catch{return result({error:'Webbläsaren tillåter inte lokal lagring här, eller sparade data kunde inte läsas.'},503);}
  };
  return typeof navigator!=='undefined'&&navigator.locks?.request?navigator.locks.request(KEY,operation):operation();
 }
 async function request(relative,options={}){
  if(isServer)return fetch(relative,options);
  const url=new URL(relative,'https://middagskollen.invalid/'),pathname=url.pathname;
  if(pathname==='/api/state')return localState(options);
  if(pathname==='/offer-snapshot.json')return result(OFFER_DATA);
  if(pathname==='/api/offers')return result({error:'Aktuella reklamblad kräver den medföljande serverversionen.'},503);
  if(pathname==='/api/product'){
   const ean=url.searchParams.get('ean')||'';
   if(!/^(?:\d{8}|\d{12}|\d{13})$/.test(ean))return result({error:'Ogiltig EAN-kod'},400);
   try{
    const response=await fetch('https://world.openfoodfacts.org/api/v2/product/'+ean+'.json?fields=product_name_sv,product_name,brands,quantity',{signal:options.signal||AbortSignal.timeout(16000),credentials:'omit'});
    const data=await response.json();
    if(!response.ok&&response.status!==404)throw Error();
    const product=data.product||{};
    return result(data.status===1?{found:true,name:product.product_name_sv||product.product_name||'',brand:product.brands||'',quantity:product.quantity||'',ean}:{found:false,ean});
   }catch{return result({error:'Produktsökningen kunde inte nås. Lägg till varan manuellt.'},503);}
  }
  return result({error:'Sidan finns inte'},404);
 }
 const storage=document.getElementById('storage');
 if(storage)storage.textContent=isServer?'Veckoplan, inköpsval, budget och hemmalager sparas på den lokala servern.':'Dina val sparas bara i den här webbläsaren, utan konto eller synkning mellan enheter. Rensad webbläsardata kan ta bort dem. Spara en säkerhetskopia nedan.';
 // The validator below is generated from the same validation as the local server.
 function validLocalState(s){return s&&typeof s==='object'&&['excludeShellfish','excludePork','excludeNuts','excludeEggs','excludeDairy','excludeGluten','excludeSoy','excludeOnion'].every(k=>s[k]===undefined||typeof s[k]==='boolean')&&(s.budget===undefined||Number.isFinite(s.budget)&&s.budget>=0&&s.budget<=50000)&&(s.prices===undefined||s.prices&&typeof s.prices==='object'&&!Array.isArray(s.prices)&&Object.keys(s.prices).length<=5000&&Object.entries(s.prices).every(([k,v])=>k.length<=250&&Number.isFinite(v)&&v>=0&&v<=1000000))&&Number.isInteger(s.people)&&s.people>=1&&s.people<=6&&Number.isInteger(s.boxes)&&s.boxes>=0&&s.boxes<=6&&Array.isArray(s.plan)&&s.plan.length===7&&s.plan.every(id=>Number.isInteger(id)&&id>=0&&id<500)&&Array.isArray(s.pantry)&&s.pantry.length<=1000&&s.pantry.every(x=>typeof x.name==='string'&&x.name.length<=160&&typeof x.key==='string'&&x.key.length<=250&&Number.isFinite(x.amount)&&x.amount>0&&x.amount<=100000);}
 return{isServer,key:KEY,fetch:request};
})();
const mealFetch=(...args)=>MealRuntime.fetch(...args);
