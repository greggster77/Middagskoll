'use strict';
const PriceBook=(()=>{
 const norm=s=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
 // Each rule points to a real reference product. Conversion weights are explicit
 // planning assumptions, never assertions about a particular purchased package.
 const rules=[
 ['filledPasta',/fylld pasta|ravioli|tortellini|tortelloni|cappellacci|girasole/,null,null,.125],['gnocchi',/gnocchi/,null,null,.125],
 ['cheeseSauce',/ostsas/],['tabasco',/tabasco/],['scanGratin',/scan potatisgratang/],['gratin',/potatisgratang/],['apple',/apple|applen/,null,.15],['lemon',/^(?:ekologisk |stor |liten )?citron(?:er)?(?: |$)/,null,.35],['lime',/limefrukt|^lime$|lime skalet/,null,.094],['avocado',/avokado/,null,.167],['redCabbage',/rodkal/,null,1.3],['whiteCabbage',/vitkal/,null,1.1],['blackKale',/svartkal/],['kale',/gronkal/],['cauliflower',/blomkal/,null,.5],['fennel',/fankal/,null,.5],['pakChoi',/pak choi/,null,.25],['mushroom',/champinjon|skogschampinjon/],['frozenSpinach',/fryst.*spenat/,.15],
  ['tomatoPaste',/tomatpure/,1],['cannedTomato',/krossade tomat|finkrossade tomat|konserverade.*tomat|hela.*tomat/,1],['passata',/passerade tomat/,1],['sunTomato',/soltork.*tomat/,1],['pastaSauce',/pastasas|tomatsas/,1],
  ['paprikaSpice',/paprikapulver|paprikakrydda|rokt paprika|smoked paprika/,.52],['taco',/taco.*krydd|krydd.*taco/,.5],['blackPepper',/svartpeppar|vitpeppar|^peppar$/,.5],
  ['vealStock',/kalvfond/,1],['chickenStock',/kycklingfond/,1],['beefStock',/oxfond/,1],['vegStock',/gronsaksfond/,1],
  ['chickenCube',/kycklingbuljong|honsbuljong/,null,null,null,'broth'],['vegCube',/gronsaksbuljong/,null,null,null,'broth'],['beefCube',/kottbuljong/,null,null,null,'broth'],
  ['balsamic',/balsamvinager|balsamicovinager|balsamico/],['whiteVinegar',/vitvinsvinager/],['redVinegar',/rodvinsvinager/],['ciderVinegar',/appelcidervinager/],['oliveOil',/olivolja|jungfruolja/],['rapeOil',/rapsolja|matolja|neutral.*olja|^olja$|frityrolja/],
  ['coconutCream',/kokosgradde/],['coconutMilk',/kokosmjolk/],['creamCheese',/cream cheese|farskost|ricotta|mascarpone/,1],['cremeFraiche',/creme fraiche|cr me fraiche|creme fraiche/,1],['sourCream',/graddfil/,1],['cookingCream',/matlagningsgradde|matgradde|mellangradde/],['cream',/vispgradde|^gradde$/],['milk',/mjolk/],['yoghurt',/yoghurt|yogurt/,1],['butter',/smor|margarin/,.95,null,null],
  ['parmesan',/parmesan|parmigiano|grana padano|pecorino/,.4],['mozzarella',/mozzarella|burrata/,.4,.125],['halloumi',/halloumi|grillost|grilloumi|paneer/,1,.2],['feta',/fetaost|feta |vitost|salladsost/,1,.15],['blueCheese',/adelost|gorgonzola|stilton/,.4],['gratedCheese',/riven.*ost|cheddar|riven arla|riven kvibille/,.4],['hardCheese',/herrgard|prastost|^ost$|lagrad ost/,.4],
  ['egg',/aggula|aggulor|^agg$|vispat agg|hardkokt agg|normalstora agg/],
  ['chickenMince',/kycklingfars/],['chickenThigh',/kycklinglar/ ,null,.15],['chickenFrozen',/fryst.*kycklingfile/,null,.15],['chicken',/kyckling.*file|file.*kyckling|minutfile|kycklingbrost/,null,.15],
  ['salsiccia',/salsiccia/],['bacon',/bacon|sidflask|pancetta/,null,.015],['ham',/skinka|skink/ ,null,.02],['salami',/salami|mortadella|pastrami/,null,.015],['porkMince',/blandfars|flaskfars/],['beefMince',/notfars|kottfars/],['porkLoin',/flaskytterfile/,null,.6],['pork',/flaskfile/,null,.5],['game',/viltfars|algfars|hjortfars/],['beef',/ryggbiff|oxfile|lovbiff|hogrev|flankstek|notkott/],['sausage',/korv|chorizo|isterband|kabanoss/,null,.1],
  ['smokedSalmon',/kallrokt.*lax|varmrokt.*lax|gravad.*lax/],['frozenSalmon',/fryst.*lax/],['freshSalmon',/lax/,null,.15],['cod',/torsk|kolja/,null,.15],['whiteFish',/sej|vit fisk|fiskfile/,null,.15],
  ['fullPasta',/fullkornspasta|fullkorn.*spaghetti|spaghetti.*fullkorn/,.4,null,.1],['pasta',/pasta|spaghetti|penne|makaron|fusilli|tagliatelle|linguine|lasagne|lasagn|pappardelle|fettuccine|rigatoni|ziti/,.4,.02,.1],
  ['risotto',/risottoris|arborio|carnaroli/,.8,null,.075],['couscous',/couscous/,.7,null,.075],['bulgur',/bulgur/,.8,null,.075],['rice',/ris |ris$|jasminris|basmatiris|fullkornsris/,.8,null,.075],
  ['kidney',/kidney/,.7],['blackBeans',/svarta bonor|svart bona/,.7],['whiteBeans',/vita bonor/,.7],['beans',/kikart|kokta bonor|blandade bonor/,.7],['corn',/majskorn|^majs$|fryst majs|burk majs/,.7],
  ['dijon',/dijon/,1],['mustard',/senap/,1],['salsa',/tacosas|salsa/,1],['nachos',/nachochips|tortilla chips|majschips/],['tortilla',/tortillabrod/,null,.04],
  ['peas',/grona artor|grona arter|frysta artor|frysta arter/,.7],['sweetPotato',/sotpotatis/,null,.25],['delicatePotato',/delikatesspotatis|farskpotatis|mandelpotatis/,null,.1],['potato',/potatis/,null,.15],['shallot',/schalotten/,null,.035],['garlic',/vitlok/,null,.005],['redOnion',/rodlok|roda lok|rod lok/,null,.09],['leek',/purjolok/,null,.285],['springOnion',/salladslok|varlok|knipplok/,null,.02],['onion',/gul lok|gula lok|^lok$/ ,null,.2],
  ['carrot',/morot|morotter/,null,.1],['cucumber',/^gurka$|^gurkor$/ ,null,.27],['paprika',/paprika|paprikor/,null,.25],['tomato',/tomat/,null,.1],['broccoli',/broccoli/,null,.25],['sugarSnap',/sugar snaps|sockerart/],['greenBean',/haricots verts/],['spinach',/spenat/,.15],['rocket',/rucola|ruccola/,.1],['iceberg',/isbergssallad/,null,.415],['romaine',/romansallad/,null,.18],['mache',/machesallad|m che/],['salad',/gronsallad|salladsmix|blandsallad|^sallad$/ ,null,.2],
  ['basil',/basilika/,.04],['parsley',/persilja/,.04],['dill',/dill/,.04],['thyme',/timjan/,.04],['coriander',/koriander/,.04],['rosemary',/rosmarin/,.04],['chives',/graslok/,.04],['mint',/mynta/,.04],
  ['honey',/honung/,1.2],['jam',/lingonsylt|rarorda lingon/,1],['bakingPowder',/bakpulver/,1],['vanillaSugar',/vaniljsocker/,.6],['freshYeast',/farsk jast|^jast$/],['roll',/bagel|fralla|hamburgerbrod|pitabrod/,null,.07],['bread',/brod/,null,.035]
 ];
 function match(item){const name=norm(item.name).replace(/\([^)]*\)/g,' ').split(/\s+eller\s+/)[0];if(/pastavatten|fiskbuljong|fiskfond|saltgurka|inlagd.*gurka|fiskpinnar|potatismjol|potatismos|strobrod|gronpeppar|lokpulver/.test(name))return null;for(const rule of rules)if(rule[1].test(name)&&PRICE_DATA.items[rule[0]])return {rule,product:PRICE_DATA.items[rule[0]]};return null;}
 const amount=p=>p.size*({g:.001,kg:1,ml:.001,cl:.01,dl:.1,l:1,st:1}[p.unit]);
 const baseUnit=p=>['g','kg'].includes(p.unit)?'kg':['ml','cl','dl','l'].includes(p.unit)?'l':'st';
 function lookup(item){const hit=match(item);if(!hit)return null;const {rule,product:p}=hit,[id,,density,eachKg,portionKg,special]=rule,base=baseUnit(p),per=p.price/amount(p);let value,note='Jämförelsevara: '+p.name;
  if(item.unit==='efter smak')return {hint:true,product:p,unit:base,value:per,note:'Mängd saknas i originalet. Ange veckobelopp själv.'};
  if(special==='broth'){if(item.unit==='l'){value=per*2;note+=' · beräknat 2 tärningar per liter färdig buljong';}else if(item.unit==='st')value=per;}
  else if(item.unit===base)value=per;
  else if(item.unit==='l'&&base==='kg'&&density){value=per*density;note+=' · uppskattad vikt '+Math.round(density*100)+' g/dl';}
  else if(item.unit==='kg'&&base==='l'&&density){value=per/density;note+=' · uppskattat '+density+' kg/l';}
  else if(item.unit==='port'&&base==='kg'&&portionKg){value=per*portionKg;note+=' · beräknat '+Math.round(portionKg*1000)+' g per portion';}
  else if(['st','paket','forp','förp','burk','burkar','kruka','knippe','ask','skiva','klyfta','klyftor'].includes(item.unit)){
   const pack=String(item.name).match(/(?:à|á|\ba\b|ca)\s*(\d+(?:[.,]\d+)?)\s*(kg|g|ml|cl|dl|l)\b/i),isPack=/(?:^| )(?:burk|paket|forp|pase|ask|kruka|knippe)(?: |$)/.test(norm(item.name))||['paket','forp','förp','burk','burkar','kruka','knippe','ask'].includes(item.unit);
   if(pack&&base!=='st'){const u=pack[2].toLowerCase(),b=['g','kg'].includes(u)?'kg':'l';if(b===base)value=per*Number(pack[1].replace(',','.'))*({g:.001,kg:1,ml:.001,cl:.01,dl:.1,l:1}[u]);}
   else if(isPack){value=p.price;note+=' · referensförpackning '+p.size+' '+p.unit;}
   else if(base==='kg'&&eachKg){const mass=/hel vitlok/.test(norm(item.name))?.055:eachKg;value=per*mass;note+=' · uppskattad styckvikt '+Math.round(mass*1000)+' g';}
   else if(base==='st')value=per;
  }
  if(!(value>=0&&Number.isFinite(value)))return null;return {value:Number(value.toFixed(2)),product:p,unit:item.unit,note,checked:PRICE_DATA.checked,source:'riktpris'};
 }
 return {lookup,match,checked:PRICE_DATA.checked};
})();
