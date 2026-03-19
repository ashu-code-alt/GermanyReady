// ── STATE ─────────────────────────────────────────────────────────────
let S=(()=>{try{return JSON.parse(localStorage.getItem('et5')||'{}')}catch{return {}}})();
let queue=[],idx=0,mode='quiz',sC=0,sT=0,sW=[],answered=false,
    streak=S.sk||0,lastDate=S.ld||null,timerI=null,timerSecs=0,isMock=false;
let currentLang=S.lang||'en';
let currentState=S.state||'Rheinland-Pfalz';
let currentTheme=S.theme||'system';
let pendingLang=currentLang;
let pendingState=currentState;

function t(key){ return (UIT[currentLang]&&UIT[currentLang][key]) || (UIT['en']&&UIT['en'][key]) || key; }

function sk(n,sec){return (sec&&sec!=='general'?sec.replace(/[^a-zA-Z]/g,'').substring(0,5)+'_':'')+n;}
function getS(n,sec){return S[sk(n,sec)]||'u';}
function setS(n,sec,v){S[sk(n,sec)]=v;saveS();updStats();}
function saveS(){S.sk=streak;S.ld=lastDate;S.lang=currentLang;S.state=currentState;S.theme=currentTheme;localStorage.setItem('et5',JSON.stringify(S));}
function setSRS(n,sec,ok){
  const k='srs_'+sk(n,sec),rk='rep_'+sk(n,sec);
  const rep=S[rk]||0,ivs=[1,2,4,7,14,30];
  const nr=ok?Math.min(rep+1,ivs.length-1):0;
  S[rk]=nr;S[k]=Date.now()+ivs[ok?nr:0]*86400000;saveS();
}
function getSRSLabel(n,sec){
  const due=S['srs_'+sk(n,sec)];if(!due)return '';
  const d=Math.ceil((due-Date.now())/86400000);
  return d<=0?'⟳ Review due':'⟳ In '+d+'d';
}

// ── THEME ──────────────────────────────────────────────────────────────
function applyTheme(th){
  currentTheme=th;
  let actual=th;
  if(th==='system') actual=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
  document.documentElement.setAttribute('data-theme',actual);
  ['btn-light','btn-dark','btn-system'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.classList.toggle('act',id==='btn-'+th);
  });
  saveS();
}
function setTheme(th){applyTheme(th);}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{
  if(currentTheme==='system') applyTheme('system');
});

// ── LANGUAGE ACCENT ────────────────────────────────────────────────────
function applyLangTheme(code){
  const lt=LT[code]||LT['en'];
  document.documentElement.style.setProperty('--acc',lt.accent);
  document.documentElement.style.setProperty('--acc2',lt.accent2);
  // RTL support
  document.documentElement.setAttribute('dir',lt.rtl?'rtl':'ltr');
  // Update accent preview
  const sw=document.getElementById('accent-swatch');
  const an=document.getElementById('accent-name');
  if(sw) sw.style.background=lt.accent;
  if(an) an.textContent=`${lt.flag} ${lt.name}`;
}

