'use strict';
const LayoutModel=(()=>{
 const currency=new Intl.NumberFormat('sv-SE',{style:'currency',currency:'SEK',maximumFractionDigits:0});
 const money=n=>currency.format(Number.isFinite(n)?n:0);
 const tone=r=>({'Vegetariskt':'veg','Kyckling':'chicken','Kött':'meat','Fisk':'fish','Skaldjur':'fish'}[r.cat]||'veg');
 function weekInfo(now=new Date()){
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const start=new Date(today+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-((start.getUTCDay()+6)%7));
  const dates=Array.from({length:7},(_,i)=>{const d=new Date(start);d.setUTCDate(d.getUTCDate()+i);return d;});
  const thursday=new Date(start);thursday.setUTCDate(thursday.getUTCDate()+3);
  const year=thursday.getUTCFullYear(),first=new Date(Date.UTC(year,0,1,12));
  const week=Math.ceil((((thursday-first)/86400000)+1)/7);
  const day=d=>new Intl.DateTimeFormat('sv-SE',{day:'numeric',month:'short',timeZone:'UTC'}).format(d);
  return{week,year,today,dates,label:'VECKA '+week+' · '+day(dates[0])+' – '+day(dates[6]),dayLabel:day,isToday:d=>d.toISOString().slice(0,10)===today};
 }
 function canUse(r,s,day,data){return Food.isAllowed(r,s)&&(r.cat!=='Fisk'||s.plan.filter((id,d)=>d!==day&&data.recipes[id].cat==='Fisk').length<s.maxFish);}
 function mealCost(r,portions,s,data){const items=Object.fromEntries(Object.entries(r.items).map(([k,q])=>[k,q*portions/4]));return Budget.calculate(items,data.ingredients,{...s,home:{},pantry:[],extra:[]});}
 return{money,tone,weekInfo,canUse,mealCost};
})();
