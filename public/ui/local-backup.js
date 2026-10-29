'use strict';
$('exportBackup').onclick=async()=>{
 const output=$('backupStatus');
 if(!syncReady||conflict){output.textContent='Hämta senast sparade val innan du gör en säkerhetskopia.';return;}
 clearTimeout(saveTimer);await flushSave();
 if(dirty||saving){output.textContent='Vänta tills dina ändringar är sparade och försök igen.';return;}
 const file=new Blob([JSON.stringify({app:'middagskollen',version:1,exportedAt:new Date().toISOString(),state},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(file),link=document.createElement('a');link.href=url;link.download='middagskollen-sakerhetskopia-'+new Date().toISOString().slice(0,10)+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
 output.textContent='Säkerhetskopian är nedladdad. Den innehåller dina personliga val och egna priser.';
};
$('importBackup').onchange=async e=>{
 const file=e.target.files[0],output=$('backupStatus');if(!file)return;
 try{
  if(!syncReady||conflict||saving)throw Error('Hämta senast sparade val och låt pågående sparning bli klar först.');
  if(file.size>250000)throw Error('Filen är för stor. Välj en säkerhetskopia från Middagskollen.');
  const backup=JSON.parse(await file.text()),next=backup.state;
  if(backup.app!=='middagskollen'||backup.version!==1||!next||!Number.isInteger(next.people)||next.people<1||next.people>6||!Number.isInteger(next.boxes)||next.boxes<0||next.boxes>6||!Array.isArray(next.plan)||next.plan.length!==7||!next.plan.every(id=>Number.isInteger(id)&&DATA.recipes[id])||!Array.isArray(next.pantry))throw Error('Filen är inte en giltig säkerhetskopia.');
  if(!confirm('Återställa säkerhetskopian? Den ersätter nuvarande veckoplan, budget, priser, inköpsval och hemmalager i den lokala appen.'))return;
  const normalized=normalizeState(next),raw=JSON.stringify(normalized);
  if(raw.length>240000)throw Error('Säkerhetskopian innehåller för mycket data.');
  clearTimeout(saveTimer);const r=await mealFetch('api/state',{method:'PUT',headers:{'Content-Type':'application/json','X-Middagskollen':'1'},body:JSON.stringify({state:normalized,revision:serverRevision}),signal:AbortSignal.timeout(15000)});
  if(r.status===409){conflict=true;$('reloadState').hidden=false;throw Error('En annan enhet har ändrat appen. Hämta senaste sparade val och försök igen.');}
  if(!r.ok)throw Error('Säkerhetskopian kunde inte sparas. Dina befintliga val behålls.');
  serverRevision=(await r.json()).revision;state=normalized;dirty=false;applyFoodPreferences();updateControls();render();syncMessage('Säkerhetskopian är återställd och sparad lokalt.');output.textContent='Veckoplan, budget, egna priser, inköpsval och hemmalager har återställts.';
 }catch(error){output.textContent=error instanceof SyntaxError?'Filen kunde inte läsas som JSON.':error.message;}finally{e.target.value='';}
};