// ── UI TRANSLATION ─────────────────────────────────────────────────────
function applyUILang(){const _g=id=>{return document.getElementById(id)||{textContent:'',innerHTML:'',style:{},className:'',classList:{add:()=>{},remove:()=>{}},setAttribute:()=>{}};};
  const lang=currentLang;
  // Sidebar
  const selLang=_g('sel-lang-val');
  const selState=_g('sel-state-val');
  const lt=LT[lang]||LT['en'];
  if(selLang) selLang.textContent=`${lt.flag} ${lt.name}`;
  if(selState) selState.textContent=currentState;
  _g('sb-lang-icon').textContent=lt.flag;
  _g('sb-label-state').textContent=t('bundesland');
  _g('sb-label-lang').textContent=t('sprache');
  _g('nb-state-label').textContent=currentState.length>14?currentState.substring(0,12)+'…':currentState;

  // Nav labels
  _g('nb-learn-txt').textContent=t('lernmodus');
  _g('nb-quiz-txt').textContent=t('quiz');
  _g('nb-mock-txt').textContent=t('probetest');
  _g('nb-weak-txt').textContent=t('schwache');
  _g('nb-vocab-txt').textContent=t('vocab');
  _g('nb-prog-txt').textContent=t('progress');
  _g('nb-settings-txt').textContent=t('settings');

  // Stats
  _g('sl-knew').textContent=t('knew');
  _g('sl-wrong').textContent=t('wrong_stat');
  _g('sl-streak').textContent=t('streak');
  _g('sl-total').textContent=t('total');

  // Buttons
  _g('btn-back').textContent=t('back');
  _g('btn-skip').textContent=t('skip');
  _g('btn-next').textContent=t('next');
  _g('btn-lback').textContent=t('back');
  _g('btn-lnext').textContent=t('next');
  _g('rvbtn').textContent='👁️ '+t('reveal');
  _g('btn-know').textContent=t('i_know');
  _g('btn-notyet').textContent=t('not_yet');
  _g('al-label').textContent='✓ '+t('correct_answer').toUpperCase();
  _g('expl-head-l').textContent='💡 '+t('explanation').toUpperCase();
  _g('expl-head-q').textContent='💡 '+t('explanation').toUpperCase();

  // Home cards
  _g('mc-learn').textContent=t('lernmodus');
  _g('mc-quiz').textContent=t('quiz');
  _g('mc-mock').textContent=t('probetest');
  _g('mc-weak').textContent=t('schwache');
  _g('pov-title').textContent='Themenübersicht';

  // Settings
  _g('settings-title').textContent='⚙️ '+t('settings');
  _g('set-theme-title').textContent=t('theme');
  _g('set-theme-label').textContent=t('theme');
  _g('btn-light').textContent='☀️ '+t('light');
  _g('btn-dark').textContent='🌙 '+t('dark');
  _g('btn-system').textContent='💻 '+t('system');
  _g('set-accent-label').textContent=t('sprache');
  _g('set-cur-lang').textContent=`${lt.flag} ${lt.name}`;
  _g('set-cur-state').textContent=currentState;
  _g('btn-change-lang').textContent=t('confirm').replace('→','').trim();
  _g('prog-title').textContent=t('progress')+' 📊';

  // State overlay
  _g('so-title').textContent=t('choose_state');
  _g('so-sub').textContent=t('state_sub');
  _g('so-btn').textContent=t('confirm');

  // RTL adjustments
  if(lt.rtl){
    _g('btn-lback').textContent=t('back').replace('←','→');
    _g('btn-back').textContent=t('back').replace('←','→');
  }
}

// ── STATS ─────────────────────────────────────────────────────────────
function updStats(){
  const stateQs=STATS[currentState]||[];
  let k=0,n=0,tot=0;
  [...GQ,...stateQs].forEach(q=>{const s=getS(q.num,q.section);if(s==='k')k++;if(s==='n')n++;if(s!=='u')tot++;});
  document.getElementById('st-k').textContent=k;
  document.getElementById('st-n').textContent=n;
  document.getElementById('st-s').textContent=streak;
  document.getElementById('st-t').textContent=tot;
}
function updTopicBars(){
  document.getElementById('tpbars').innerHTML=TOPICS.map(tp=>{
    const qs=GQ.filter(q=>q.num>=tp.r[0]&&q.num<=tp.r[1]);
    const k=qs.filter(q=>getS(q.num,'general')==='k').length;
    const p=qs.length?Math.round(k/qs.length*100):0;
    return `<div class="trow"><div class="tn">${tp.icon} ${tp.name}</div><div class="tbb"><div class="tbf" style="width:${p}%"></div></div><div class="tp">${p}%</div></div>`;
  }).join('');
}

// ── NAVIGATION ────────────────────────────────────────────────────────
function showPage(p){
  ['hp','qc','rp','pp','vp','settings-page','legal-page'].forEach(x=>{
    const el=document.getElementById(x);if(el)el.style.display='none';
  });
  document.querySelectorAll('.nb').forEach(b=>b.classList.remove('act'));
  stopTimer();
  closeSidebar();
  if(p==='home'){document.getElementById('hp').style.display='block';document.getElementById('nb-home').classList.add('act');updTopicBars();}
  else if(p==='progress'){document.getElementById('pp').style.display='block';document.getElementById('nb-prog').classList.add('act');renderPGrid();}
  else if(p==='vocab'){document.getElementById('vp').style.display='block';document.getElementById('nb-vocab').classList.add('act');renderVocab('');}
  else if(p==='settings'){document.getElementById('settings-page').style.display='block';document.getElementById('nb-settings').classList.add('act');}
  else if(p==='legal'){document.getElementById('legal-page').style.display='block';}
  else if(p==='results'){document.getElementById('rp').style.display='block';}
  updStats();
}

