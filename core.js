'use strict';
const Food=(()=>{
 const norm=s=>String(s).toLocaleLowerCase('sv-SE').normalize('NFC').replace(/\([^)]*\)/g,' ').replace(/[^a-zåäöé0-9 ]/g,' ').replace(/\s+/g,' ').trim();
 const groups=n=>/färsk.*pasta|fylld pasta|ravioli|tortellini|tortelloni|cappellacci|girasole|gnocchi/.test(n)?'Kylvaror':/buljong|fond|fisksås/.test(n)?'Skafferi':(meat.test(n)||fish.test(n))?'Kött & fisk':/kyckling|kalkon|kött|färs(?:$| )|bacon|skinka|korv|fläsk|salsiccia|salami|lax|torsk|sej\b|fisk|räkor|musslor/.test(n)?'Kött & fisk':/mjölk|grädde|ost|yoghurt|smör|crème|creme|ägg/.test(n)?'Kylvaror':/tomat|paprika|gurka|sallad|spenat|lök|potatis|morot|broccoli|svamp|citron|zucchini|aubergine|kål|avokado|sparris/.test(n)&&!/kross|puré|pulver|sås|konserv|inlagd|buljong/.test(n)?'Grönt':'Skafferi';
 const shell=/räk(?:a|or)|kräft|hummer|krabba|mussl|ostron|scampi|skaldjur/;
 const fish=/(?:^| )(?:lax|torsk|sej|kolja|tonfisk|sill|strömming|makrill|sardell|sardin|ansjovis|fisk|hälleflundra|rödspätta|röding|gös|öring|abborre|tilapia|pangasius|löjrom|stenbitsrom|forellrom)/;
 const meat=/(?:^| )(?:kött|nötfärs|nötkött|blandfärs|fläsk|sidfläsk|bacon|skink|parmaskinka|falukorv|chorizo|salami|salsiccia|mortadella|pastrami|lamm|korv|oxfilé|entrecôte|högrev|ryggbiff|lövbiff|pancetta|prosciutto|nduja|kalv|hjort|renkött|älg|viltfärs|nötbringa|bresaola|isterband|kabanoss|fransyska|flankstek|biff )/;
 function classify(r){const title=norm(r.name),t=norm(r.name+' '+r.ingredientFacts.map(i=>i.name).join(' '));r.isDinner=!/saft|cheesecake|äppelpaj|scones|kaffe med|^caesardressing|^gul gaspachodressing|^grönsaksbuljong|^chintanbuljong|^klassisk pajdeg|^pajskal|^kryddigt smör|^koka pasta|^french fries|^potatismos|^rotmos|^klyftpotatis|^krispig klyftpotatis|^kornotto|^haricots verts med|^morotsbröd/.test(title);r.shellfish=shell.test(t);r.containsFish=fish.test(t);r.pasta=/pasta|spaghetti|penne|makaron|tagliatelle|fettuccine|tortellini|lasagn|linguine|rigatoni|pappardelle|fusilli|ziti|ravioli|gnocchi/.test(t);
 if(r.shellfish)r.cat='Skaldjur';else if(fish.test(title))r.cat='Fisk';else if(/kyckling|kalkon/.test(title)&&!/vegetarisk kyckling|vegokyckling/.test(title))r.cat='Kyckling';else if(meat.test(t)&&!/sojakorv|vegokorv|vegetarisk korv/.test(t))r.cat='Kött';else if(/kyckling|kalkon|hönsbuljong/.test(t)&&!/vegetarisk kyckling|vegokyckling/.test(t))r.cat='Kyckling';else if(r.containsFish)r.cat='Fisk';else r.cat='Vegetariskt';return r;}
 function ingredient(i){let unit=i.unit||'efter smak',q=i.amount,n=i.name;const factors={g:['kg',.001],kg:['kg',1],ml:['l',.001],cl:['l',.01],dl:['l',.1],l:['l',1],msk:['l',.015],tsk:['l',.005],krm:['l',.001]};if(factors[unit]){const [u,f]=factors[unit];unit=u;if(q!=null)q*=f;}
 const key='food:'+norm(n)+':'+unit;return {key,name:n,unit,amount:q,group:groups(norm(n))};}
 function prepare(data){for(const r of data.recipes){classify(r);const items={};for(const i of r.ingredientFacts){const x=ingredient(i);data.ingredients[x.key]={name:x.name,unit:x.unit,group:x.group};items[x.key]=(items[x.key]||0)+(x.amount==null?0:x.amount*4/r.servings);}items.sallad=.15;items.gurka=.2;r.items=items;}return data;}
 function isAllowed(r,s){return (!s.excludeShellfish||!r.shellfish)&&(s.maxFish>0||!r.containsFish);}
 function needItems(data,s,day=null){const all={};s.plan.forEach((id,d)=>{if(day!==null&&d!==day)return;const p=s.people+(d<5?s.boxes:0);for(const [k,q] of Object.entries(data.recipes[id].items)){all[k]=(all[k]||0)+q*p/4;}});return all;}
 function available(s,key){return (s.pantry||[]).filter(x=>x.key===key).reduce((a,x)=>a+x.amount,0);}
 function remaining(s,key,q){return s.home[key]?0:Math.max(0,q-available(s,key));}
 function eanValid(s){if(!/^\d{8}$|^\d{12}$|^\d{13}$/.test(s))return false;const digits=[...s].map(Number),last=digits.pop();let sum=0;for(let j=digits.length-1,n=0;j>=0;j--,n++)sum+=digits[j]*(n%2===0?3:1);return (10-sum%10)%10===last;}
 function offerMatches(name,item){const a=norm(name),b=norm(item.name);if(/pizza.*kit|pizzakit|färdigrätt/.test(a)&&!b.includes('pizzakit'))return false;
 if(/tomat/.test(b)&&!/kross|konserv|puré|passer|soltork|sås/.test(b)&&/kross|konserv|puré|passer|soltork|sås/.test(a))return false;
 if(/pastavatten|pastasås|currypasta|misopasta/.test(b)&&/pasta|spaghetti|penne/.test(a))return false;
 if(/fylld pasta|ravioli|tortellini|cappellacci|girasole/.test(b)&&!/fylld pasta|ravioli|tortellini|cappellacci|girasole/.test(a))return false;
 const rules=[[/kyckling(?:bröst)?filé|kycklingfilé/,/kyckling(?:bröst)?filé|strimlad kycklingfilé/],[/köttfärs|blandfärs|nötfärs/,/köttfärs|blandfärs|nötfärs/],[/krossade tomater|finkrossade tomater/,/krossade tomater|finkrossade tomater/],[/pasta|penne|spaghetti|makaron|fusilli|tagliatelle/,/pasta|penne|spaghetti|makaron|fusilli|tagliatelle/],[/lax/,/lax/],[/potatis/,/potatis/],[/gurka/,/^gurka$|^gurkor$/],[/sallad/,/isbergssallad|grönsallad|salladsmix|rucola|ruccola/],[/ägg/,/ägg/],[/paprika/,/paprika/],[/grillost|halloumi/,/grillost|halloumi/],[/falukorv/,/falukorv/]];
 for(const [p,t] of rules)if(p.test(b)){if(/pulver|puré|sås|krydda|saltgurka|inlagd|korv/.test(b)&&!p.test(b.replace(/paprikapulver|paprikapuré|saltgurka|kycklingkorv/g,'')))return false;return t.test(a);}
 return a===b||a.includes(b)&&b.length>4;
 }
 return {norm,groups,classify,ingredient,prepare,isAllowed,needItems,available,remaining,eanValid,offerMatches};
})();
Food.prepare(DATA);
