// Runs on quizlet.com while the user is signed in there with their own account.
// It collects every set link on the page, downloads the cards using Quizlet's own
// site API (same-origin, the user's session), and hands them to Houseparty's /import page.
export function quizletBookmarklet(origin: string) {
  const code = `(async()=>{
if(!location.hostname.endsWith('quizlet.com')){alert('Open quizlet.com (your library) first, signed in.');return;}
const seen={};document.querySelectorAll('a[href]').forEach(a=>{const m=a.href.match(/quizlet\\.com\\/(?:[a-z]{2}\\/)?(\\d{5,})\\//);if(m&&!seen[m[1]])seen[m[1]]=(a.innerText||'').trim().split('\\n')[0]||('Quizlet set '+m[1]);});
const m0=location.href.match(/quizlet\\.com\\/(?:[a-z]{2}\\/)?(\\d{5,})\\//);if(m0&&!seen[m0[1]])seen[m0[1]]=document.title.split('|')[0].trim();
const ids=Object.keys(seen);if(!ids.length){alert('No sets found. Open your Quizlet library page (Your library → Flashcard sets) and scroll down to load them all.');return;}
const w=window.open('${origin}/import','houseparty');const sets=[];
for(const id of ids){try{const r=await fetch('/webapi/3.4/studiable-item-documents?filters%5BstudiableContainerId%5D='+id+'&filters%5BstudiableContainerType%5D=1&perPage=1000',{credentials:'include'});const j=await r.json();const it=(j.responses&&j.responses[0].models.studiableItem)||[];const cards=it.map(x=>({term:(x.cardSides[0].media[0]||{}).plainText,definition:(x.cardSides[1].media[0]||{}).plainText})).filter(c=>c.term&&c.definition);if(cards.length)sets.push({title:seen[id],cards});}catch(e){}}
const send=()=>w.postMessage({type:'houseparty-import',source:'Quizlet',sets},'${origin}');
window.addEventListener('message',e=>{if(e.data==='houseparty-ready')send();});setTimeout(send,1500);setTimeout(send,4000);
alert('Sent '+sets.length+' Quizlet sets to Houseparty!');})()`;
  return "javascript:" + encodeURIComponent(code.replace(/\n/g, ""));
}