// ── LANG OVERLAY ──────────────────────────────────────────────────────
function initLangOverlay(){
  const grid=document.getElementById('lo-langs');
  grid.innerHTML=LANGS.map(l=>
    `<div class="ll ${l.code===pendingLang?'sel':''}" onclick="pickLang('${l.code}')" id="ll-${l.code}">
      <span class="ll-flag">${l.flag}</span>
      <span class="ll-name">${l.name}</span>
    </div>`
  ).join('');
  // Set initial note
  updateLangNote(pendingLang);
}
function updateLangNote(code){
  const note=document.getElementById('lo-note');
  const btn=document.getElementById('lo-btn');
  const icon=document.getElementById('lo-icon');
  const lt=LT[code]||LT['en'];
  const ui=UIT[code]||UIT['en'];
  // Update the overlay title and button in the selected language
  document.getElementById('lo-title').textContent=ui.choose_lang+' / Sprache wählen';
  btn.textContent=ui.continue;
  icon.textContent=lt.flag;
  note.textContent=ui.q_remains_de;
  note.className='lo-note'+(code!=='en'?' native':'');
}
function pickLang(code){
  pendingLang=code;
  document.querySelectorAll('.ll').forEach(el=>el.classList.remove('sel'));
  const el=document.getElementById('ll-'+code);
  if(el) el.classList.add('sel');
  updateLangNote(code);
}
function selectLang(){
  currentLang=pendingLang;
  document.getElementById('lang-overlay')?.classList.remove('open');
  applyLangTheme(currentLang);
  applyUILang();
  saveS();
  // Always show state selector after language choice
  pendingState=currentState;
  initStateOverlay();
  document.getElementById('state-overlay')?.classList.add('open');
}
function changeLang(){
  pendingLang=currentLang;
  initLangOverlay();
  document.getElementById('lang-overlay')?.classList.add('open');
}

// ── STATE OVERLAY ─────────────────────────────────────────────────────
function initStateOverlay(){
  const grid=document.getElementById('states-grid');
  grid.innerHTML=STATE_LIST.map(s=>
    `<div class="sg ${s===pendingState?'sel':''}" onclick="pickState('${s}')" id="sg-${s.replace(/[^a-z]/gi,'_')}">
      <div class="sg-name">${s}</div>
    </div>`
  ).join('');
}
function pickState(s){
  pendingState=s;
  document.querySelectorAll('.sg').forEach(el=>el.classList.remove('sel'));
  const el=document.getElementById('sg-'+s.replace(/[^a-z]/gi,'_'));
  if(el) el.classList.add('sel');
}
function selectState(){
  currentState=pendingState;
  document.getElementById('state-overlay')?.classList.remove('open');
  document.getElementById('nb-state-label').textContent=currentState.length>14?currentState.substring(0,12)+'…':currentState;
  document.getElementById('sel-state-val').textContent=currentState;
  document.getElementById('set-cur-state').textContent=currentState;
  saveS();
  showPage('home');updTopicBars();updStats();
}
function changeState(){
  pendingState=currentState;
  initStateOverlay();
  document.getElementById('state-overlay')?.classList.add('open');
}

// ── QUEUE ──────────────────────────────────────────────────────────────
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function buildQueue(m,ti){
  const sq=STATS[currentState]||[];
  if(m==='all') return [...GQ];
  if(m==='state') return [...sq];
  if(m==='weak'){const w=[...GQ,...sq].filter(q=>getS(q.num,q.section)==='n');return w.sort((a,b)=>(S['srs_'+sk(a.num,a.section)]||0)-(S['srs_'+sk(b.num,b.section)]||0));}
  if(m==='topic'){const tp=TOPICS[ti];return GQ.filter(q=>q.num>=tp.r[0]&&q.num<=tp.r[1]);}
  if(m==='mock') return shuffle([...shuffle([...GQ]).slice(0,30),...shuffle([...sq]).slice(0,3)]);
  return [];
}

