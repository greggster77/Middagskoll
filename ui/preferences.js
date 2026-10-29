'use strict';
const FoodPreferences=(()=>{
 const options=[
  {key:'excludeNuts',label:'Nötter & mandel'},
  {key:'excludeEggs',label:'Ägg'},
  {key:'excludeDairy',label:'Mjölkprodukter'},
  {key:'excludeGluten',label:'Gluten'},
  {key:'excludeSoy',label:'Soja'},
  {key:'excludeOnion',label:'Lök'}
 ];
 const rules={
  excludeNuts:/(?:^| )(?:jordnöt|hasselnöt|valnöt|cashewnöt|pistagenöt|pekannöt|paranöt|macadamia|pinjenöt|sötmandel|bittermandel|mandel(?!potatis)|nötter)(?:\p{L}*|$)/u,
  excludeEggs:/(?:^| )(?:ägg(?:en|et|ula|ulor|vita|vitor|pulver|nudlar)?|majonnäs|aioli)(?: |$)/u,
  excludeDairy:/(?:^| )(?:\p{L}*mjölk|(?:visp|matlagnings|mellan|syrad)?grädde|gräddfil|smör|yoghurt|matyoghurt|kvarg|smetana|kefir|\p{L}*ost|parmesan|pecorino|halloumi|mozzarella|ricotta|burrata|mascarpone|gorgonzola|cheddar|paneer|cream cheese|crème fra[iî]che|creme fraiche)(?: |$)/u,
  excludeGluten:/(?:^| )(?:vete\p{L}*|durum\p{L}*|råg\p{L}*|korn(?:mjöl|gryn|otto)?|dinkel\p{L}*|bulgur|couscous|matvete|mannagryn|\p{L}*bröd\p{L}*|panko\p{L}*|pasta(?:vatten)?|fullkornspasta|spaghetti|spagetti|penne|makaroner|tagliatelle|fettuccine|fettuccini|linguine|rigatoni|fusilli|lasagn\p{L}*|ravioli|tortellini|tortelloni|cappellacci|gnocchi|nudlar|äggnudlar|ramennudlar|snabbnudlar|smördeg|pajdeg|seitan|japansk soja|kinesisk soja)(?: |$)/u,
  excludeSoy:/(?:^| )(?:soja\p{L}*|soya\p{L}*|tamarisoja|tofu|tempeh|edamame\p{L}*|miso\p{L}*)(?: |$)/u,
  excludeOnion:/(?:^| )\p{L}*lök\p{L}*(?: |$)|(?:^| )purjo(?: |$)/u
 };
 function matches(text,key){
  text=String(text).toLocaleLowerCase('sv-SE').normalize('NFC').replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim();
  if(key==='excludeDairy'){
   text=text.replace(/(?:kokos|havre|soja|soya|mandel|ris)(?:mjölk|grädde|yoghurt|smör)\p{L}*/gu,' ')
    .replace(/(?:växtbaserad|vegansk|mjölkfri)\p{L}* (?:(?:crème|creme) fra[iî]che|fraiche|grädde|mjölk|yoghurt|ost|smör)/gu,' ')
    .replace(/soya crème fraiche/gu,' ');
  }
  if(key==='excludeGluten')text=text.replace(/glutenfri\p{L}* (?:\p{L}*bröd\p{L}*|pasta|lasagn\p{L}*|nudlar|mjöl|soja|havregryn)/gu,' ')
   .replace(/för (?:pizza eller )?pasta/gu,' ');
  if(key==='excludeEggs')text=text.replace(/äggfri\p{L}* (?:majonnäs|aioli|nudlar|pasta)/gu,' ');
  if(key==='excludeSoy')text=text.replace(/sojafri\p{L}* (?:soja|sås|tofu)/gu,' ');
  return rules[key].test(text);
 }
 function contains(recipe,key){
  const ingredients=recipe.ingredientFacts?.length?recipe.ingredientFacts:[{name:recipe.name||''}];
  return ingredients.some(i=>matches(i.name+' '+(i.note||''),key));
 }
 function isAllowed(recipe,state){return options.every(({key})=>!state[key]||!contains(recipe,key));}
 return{options,contains,isAllowed};
})();
