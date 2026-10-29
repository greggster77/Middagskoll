'use strict';
const RecipeSearch=(()=>{
 const normalize=s=>String(s||'').toLocaleLowerCase('sv-SE').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
 const expand=s=>{const n=normalize(s);return n+(/(?:^| )(?:notfars|blandfars|flaskfars|hogrevsfars)(?: |$)/.test(n)?' kottfars':'');};
 const cache=new WeakMap();
 function index(r){if(!cache.has(r)){const ingredients=(r.ingredientFacts||[]).map(i=>({name:i.name,text:expand(i.name)}));cache.set(r,{title:normalize(r.name),ingredients,text:expand([r.name,r.cat,r.source,r.pasta?'pasta':'',...ingredients.map(i=>i.name)].join(' '))});}return cache.get(r);}
 const terms=q=>normalize(q).split(' ').filter(Boolean);
 const has=(text,term)=>term==='fars'?text.split(' ').some(w=>w.endsWith('fars')):text.includes(term);
 function matches(r,q){const text=index(r).text;return terms(q).every(t=>has(text,t));}
 function score(r,q){const title=index(r).title,n=normalize(q);return title===n?4:title.startsWith(n)?3:title.includes(n)?2:terms(q).every(t=>has(title,t))?1:0;}
 function find(recipes,q){if(!normalize(q))return recipes.slice();return recipes.filter(r=>matches(r,q)).sort((a,b)=>score(b,q)-score(a,q)||a.id-b.id);}
 function ingredientMatches(r,q){const words=terms(q);if(!words.length||words.every(t=>has(index(r).title,t)))return [];return index(r).ingredients.filter(i=>words.some(t=>has(i.text,t))).slice(0,3).map(i=>i.name);}
 return {normalize,matches,find,ingredientMatches};
})();