// ── QUIZ ───────────────────────────────────────────────────────────────
function startQuiz(m,ti){
  queue=buildQueue(m,ti);
  if(!queue.length){alert('Keine Fragen verfügbar!');return;}
  idx=0;sC=0;sT=0;sW=[];mode='quiz';isMock=(m==='mock');
  showPage('');
  document.getElementById('qc').style.display='block';
  document.getElementById('lm').style.display='none';
  document.getElementById('qm').style.display='block';
  document.getElementById('qtot').textContent=queue.length;
  const ml={all:'Alle Fragen',state:currentState,weak:t('schwache'),mock:'🎯 '+t('probetest'),topic:'Themenquiz'};
  document.getElementById('qmb').textContent=ml[m]||'';
  if(isMock){document.getElementById('qtimer').style.display='flex';startTimer(3600);}
  else document.getElementById('qtimer').style.display='none';
  renderQNav();renderQ();
}
function startMock(){startQuiz('mock');}

function renderQNav(){
  const grid=document.getElementById('qnav-grid');
  grid.innerHTML='';
  const show=queue.length>10;
  document.getElementById('qnav-bar').style.display=show?'block':'none';
  if(!show)return;
  document.getElementById('qnav-title').textContent=`Fragen (${queue.length})`;
  queue.forEach((q,i)=>{
    const s=getS(q.num,q.section);
    const btn=document.createElement('button');
    btn.className='qnb '+(s||'u')+(i===idx?' cur':'');
    btn.id='qnb-'+i;
    btn.textContent=q.num;
    btn.title=`Q${q.num}: ${q.question.substring(0,40)}…`;
    btn.onclick=()=>jumpToIdx(i);
    grid.appendChild(btn);
  });
}
function updQNav(){
  document.querySelectorAll('.qnb').forEach((b,i)=>b.classList.toggle('cur',i===idx));
}
function jumpToIdx(i){
  idx=i;
  const q=queue[idx];
  const prev=getS(q.num,q.section);
  if(mode==='learn'){
    renderL();
  } else {
    renderQ();
    if(prev==='k'||prev==='n') setTimeout(()=>autoReveal(q,prev),40);
  }
}
function autoReveal(q,status){
  answered=true;
  const ok=(status==='k');
  document.querySelectorAll('.ob').forEach((b,j)=>{
    b.disabled=true;
    if(j===q.correct) b.classList.add(ok?'cor':'rev');
    else if(!ok && j===q.correct) b.classList.add('rev');
  });
  if(!ok){
    const allBtns=document.querySelectorAll('.ob');
    // mark user's previous wrong — we don't know which one, so just mark correct
    allBtns.forEach((b,j)=>{if(j!==q.correct)b.classList.toggle('wrg',false);});
  }
  const tr2=getTrans(q);
  const corEN=tr2&&tr2.opts?tr2.opts[q.correct]:'';
  const fb=document.getElementById('fb');
  if(ok){fb.className='fb ok show';fb.innerHTML=`<strong>${t('correct')}</strong>`;}
  else{fb.className='fb no show';fb.innerHTML='<strong>'+t('wrong')+'</strong> '+t('correct_answer')+': <strong>'+q.options[q.correct]+'</strong>'+(corEN&&corEN!==q.options[q.correct]?' <em style="opacity:.7">('+corEN+')</em>':'');}
  const e=EXPL[String(q.num)];
  if(e){document.getElementById('expl-de').textContent=e[1];document.getElementById('expl-en').textContent=e[2];document.getElementById('expl').className='expl show';}
  document.getElementById('btn-skip').style.display='none';
  document.getElementById('btn-next').style.display='';
}

function renderQ(){
  const q=queue[idx];answered=false;
  document.getElementById('qcur').textContent=idx+1;
  document.getElementById('qpb').style.width=(idx/queue.length*100)+'%';
  updQNav();
  const diff=q.diff||2;
  document.getElementById('qtags').innerHTML=
    '<span class="qtag qtn">Aufgabe '+q.num+'</span> '+
    '<span class="qtag qtd'+diff+'">'+DIFFNAMES[diff]+'</span> '+
    (q.section&&q.section!=='general'?'<span class="qtag" style="background:rgba(240,192,64,.1);color:var(--gold)">'+q.section+'</span>':'');
  const tr=getTrans(q);
  const ni=NI[currentLang]||'';
  const enText=tr?tr.q:'';
  const qenEl=document.getElementById('qen');
  if(enText){
    if(ni&&currentLang!=='en'){
      qenEl.innerHTML='<span style="font-weight:600;opacity:.85">'+ni+'</span> <span style="font-style:italic">'+enText+'</span>';
    } else {
      qenEl.textContent=enText;
    }
    qenEl.style.display='block';
  } else {
    qenEl.style.display='none';
  }

  document.getElementById('qde').innerHTML=makeHW(q.question);
  document.getElementById('srs-info').textContent=getSRSLabel(q.num,q.section);
  const qi=document.getElementById('qimg2');qi.innerHTML='';
  if(IMGQS[q.num]&&IMGQS[q.num].t==='q') qi.innerHTML=`<img src="${IMGQS[q.num].img}" class="qimg">`;
  const oc=document.getElementById('oc');oc.innerHTML='';
  q.options.forEach((opt,i)=>{
    const btn=document.createElement('button');
    btn.className='ob';btn.onclick=()=>pick(i,btn);
    const L=String.fromCharCode(65+i);
    const imgQ=IMGQS[q.num];
    const enOpt=tr&&tr.opts?tr.opts[i]:'';
    if(imgQ&&imgQ.t==='o'&&imgQ.imgs&&imgQ.imgs[i]){
      btn.innerHTML=`<div class="oimgw"><span class="ol">${L}</span><img src="${imgQ.imgs[i]}" class="oimg"><span style="color:var(--txt2);font-size:11px">Bild ${i+1}</span></div>`;
    } else {
      const niPfx=NI[currentLang]&&currentLang!=='en'&&enOpt&&enOpt!==opt?('<span style="font-weight:600;font-size:10px">'+NI[currentLang]+'</span> '):'';
      const optEnHtml=enOpt&&enOpt!==opt?('<span class="opt-en">'+niPfx+enOpt+'</span>'):'';
      btn.innerHTML='<span class="ol">'+L+'</span><span><span>'+makeHW(opt)+'</span>'+optEnHtml+'</span>';
    }
    oc.appendChild(btn);
  });
  document.getElementById('fb').className='fb';
  document.getElementById('expl').className='expl';
  document.getElementById('btn-skip').style.display='';
  document.getElementById('btn-next').style.display='none';
  const card=document.getElementById('qcard');card.classList.remove('ani');void card.offsetWidth;card.classList.add('ani');
}

function getTrans(q){
  if(!q.section||q.section==='general') return TR.general&&TR.general[q.num]||null;
  return q.en||null;
}
function makeHW(text){
  const sorted=Object.keys(VOC).sort((a,b)=>b.length-a.length);
  let r=text;
  sorted.forEach(term=>{
    if(r.includes(term)){
      const def=VOC[term].replace(/"/g,'&quot;');
      r=r.split(term).join(`<span class="hw">${term}<span class="tt">${def}</span></span>`);
    }
  });
  return r;
}
function pick(i,btn){
  if(answered)return;answered=true;
  const q=queue[idx];
  const ok=i===q.correct;
  setS(q.num,q.section,ok?'k':'n');setSRS(q.num,q.section,ok);
  sT++;if(ok)sC++;else sW.push({...q,yourIdx:i});
  updStreak(ok);
  document.querySelectorAll('.ob').forEach((b,j)=>{
    b.disabled=true;
    if(j===i&&ok)b.classList.add('cor');
    else if(j===i)b.classList.add('wrg');
    if(j===q.correct&&!ok)b.classList.add('rev');
  });
  const nb=document.getElementById('qnb-'+idx);
  if(nb){nb.className='qnb '+(ok?'k':'n')+' cur';}
  const tr=getTrans(q);const corEN=tr&&tr.opts?tr.opts[q.correct]:'';
  const fb=document.getElementById('fb');
  if(ok){fb.className='fb ok show';fb.innerHTML=`<strong>${t('correct')}</strong>`;}
  else{fb.className='fb no show';fb.innerHTML='<strong>'+t('wrong')+'</strong> '+t('correct_answer')+': <strong>'+q.options[q.correct]+'</strong>'+(corEN&&corEN!==q.options[q.correct]?' <em style="opacity:.7">('+corEN+')</em>':'');}
  const e=EXPL[String(q.num)];
  if(e){document.getElementById('expl-de').textContent=e[1];document.getElementById('expl-en').textContent=e[2];document.getElementById('expl').className='expl show';}
  document.getElementById('btn-skip').style.display='none';
  document.getElementById('btn-next').style.display='';
  updStats();
}
function skipQ(){if(answered)return;const q=queue[idx];setS(q.num,q.section,'s');sT++;sW.push({...q,yourIdx:-1});nextQ();}
function nextQ(){idx++;if(idx>=queue.length)showResults();else renderQ();}
function exitQuiz(){stopTimer();showPage('home');}
function restartQ(){idx=0;sC=0;sT=0;sW=[];document.getElementById('rp').style.display='none';document.getElementById('qc').style.display='block';renderQNav();renderQ();}
function speakQ(){
  if(!window.speechSynthesis)return;
  const btn=document.getElementById('tts-btn');
  if(speechSynthesis.speaking){speechSynthesis.cancel();btn.classList.remove('on');return;}
  const u=new SpeechSynthesisUtterance(queue[idx].question);
  u.lang='de-DE';u.rate=0.82;btn.classList.add('on');
  u.onend=u.onerror=()=>btn.classList.remove('on');
  speechSynthesis.speak(u);
}

// ── TIMER ──────────────────────────────────────────────────────────────
function startTimer(s){stopTimer();timerSecs=s;updTimerUI();timerI=setInterval(()=>{timerSecs--;updTimerUI();if(timerSecs<=0){clearInterval(timerI);showResults();}},1000);}
function stopTimer(){if(timerI){clearInterval(timerI);timerI=null;}}
function updTimerUI(){
  const m=Math.floor(timerSecs/60),s=timerSecs%60;
  document.getElementById('tnum').textContent=`${m}:${s.toString().padStart(2,'0')}`;
  const circ=81.7,pct=timerSecs/3600;
  const arc=document.getElementById('tarc');
  arc.setAttribute('stroke-dasharray',`${circ*pct} ${circ*(1-pct)}`);
  arc.style.stroke=timerSecs<300?'var(--red)':timerSecs<600?'var(--gold)':'var(--acc)';
}

// ── LEARN ──────────────────────────────────────────────────────────────
function startLearn(){
  queue=[...GQ];idx=0;mode='learn';
  showPage('');
  document.getElementById('qc').style.display='block';
  document.getElementById('lm').style.display='block';
  document.getElementById('qm').style.display='none';
  document.getElementById('qtimer').style.display='none';
  document.getElementById('qtot').textContent=queue.length;
  document.getElementById('qmb').textContent='📖 '+t('lernmodus');
  renderQNav();renderL();
}
function renderL(){
  const q=queue[idx];
  document.getElementById('qcur').textContent=idx+1;
  document.getElementById('qpb').style.width=(idx/queue.length*100)+'%';
  updQNav();
  const diff=q.diff||2;
  document.getElementById('ltags').innerHTML='<span class="qtag qtn">Aufgabe '+q.num+'</span><span class="qtag qtd'+diff+'">'+DIFFNAMES[diff]+'</span>';
  const tr=getTrans(q);
  const ni2=NI[currentLang]||'';
  const enQ=tr?tr.q:'';
  const lenEl=document.getElementById('len');
  if(enQ){
    if(ni2&&currentLang!=='en'){
      lenEl.innerHTML='<span style="font-weight:600">'+ni2+'</span> <span style="font-style:italic">'+enQ+'</span>';
    } else {
      lenEl.textContent=enQ;
    }
  } else { lenEl.textContent=''; }
  document.getElementById('lq').innerHTML=makeHW(q.question);
  const li=document.getElementById('lqimg');li.innerHTML='';
  if(IMGQS[q.num]&&IMGQS[q.num].t==='q') li.innerHTML=`<img src="${IMGQS[q.num].img}" class="qimg">`;
  document.getElementById('ar').className='ar';
  document.getElementById('kbtns').style.display='none';
  document.getElementById('rvbtn').style.display='';
  const cor=q.options[q.correct]||'';
  document.getElementById('lat').textContent=cor;
  const en2=tr&&tr.opts?tr.opts[q.correct]:'';
  document.getElementById('lat-en').textContent=en2&&en2!==cor?en2:'';
  const lai=document.getElementById('laimg');lai.innerHTML='';
  if(IMGQS[q.num]&&IMGQS[q.num].t==='o'&&IMGQS[q.num].imgs){
    const im=IMGQS[q.num].imgs[q.correct];
    if(im) lai.innerHTML=`<img src="${im}" style="height:65px;border-radius:5px;margin-top:9px">`;
  }
  const e=EXPL[String(q.num)];
  document.getElementById('lexpl').style.display='none';
  if(e){document.getElementById('lexpl-de').textContent=e[1];document.getElementById('lexpl-en').textContent=e[2];}
  setS(q.num,q.section,'s');
  const lc=document.getElementById('lcard');lc.classList.remove('ani');void lc.offsetWidth;lc.classList.add('ani');
}
function revealAnswer(){
  document.getElementById('ar').className='ar show';
  document.getElementById('kbtns').style.display='flex';
  document.getElementById('rvbtn').style.display='none';
  const q=queue[idx];
  if(EXPL[String(q.num)]) document.getElementById('lexpl').style.display='block';
}
function markKnown(ok){const q=queue[idx];setS(q.num,q.section,ok?'k':'n');setSRS(q.num,q.section,ok);updStreak(ok);lNext();}
function lNext(){idx++;if(idx>=queue.length){showPage('home');return;}renderL();}
function lPrev(){if(idx>0){idx--;renderL();}}

// ── RESULTS ────────────────────────────────────────────────────────────
function showResults(){
  stopTimer();document.getElementById('qc').style.display='none';showPage('results');
  const p=sC>=17&&sT>=17,pct=sT?Math.round(sC/sT*100):0;
  document.getElementById('rsc').textContent=sC+'/'+sT;
  document.getElementById('rsc').className='rscore '+(p?'p':'f');
  document.getElementById('rl').textContent=p?t('pass'):t('fail');
  const rb=document.getElementById('rb');
  rb.textContent=p?t('pass_msg'):t('fail_msg');
  rb.className='rbadge '+(p?'p':'f');
  document.getElementById('rrc').textContent=sC;
  document.getElementById('rrw').textContent=sT-sC;
  document.getElementById('rrp').textContent=pct+'%';
  document.getElementById('rsl-correct').textContent=t('correct');
  document.getElementById('rsl-wrong').textContent=t('wrong');
  document.getElementById('btn-retry').textContent='🔄 '+t('probetest');
  if(p) confetti();
  const wlc=document.getElementById('wlc');
  if(sW.length){
    wlc.style.display='block';
    document.getElementById('wl-title').textContent='❌ '+t('wrong_answers');
    document.getElementById('wl').innerHTML=sW.map(w=>{
      const ya=w.yourIdx>=0?w.options[w.yourIdx]:'('+t('skip')+')';
      const tr2=getTrans(w);
      return '<div class="wc"><div class="wq">'+w.question+'</div>'+(tr2?'<div class="wq-en">'+tr2.q+'</div>':'')+'<div class="wy">'+t('your_answer')+': '+ya+'</div><div class="wok">'+t('right_answer')+': '+w.options[w.correct]+(tr2&&tr2.opts?' <em style="font-size:10.5px;opacity:.7">('+tr2.opts[w.correct]+')</em>':'')+'</div></div>';
    }).join('');
  } else wlc.style.display='none';
}

// ── PROGRESS ───────────────────────────────────────────────────────────
function renderPGrid(){
  const g=document.getElementById('pgrid');g.innerHTML='';
  GQ.forEach(q=>{
    const s=getS(q.num,'general');
    const d=document.createElement('div');d.className='qdot '+(s||'u');
    d.innerHTML=`<div class="dtt">Q${q.num}</div>`;
    d.onclick=()=>{
      queue=[q];idx=0;mode='quiz';sC=0;sT=0;sW=[];
      document.getElementById('pp').style.display='none';
      document.getElementById('qc').style.display='block';
      document.getElementById('lm').style.display='none';
      document.getElementById('qm').style.display='block';
      document.getElementById('qtimer').style.display='none';
      document.getElementById('qtot').textContent=1;
      document.getElementById('qnav-bar').style.display='none';
      renderQ();
    };
    g.appendChild(d);
  });
}
function resetProg(){
  if(!confirm('Gesamten Fortschritt zurücksetzen?'))return;
  const lang=currentLang,state=currentState,theme=currentTheme;
  localStorage.removeItem('et5');S={};streak=0;
  currentLang=lang;currentState=state;currentTheme=theme;saveS();
  updStats();renderPGrid();
}

// ── VOCAB ───────────────────────────────────────────────────────────────
function renderVocab(f){
  const fl=f.toLowerCase();
  const entries=Object.entries(VOC).filter(([k,v])=>!fl||k.toLowerCase().includes(fl)||v.toLowerCase().includes(fl));
  document.getElementById('vgrid').innerHTML=entries.map(([k,v])=>
    `<div class="vtile"><div class="vterm">${k}</div><div class="vdef">${v}</div></div>`
  ).join('');
}
function filterVocab(v){renderVocab(v);}

// ── STREAK ──────────────────────────────────────────────────────────────
function updStreak(ok){const today=new Date().toDateString();if(ok&&lastDate!==today){streak++;lastDate=today;}saveS();updStats();}


// ══ OVERLAY HELPERS ═══════════════════════════════════════════════════

// ── Toast ─────────────────────────────────────────────────────────────
function showToast(type, msg, dur = 3500) {
  const c = document.getElementById('toast-cont');
  if (!c) return;
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  const icons = {success: '✅', error: '❌', info: 'ℹ️'};
  toast.innerHTML = '<span>' + icons[type] + '</span><span>' + msg + '</span>';
  c.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(18px)';
    toast.style.transition = 'all .3s';
    setTimeout(() => toast.remove(), 300);
  }, dur);
}

// ── Override confetti ─────────────────────────────────────────────────
function confetti() {
  const w = document.createElement('div'); w.className = 'cw'; document.body.appendChild(w);
  const acc = getComputedStyle(document.documentElement).getPropertyValue('--acc').trim();
  const cols = [acc,'#f0c040','#34d399','#f87171',acc,'#fb923c'];
  for (let i = 0; i < 90; i++) {
    const p = document.createElement('div'); p.className = 'cp';
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = cols[i % cols.length];
    p.style.width = (5 + Math.random() * 8) + 'px';
    p.style.height = (5 + Math.random() * 8) + 'px';
    p.style.animationDuration = (1.2 + Math.random() * 2) + 's';
    p.style.animationDelay = Math.random() * 0.6 + 's';
    w.appendChild(p);
  }
  setTimeout(() => w.remove(), 4000);
}


// ── MOBILE SIDEBAR ────────────────────────────────────────────────────
function toggleSidebar(){
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sb-overlay').classList.toggle('open');
}
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sb-overlay').classList.remove('open');
}

// ── Overlay aliases (v5 shell → v4 engine) ─────────────────────────

function openOverlay(which) {
  if (which === 'lang') {
    pendingLang = currentLang;
    initLangOverlay();
    const el = document.getElementById('lang-overlay');
    if (el) el.classList.add('open');
  } else {
    pendingState = currentState;
    initStateOverlay();
    const el = document.getElementById('state-overlay');
    if (el) el.classList.add('open');
  }
}

// ── INIT (called after data loads) ────────────────────────────────────
function init(){
  applyTheme(currentTheme);
  applyLangTheme(currentLang);
  showPage('home');
  updTopicBars();
  applyUILang();
  updStats();
  if (!S.lang) openOverlay('lang');
}

// ── DATA LOADER ────────────────────────────────────────────────────────
const DATA_FILES = [
  'data/questions.js',
  'data/states.js',
  'data/images.js',
  'data/vocabulary.js',
  'data/explanations.js',
  'data/translations.js',
  'data/metadata.js',
];

function loadScript(src){
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

// Apply theme immediately so there's no flash while data loads
applyTheme(currentTheme);

(async function(){
  const overlay = document.getElementById('loading-overlay');
  const bar     = document.getElementById('loading-bar');
  const status  = document.getElementById('loading-status');
  try {
    for (let i = 0; i < DATA_FILES.length; i++) {
      if (bar) bar.style.width = ((i / DATA_FILES.length) * 100) + '%';
      await loadScript(DATA_FILES[i]);
    }
    if (bar) bar.style.width = '100%';
    await new Promise(r => setTimeout(r, 150));
    if (overlay) overlay.style.display = 'none';
    init();
  } catch(e) {
    if (status){ status.textContent = 'Fehler beim Laden – bitte Seite neu laden.'; status.style.color = '#f05050'; }
    if (bar){ bar.style.background = '#f05050'; }
  }
})();
