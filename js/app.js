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
function saveS(){S.sk=streak;S.ld=lastDate;S.lang=currentLang;S.state=currentState;S.theme=currentTheme;if(v5User)S.v5user=v5User;localStorage.setItem('et5',JSON.stringify(S));}
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

// ── STREAK & CONFETTI ───────────────────────────────────────────────────
function updStreak(ok){const today=new Date().toDateString();if(ok&&lastDate!==today){streak++;lastDate=today;}saveS();updStats();}
function confetti(){
  const w=document.createElement('div');w.className='cw';document.body.appendChild(w);
  const acc=getComputedStyle(document.documentElement).getPropertyValue('--acc').trim();
  const c=[acc,'#f0c040','#3dd68c','#f05050',acc+'99','#f08030'];
  for(let i=0;i<90;i++){const p=document.createElement('div');p.className='cp';p.style.left=Math.random()*100+'vw';p.style.background=c[i%c.length];p.style.width=(5+Math.random()*8)+'px';p.style.height=(5+Math.random()*8)+'px';p.style.animationDuration=(1.2+Math.random()*2)+'s';p.style.animationDelay=Math.random()*0.6+'s';w.appendChild(p);}
  setTimeout(()=>w.remove(),4000);
}


// ══ V5 SHELL ══════════════════════════════════════════════════════════
const TOOL_LIST = [
  {id:'einb', ico:'📋', nm:'Einbürgerungstest', cnt:'310 Fragen',  status:'live', free:true,  grad:'linear-gradient(135deg,#4f8ef7,#7c5ef7)'},
  {id:'fuehr',ico:'🚗', nm:'Führerschein',      cnt:'1.000+ Fragen',status:'soon',free:false, grad:'linear-gradient(135deg,#f87171,#fb923c)'},
  {id:'b1',   ico:'🇩🇪',nm:'Deutsch B1',        cnt:'500+ Übungen',status:'beta', free:false, grad:'linear-gradient(135deg,#34d399,#059669)'},
  {id:'orient',ico:'🏛️',nm:'Orientierungskurs',cnt:'300 Fragen', status:'soon',free:false,   grad:'linear-gradient(135deg,#f0c040,#fb923c)'},
  {id:'sozial',ico:'🏥',nm:'Sozialversicherung',cnt:'Interaktiv', status:'soon',free:false,   grad:'linear-gradient(135deg,#7c5ef7,#ec4899)'},
  {id:'steuer',ico:'📊',nm:'Steuer-Guide',      cnt:'Interaktiv', status:'soon',free:false,   grad:'linear-gradient(135deg,#34d399,#4f8ef7)'},
];

let v5User = null;
let sessionStart = Date.now();

// ── Auth ──────────────────────────────────────────────────────────────
function showAuth(tab) {
  document.getElementById('v5-landing').style.display = 'none';
  document.getElementById('v5-auth').style.display = 'block';
  swTab(tab || 'login');
}
function swTab(tab) {
  document.getElementById('atab-li').classList.toggle('act', tab === 'login');
  document.getElementById('atab-su').classList.toggle('act', tab === 'signup');
  document.getElementById('form-login').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('form-signup').style.display = tab === 'signup' ? 'block' : 'none';
}
function doLogin() {
  const em = document.getElementById('li-em').value.trim();
  const pw = document.getElementById('li-pw').value;
  const err = document.getElementById('li-err');
  if (!em || !pw) { err.classList.add('show'); err.textContent = 'Bitte alle Felder ausfüllen.'; return; }
  const saved = S['u_' + em];
  if (saved && saved.pw === btoa(pw)) {
    v5User = {email: em, name: saved.name, plan: 'free'};
    err.classList.remove('show');
    enterApp(false);
  } else if (!saved) {
    err.classList.add('show'); err.textContent = 'Kein Konto gefunden. Bitte registrieren.';
  } else {
    err.classList.add('show'); err.textContent = 'Falsches Passwort.';
  }
}
function doSignup() {
  const fn  = document.getElementById('su-fn').value.trim();
  const ln  = document.getElementById('su-ln').value.trim();
  const em  = document.getElementById('su-em').value.trim();
  const pw  = document.getElementById('su-pw').value;
  const st  = document.getElementById('su-st').value;
  const err = document.getElementById('su-err');
  if (!fn || !em || !pw) { err.classList.add('show'); err.textContent = 'Pflichtfelder ausfüllen.'; return; }
  if (pw.length < 8)     { err.classList.add('show'); err.textContent = 'Passwort mind. 8 Zeichen.'; return; }
  S['u_' + em] = {name: fn + ' ' + ln, pw: btoa(pw), plan: 'free'};
  v5User = {email: em, name: fn + ' ' + ln, plan: 'free'};
  if (st) { currentState = st; }
  err.classList.remove('show');
  saveS();
  enterApp(false);
  showToast('success', 'Willkommen, ' + fn + '! 🎉');
}
function doSocial(provider) {
  v5User = {email: 'demo@germanypass.de', name: 'Demo Nutzer', plan: 'free'};
  showToast('info', provider + ' Login (Demo-Modus)');
  enterApp(false);
}
function doLogout() {
  closePM();
  v5User = null;
  saveS();
  document.getElementById('v5-app').style.display = 'none';
  document.getElementById('v5-landing').style.display = 'block';
}
function chkPw(v) {
  const b = document.getElementById('ps-fill');
  const s = v.length >= 12 && /[A-Z]/.test(v) && /[0-9]/.test(v) ? 3 : v.length >= 8 ? 2 : v.length >= 4 ? 1 : 0;
  b.style.width = ['0%','33%','66%','100%'][s];
  b.style.background = ['','var(--red)','var(--amber)','var(--grn)'][s];
}

// ── Enter App ─────────────────────────────────────────────────────────
function enterApp(guest) {
  if (guest) v5User = {email: '', name: 'Gast', plan: 'free', guest: true};
  document.getElementById('v5-landing').style.display = 'none';
  document.getElementById('v5-auth').style.display = 'none';
  const _appEl = document.getElementById('v5-app');
  _appEl.style.display = 'flex'; _appEl.style.flexDirection = 'column'; _appEl.style.minHeight = '100vh';
  buildTabs();
  updateUserUI();
  applyTheme(currentTheme);
  applyLangTheme(currentLang);
  saveS();
  // Inject quiz app into quiz-section on first load
  if (!document.getElementById('app')) {
    buildQuizSection();
  }
  if (!S.lang) {
    openOverlay('lang');
  } else {
    v5ShowPage('dashboard');
  }
}

function buildQuizSection() {
  // The v4 quiz app HTML lives here — injected dynamically
  const qs = document.getElementById('quiz-section');
  qs.innerHTML = `
    <div id="app" style="display:flex;min-height:calc(100vh - 52px)">
      <nav id="sidebar">
        <div class="sb-top">
          <div class="sb-hero">
            <div class="fl"><span style="background:#111"></span><span style="background:#cc0000"></span><span style="background:#ffce00"></span></div>
            <div><div class="sb-title">Einbürgerungstest</div><div class="sb-tagline">BAMF · Stand 07.05.2025</div></div>
          </div>
          <div class="sb-ver-row">
            <span class="sb-ver">Stand: 07.05.2025</span>
            <span class="sb-ver" style="color:var(--grn)">✓ Aktuell</span>
          </div>
          <div class="sb-selectors">
            <button class="sb-sel-btn" onclick="openOverlay('state')">
              <span class="sb-sel-icon">🗺️</span>
              <span class="sb-sel-content">
                <span class="sb-sel-label" id="sb-label-state">Bundesland</span>
                <span class="sb-sel-val" id="sel-state-val">Rheinland-Pfalz</span>
              </span><span class="sb-sel-arrow">›</span>
            </button>
            <button class="sb-sel-btn" onclick="openOverlay('lang')">
              <span class="sb-sel-icon" id="sb-lang-icon">🌍</span>
              <span class="sb-sel-content">
                <span class="sb-sel-label" id="sb-label-lang">Language</span>
                <span class="sb-sel-val" id="sel-lang-val">English</span>
              </span><span class="sb-sel-arrow">›</span>
            </button>
          </div>
        </div>
        <div class="sb-nav">
          <div class="nl" id="nl-start">Start</div>
          <button class="nb act" onclick="showPage('home')" id="nb-home"><span class="ni">🏠</span><span id="nb-home-txt">Übersicht</span></button>
          <button class="nb" onclick="startLearn()" id="nb-learn"><span class="ni">📖</span><span id="nb-learn-txt">Lernmodus</span><span class="nbadge">300</span></button>
          <button class="nb" onclick="startQuiz('all')" id="nb-quiz"><span class="ni">✏️</span><span id="nb-quiz-txt">Quiz</span><span class="nbadge">300</span></button>
          <button class="nb" onclick="startMock()" id="nb-mock"><span class="ni">🎯</span><span id="nb-mock-txt">Probetest</span><span class="nbadge">33</span></button>
          <button class="nb" onclick="startQuiz('weak')" id="nb-weak"><span class="ni">🔥</span><span id="nb-weak-txt">Schwache Fragen</span></button>
          <div class="nl">Bundesland</div>
          <button class="nb" onclick="startQuiz('state')" id="nb-state"><span class="ni">🗺️</span><span id="nb-state-label">Rheinland-Pfalz</span><span class="nbadge">10</span></button>
          <div class="nl">Themen</div>
          <button class="nb" onclick="startQuiz('topic',0)"><span class="ni">⚖️</span>Recht & Verfassung</button>
          <button class="nb" onclick="startQuiz('topic',1)"><span class="ni">🏛️</span>Politik & Wahlen</button>
          <button class="nb" onclick="startQuiz('topic',2)"><span class="ni">📜</span>Geschichte</button>
          <button class="nb" onclick="startQuiz('topic',3)"><span class="ni">🌍</span>Europa & Geografie</button>
          <button class="nb" onclick="startQuiz('topic',4)"><span class="ni">👨‍👩‍👧</span>Gesellschaft</button>
          <div class="nl">Extras</div>
          <button class="nb" onclick="showPage('vocab')" id="nb-vocab"><span class="ni">📚</span><span id="nb-vocab-txt">Vokabeln</span><span class="nbadge">143</span></button>
          <button class="nb" onclick="showPage('progress')" id="nb-prog"><span class="ni">📊</span><span id="nb-prog-txt">Fortschritt</span></button>
          <button class="nb" onclick="v5ShowPage('settings')"><span class="ni">⚙️</span><span id="nb-settings-txt">Einstellungen</span></button>
        </div>
        <div class="sb-stats">
          <div class="sc"><div class="sn g" id="st-k">0</div><div class="sl" id="sl-knew">Gewusst ✓</div></div>
          <div class="sc"><div class="sn r" id="st-n">0</div><div class="sl" id="sl-wrong">Falsch ✗</div></div>
          <div class="sc"><div class="sn o" id="st-s">0</div><div class="sl" id="sl-streak">Streak 🔥</div></div>
          <div class="sc"><div class="sn" id="st-t">0</div><div class="sl" id="sl-total">Gesamt</div></div>
        </div>
      </nav>
      <div style="flex:1;display:flex;flex-direction:column;">
        <main id="main">
<!-- HOME -->
<div id="hp" class="ani">
  <div class="ph"><h2 class="ptitle">Willkommen! 👋</h2><p class="psub">300 BAMF-Fragen · 16 Bundesländer · Vollständige Übersetzungen · Audio · SRS</p></div>
  <div class="hgrid">
    <div class="mc l" onclick="startLearn()"><div class="mico">📖</div><div class="mtit" id="mc-learn">Lernmodus</div><div class="mdesc">Karteikarten — Frage auf Deutsch &amp; Englisch, Antwort aufdecken</div></div>
    <div class="mc q" onclick="startQuiz('all')"><div class="mico">✏️</div><div class="mtit" id="mc-quiz">Quiz-Modus</div><div class="mdesc">Alle 300 Fragen mit Übersetzungen, Erklärungen, Vokabel-Hover</div></div>
    <div class="mc m" onclick="startMock()"><div class="mico">🎯</div><div class="mtit" id="mc-mock">Probetest</div><div class="mdesc">33 Fragen in 60 Minuten — genau wie der echte Einbürgerungstest</div></div>
    <div class="mc w" onclick="startQuiz('weak')"><div class="mico">🔥</div><div class="mtit" id="mc-weak">Schwache Fragen</div><div class="mdesc">Intelligente Spaced-Repetition-Wiederholung deiner Fehler</div></div>
  </div>
  <div class="pov"><div class="povt" id="pov-title">Themenübersicht</div><div id="tpbars"></div></div>
</div>

<!-- QUIZ CONTAINER -->
<div id="qc">
  <div class="qh">
    <button class="bs" onclick="exitQuiz()" style="padding:6px 10px;font-size:11px" id="btn-back">← Zurück</button>
    <div class="qpt"><span id="qcur">1</span> / <span id="qtot">0</span></div>
    <div class="pbo"><div class="pbi" id="qpb" style="width:0%"></div></div>
    <div class="timer-w" id="qtimer" style="display:none">
      <svg class="timer-svg" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="13" fill="none" stroke="var(--s3)" stroke-width="2.5"/>
        <circle id="tarc" cx="16" cy="16" r="13" fill="none" stroke="var(--acc)" stroke-width="2.5"
          stroke-dasharray="81.7 81.7" stroke-linecap="round" transform="rotate(-90 16 16)"/>
      </svg>
      <span class="timer-num" id="tnum">60:00</span>
    </div>
    <span class="qmb" id="qmb"></span>
  </div>

  <!-- NAV GRID -->
  <div class="qnav-bar" id="qnav-bar">
    <div class="qnav-top">
      <span class="qnav-label" id="qnav-title">Fragen (300)</span>
      <div class="qnav-legend">
        <span class="qnl-item"><span class="qnl-dot" style="background:rgba(61,214,140,.4)"></span>✓</span>
        <span class="qnl-item"><span class="qnl-dot" style="background:rgba(240,80,80,.4)"></span>✗</span>
        <span class="qnl-item"><span class="qnl-dot" style="background:rgba(108,143,255,.4)"></span>~</span>
        <span class="qnl-item"><span class="qnl-dot" style="background:var(--s3)"></span>?</span>
      </div>
    </div>
    <div class="qnav-grid" id="qnav-grid"></div>
  </div>

  <!-- LEARN -->
  <div id="lm">
    <div class="lcard ani" id="lcard">
      <div class="tags-row" id="ltags"></div>
      <div class="len" id="len"></div>
      <div class="lq" id="lq"></div>
      <div id="lqimg"></div>
      <button class="rvbtn" onclick="revealAnswer()" id="rvbtn">👁️ Antwort anzeigen</button>
      <div class="ar" id="ar">
        <div class="al" id="al-label">✓ RICHTIGE ANTWORT</div>
        <div class="at" id="lat"></div>
        <div class="at-en" id="lat-en"></div>
        <div id="laimg"></div>
        <div class="expl" id="lexpl">
          <div class="expl-head" id="expl-head-l">💡 ERKLÄRUNG</div>
          <div class="expl-de" id="lexpl-de"></div>
          <div class="expl-en" id="lexpl-en"></div>
        </div>
      </div>
      <div class="kbtns" id="kbtns" style="display:none">
        <button class="kb ky" onclick="markKnown(true)" id="btn-know">✓ Weiß ich</button>
        <button class="kb kn" onclick="markKnown(false)" id="btn-notyet">✗ Noch nicht</button>
      </div>
      <div class="qa" style="justify-content:space-between;margin-top:14px">
        <button class="bs" onclick="lPrev()" id="btn-lback">← Zurück</button>
        <button class="bp" onclick="lNext()" id="btn-lnext">Weiter →</button>
      </div>
    </div>
  </div>

  <!-- QUIZ -->
  <div id="qm" style="display:none">
    <div class="qcard ani" id="qcard">
      <div class="tags-row" id="qtags"></div>
      <div class="bili">
        <div class="bili-en" id="qen"></div>
        <div class="bili-de" id="qde"></div>
      </div>
      <div id="qimg2"></div>
      <div class="og" id="oc"></div>
      <div class="fb" id="fb"></div>
      <div class="expl" id="expl">
        <div class="expl-head" id="expl-head-q">💡 ERKLÄRUNG</div>
        <div class="expl-de" id="expl-de"></div>
        <div class="expl-en" id="expl-en"></div>
      </div>
    </div>
    <div class="qa">
      <button class="tts-btn" id="tts-btn" onclick="speakQ()">🔊</button>
      <span class="srs-b" id="srs-info"></span>
      <button class="bd" onclick="skipQ()" id="btn-skip">Überspringen</button>
      <button class="bp" onclick="nextQ()" id="btn-next" style="display:none">Nächste →</button>
    </div>
  </div>
</div>

<!-- RESULTS -->
<div id="rp">
  <div class="rh ani">
    <div class="rscore" id="rsc"></div>
    <div class="rl" id="rl"></div>
    <div class="rbadge" id="rb"></div>
    <div class="rstats">
      <div class="rs"><div class="rsn g" id="rrc">0</div><div class="rsl" id="rsl-correct">Richtig</div></div>
      <div class="rs"><div class="rsn r" id="rrw">0</div><div class="rsl" id="rsl-wrong">Falsch</div></div>
      <div class="rs"><div class="rsn" style="color:var(--txt2)" id="rrp">0%</div><div class="rsl">%</div></div>
    </div>
    <div style="display:flex;gap:9px;justify-content:center">
      <button class="bp" onclick="restartQ()" id="btn-retry">🔄 Wiederholen</button>
      <button class="bs" onclick="showPage('home')" id="btn-home2">🏠 Übersicht</button>
    </div>
  </div>
  <div id="wlc" style="display:none">
    <h3 style="font-size:13px;font-weight:600;margin-bottom:11px;color:var(--txt2)" id="wl-title">❌ Falsch beantwortet</h3>
    <div id="wl"></div>
  </div>
</div>

<!-- PROGRESS -->
<div id="pp">
  <div class="ph"><h2 class="ptitle" id="prog-title">Mein Fortschritt 📊</h2><p class="psub">Alle 300 Fragen — klicke auf ein Kästchen zum Üben</p></div>
  <div style="background:var(--s1);border:1px solid var(--bord);border-radius:var(--r);padding:16px;margin-bottom:12px">
    <div class="leg">
      <div class="li"><div class="ld" style="background:var(--s3)"></div>Unberührt</div>
      <div class="li"><div class="ld" style="background:rgba(108,143,255,.5)"></div>Gesehen</div>
      <div class="li"><div class="ld" style="background:rgba(61,214,140,.5)"></div>Gewusst</div>
      <div class="li"><div class="ld" style="background:rgba(240,80,80,.5)"></div>Falsch</div>
    </div>
    <div class="pgrid" id="pgrid"></div>
  </div>
  <div style="display:flex;gap:7px">
    <button class="bp" onclick="startQuiz('weak')" id="btn-weak2">🔥 Schwache üben</button>
    <button class="bd" onclick="resetProg()">🗑️ Zurücksetzen</button>
  </div>
</div>

<!-- VOCAB -->
<div id="vp">
  <div class="ph"><h2 class="ptitle">Vokabular-Glossar 📚</h2><p class="psub">143 wichtige Begriffe — hover über unterstrichene Wörter für sofortige Übersetzung</p></div>
  <input class="vsearch" type="text" placeholder="Begriff oder Übersetzung suchen..." oninput="filterVocab(this.value)">
  <div class="vgrid" id="vgrid"></div>
</div>

<!-- SETTINGS -->
<div id="settings-page">
  <div class="ph"><h2 class="ptitle" id="settings-title">⚙️ Einstellungen</h2></div>
  <div class="set-card">
    <h3 id="set-theme-title">Erscheinungsbild / Theme</h3>
    <div class="set-row">
      <div><div class="set-label" id="set-theme-label">Farbschema</div><div class="set-sub" id="set-theme-sub">Helles oder dunkles Design wählen</div></div>
      <div class="theme-btns">
        <button class="theme-btn" onclick="setTheme('light')" id="btn-light">☀️ Hell</button>
        <button class="theme-btn" onclick="setTheme('dark')" id="btn-dark">🌙 Dunkel</button>
        <button class="theme-btn act" onclick="setTheme('system')" id="btn-system">💻 System</button>
      </div>
    </div>
    <div class="set-row">
      <div><div class="set-label" id="set-accent-label">Sprachakzent</div><div class="set-sub" id="set-accent-sub">Akzentfarbe basierend auf deiner Sprache</div></div>
      <div class="set-preview" id="accent-preview">
        <div class="set-preview-accent" id="accent-swatch"></div>
        <span id="accent-name" style="font-size:12px;color:var(--txt2)">Blue (English)</span>
      </div>
    </div>
  </div>
  <div class="set-card">
    <h3 id="set-lang-title">Sprache / Language</h3>
    <div class="set-row">
      <div><div class="set-label">Aktuelle Sprache</div><div class="set-sub" id="set-cur-lang">English</div></div>
      <button class="bp" onclick="changeLang()" style="padding:7px 14px;font-size:12px" id="btn-change-lang">Ändern</button>
    </div>
    <div class="set-row">
      <div><div class="set-label">Bundesland</div><div class="set-sub" id="set-cur-state">Rheinland-Pfalz</div></div>
      <button class="bp" onclick="changeState()" style="padding:7px 14px;font-size:12px" id="btn-change-state">Ändern</button>
    </div>
  </div>
  <div class="set-card">
    <h3>Daten</h3>
    <div class="set-row">
      <div><div class="set-label">Fortschritt zurücksetzen</div><div class="set-sub">Alle Lerndaten löschen</div></div>
      <button class="bd" onclick="resetProg()">🗑️ Löschen</button>
    </div>
  </div>
</div>

<!-- LEGAL -->
<div id="legal-page">
  <div class="ph"><h2 class="ptitle">Impressum & Rechtliches</h2></div>
  <div class="legal-box">
    <h3>Impressum (Legal Notice)</h3>
    <p>This application is an independent, unofficial educational tool to prepare for the German Einbürgerungstest. It is not affiliated with, endorsed by, or connected to the Bundesamt für Migration und Flüchtlinge (BAMF) or the German government.</p>
  </div>
  <div class="legal-box">
    <h3>Haftungsausschluss (Disclaimer)</h3>
    <p>Die Fragen basieren auf dem offiziellen BAMF-Fragenkatalog (Stand: 07.05.2025). Keine Gewähr für Aktualität und Richtigkeit. Offizielle Informationen: <a href="https://www.bamf.de" target="_blank">www.bamf.de</a> und <a href="https://oet.bamf.de" target="_blank">oet.bamf.de</a>.</p>
    <p>BAMF-Quellenangabe: Gesamtfragenkatalog zum Test „Leben in Deutschland" und zum „Einbürgerungstest", Stand: 07.05.2025. © Bundesamt für Migration und Flüchtlinge.</p>
  </div>
  <div class="legal-box">
    <h3>Datenschutzerklärung (Privacy Policy)</h3>
    <p>Diese App läuft vollständig im Browser. Es werden keine persönlichen Daten gesammelt, übertragen oder gespeichert. Der Lernfortschritt wird ausschließlich im lokalen Browser-Speicher (localStorage) gespeichert und verlässt niemals dein Gerät.</p>
  </div>
  <div class="legal-box">
    <h3>Developer Notes — Updating Questions</h3>
    <p>When BAMF releases a new question catalog, update this app by:</p>
    <p>1. Download the new PDF from <a href="https://oet.bamf.de" target="_blank">oet.bamf.de</a><br>
    2. Share the PDF with Claude (claude.ai)<br>
    3. Say: <code>"Here is the updated BAMF PDF (Stand: [date]). Rebuild einbuergerungstest_v4.html with updated questions, preserve all features."</code><br>
    4. Claude extracts all questions, answers, and state sections automatically.</p>
  </div>
</div>
        </main>
        <div class="footer-strip">
          <span>Einbürgerungstest Trainer · Stand: 07.05.2025</span>
          <span><a href="#" onclick="openOverlay('lang');return false" style="color:var(--txt3)">Sprache</a> · <a href="https://www.bamf.de" target="_blank" style="color:var(--txt3)">BAMF ↗</a></span>
        </div>
      </div>
    </div>`;
  // Trigger v4 home render
  setTimeout(() => {
    if (typeof showPage === 'function') { showPage('home'); updTopicBars(); }
    applyUILang();
    updStats();
  }, 50);
}

// ── Top Nav ───────────────────────────────────────────────────────────
function buildTabs() {
  const c = document.getElementById('v5-ttabs');
  if (!c) return;
  c.innerHTML = TOOL_LIST.map(tool => {
    const isLocked = !tool.free;
    const click = tool.free
      ? "v5ShowPage('quiz')"
      : "showToast('info','" + tool.nm + " kommt bald — Upgrade auf Pro!')";
    return '<button class="ttab ' + (tool.id === 'einb' ? 'act' : '') + (isLocked ? ' locked-t' : '') + '" ' +
      'id="tt-' + tool.id + '" onclick="' + click + '">' +
      tool.ico + ' ' + tool.nm +
      (tool.status === 'live' ? ' <span class="ttab-badge">Live</span>' : '') +
      (isLocked ? ' 🔒' : '') + '</button>';
  }).join('');
}
function updateUserUI() {
  if (!v5User) return;
  const initials = v5User.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  const av = document.getElementById('v5-avatar');
  if (av) av.textContent = initials;
  const pnm = document.getElementById('v5-pm-name');
  if (pnm) pnm.textContent = v5User.name;
  const pem = document.getElementById('v5-pm-email');
  if (pem) pem.textContent = v5User.email || 'Gast-Modus';
  const sp = document.getElementById('v5-streak');
  if (sp) sp.textContent = '🔥 ' + (streak || 0);
  const wbnm = document.getElementById('wb-nm');
  if (wbnm) wbnm.textContent = v5User.name.split(' ')[0] + '!';
}
function togglePM() { document.getElementById('v5-pmenu').classList.toggle('open'); }
function closePM()  { document.getElementById('v5-pmenu').classList.remove('open'); }
document.addEventListener('click', e => {
  const av = document.getElementById('v5-avatar');
  const pm = document.getElementById('v5-pmenu');
  if (pm && av && !av.contains(e.target) && !pm.contains(e.target)) pm.classList.remove('open');
});

// ── Page routing ──────────────────────────────────────────────────────
function v5ShowPage(p) {
  const pages = ['dash-view', 'quiz-section', 'v5-progress', 'v5-settings', 'v5-legal'];
  pages.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  closePM();
  // Highlight tool tab
  document.querySelectorAll('.ttab').forEach(t => t.classList.remove('act'));
  if (p === 'quiz') document.getElementById('tt-einb')?.classList.add('act');

  if (p === 'dashboard') {
    document.getElementById('dash-view').style.display = 'block';
    renderDashboard();
  } else if (p === 'quiz') {
    document.getElementById('quiz-section').style.display = 'block';
    if (!document.getElementById('app')) buildQuizSection();
    else { if (typeof showPage === 'function') showPage('home'); }
  } else if (p === 'progress') {
    document.getElementById('v5-progress').style.display = 'block';
    renderV5PGrid();
  } else if (p === 'settings') {
    document.getElementById('v5-settings').style.display = 'block';
    updateSettingsView();
  } else if (p === 'legal') {
    document.getElementById('v5-legal').style.display = 'block';
  }
}
function updateSettingsView() {
  const lt = LT[currentLang] || LT['en'];
  const el1 = document.getElementById('set-lang-val');
  if (el1) el1.textContent = lt.flag + ' ' + lt.name;
  const el2 = document.getElementById('set-state-val');
  if (el2) el2.textContent = currentState;
  const el3 = document.getElementById('set-plan');
  if (el3) el3.textContent = v5User?.plan === 'pro' ? 'Pro ⭐' : 'Free';
  ['tbtn-light','tbtn-dark','tbtn-system'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('act', id === 'tbtn-' + currentTheme);
  });
}

// ── Landing Tools ─────────────────────────────────────────────────────
function buildLandingTools() {
  const g = document.getElementById('landing-tools');
  if (!g) return;
  const statusLabel = {live: 'Live ✓', beta: 'Beta', soon: 'Coming soon'};
  const tagCls      = {live: 'live-tag', beta: 'beta-tag', soon: 'soon-tag'};
  g.innerHTML = TOOL_LIST.map(t =>
    '<div class="tc ' + (t.status !== 'live' ? 'locked' : '') + '" style="--tcg:' + t.grad + '" ' +
    'onclick="' + (t.id === 'einb' ? 'enterApp(true)' : "showToast('info','" + t.nm + " coming soon!')") + '">' +
    '<div class="tc-ico">' + t.ico + '</div>' +
    '<span class="tc-tag ' + tagCls[t.status] + '">' + statusLabel[t.status] + '</span>' +
    '<div class="tc-nm">' + t.nm + '</div>' +
    '<div class="tc-desc">' + t.cnt + '</div>' +
    '<div class="tc-foot"><span class="tc-cnt">' + t.cnt + '</span>' +
    '<span style="font-size:12px;font-weight:600;color:' + (t.free ? 'var(--acc)' : 'var(--txt3)') + '">' + (t.free ? 'Kostenlos' : '🔒 Pro') + '</span></div>' +
    '</div>'
  ).join('');
}

// ── Dashboard ─────────────────────────────────────────────────────────
function renderDashboard() {
  if (!v5User) return;
  updateUserUI();
  const stQ = STATS[currentState] || [];
  let known = 0;
  GQ.forEach(q => { if (getS(q.num, q.section) === 'k') known++; });
  const pct = Math.round(known / GQ.length * 100);
  const fill = document.getElementById('wb-fill');
  if (fill) fill.style.width = pct + '%';
  const wbl = document.getElementById('wb-learned');
  if (wbl) wbl.textContent = known + ' von ' + GQ.length + ' gelernt';
  const wbp = document.getElementById('wb-pct');
  if (wbp) wbp.textContent = pct + '%';
  document.getElementById('ds-known').textContent = known;
  document.getElementById('ds-streak').textContent = streak;
  const mins = Math.max(0, Math.round((Date.now() - sessionStart) / 60000));
  document.getElementById('ds-time').textContent = mins;
  const tc = S._tc || 0, tw = S._tw || 0;
  document.getElementById('ds-acc').textContent = tc + tw > 0 ? Math.round(tc / (tc + tw) * 100) + '%' : '–';
  renderActChart();
  renderContItems();
  renderBadges();
  renderLboard();
}
function renderActChart() {
  const bars = document.getElementById('act-bars');
  const lbls = document.getElementById('act-lbls');
  if (!bars) return;
  const today = new Date();
  const data = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    data.push({c: S['act_' + d.toDateString()] || 0, d, today: i === 0});
  }
  const mx = Math.max(...data.map(x => x.c), 1);
  bars.innerHTML = data.map(x =>
    '<div class="abar ' + (x.today ? 'today' : '') + '" style="height:' + Math.max(3, Math.round(x.c / mx * 52)) + 'px" title="' + x.c + ' Antworten"></div>'
  ).join('');
  const dn = ['So','Mo','Di','Mi','Do','Fr','Sa'];
  lbls.innerHTML = data.map(x => '<div class="abar-l">' + (x.today ? 'H' : dn[x.d.getDay()]) + '</div>').join('');
  const tot = data.reduce((a, b) => a + b.c, 0);
  const el = document.getElementById('act-tot');
  if (el) el.textContent = tot + ' Antworten (2 Wochen)';
}
function renderContItems() {
  const el = document.getElementById('cont-items');
  if (!el) return;
  const k = GQ.filter(q => getS(q.num, 'general') === 'k').length;
  const w = [...GQ, ...(STATS[currentState] || [])].filter(q => getS(q.num, q.section) === 'n').length;
  const u = GQ.filter(q => getS(q.num, 'general') === 'u').length;
  const pct = Math.round(k / GQ.length * 100);
  const items = [
    {ico:'📋', nm:'Einbürgerungstest', mt: k + '/300 gewusst', p: pct, fn: "v5ShowPage('quiz')"},
    ...(w ? [{ico:'🔥', nm:'Schwache Fragen üben', mt: w + ' zum Wiederholen', p: 0, fn: "v5ShowPage('quiz');setTimeout(()=>startQuiz('weak'),60)"}] : []),
    ...(u ? [{ico:'✏️', nm:'Neue Fragen lernen', mt: u + ' noch neu', p: 100 - Math.round(u / 300 * 100), fn: "v5ShowPage('quiz');setTimeout(()=>startLearn(),60)"}] : []),
  ];
  el.innerHTML = items.map(x =>
    '<div class="ci" onclick="' + x.fn + '">' +
    '<div class="ci-ico">' + x.ico + '</div>' +
    '<div class="ci-inf"><div class="ci-nm">' + x.nm + '</div><div class="ci-mt">' + x.mt + '</div></div>' +
    '<div class="ci-prog"><div class="ci-pb"><div class="ci-pf" style="width:' + x.p + '%"></div></div><div class="ci-pc">' + x.p + '%</div></div>' +
    '</div>'
  ).join('');
}
function renderBadges() {
  const el = document.getElementById('bdg-grid');
  if (!el) return;
  const k = GQ.filter(q => getS(q.num, 'general') === 'k').length;
  const b = [
    ['🌱','Start', k >= 1], ['⭐','10er', k >= 10], ['🔥','50er', k >= 50], ['💪','100er', k >= 100],
    ['🎯','200er', k >= 200], ['🏆','Profi', k >= 300], ['📅','7 Tage', streak >= 7], ['🌍','Global', !!S.lang && S.lang !== 'en'],
  ];
  el.innerHTML = b.map(x =>
    '<div class="bdg ' + (x[2] ? 'earned' : 'locked-b') + '" title="' + x[1] + '"><span>' + x[0] + '</span><span class="bdg-n">' + x[1] + '</span></div>'
  ).join('');
}
function renderLboard() {
  const el = document.getElementById('v5-lboard');
  if (!el) return;
  const k = GQ.filter(q => getS(q.num, 'general') === 'k').length;
  const lb = [
    {n:'Ahmad K.', s:287, c:'#4f8ef7'}, {n:'Maria L.', s:241, c:'#34d399'},
    {n:'Yuki T.', s:218, c:'#fb923c'},  {n: v5User?.name || 'Du', s:k, c:'var(--acc2)', you:true},
  ].sort((a, b) => b.s - a.s);
  const rc = ['g','s','b',''];
  el.innerHTML = lb.map((p, i) =>
    '<div class="lb-row">' +
    '<span class="lb-rk ' + (rc[Math.min(i, 3)]) + '">' + (i + 1) + '</span>' +
    '<div class="lb-av" style="background:' + p.c + '">' + p.n[0] + '</div>' +
    '<span class="lb-nm">' + p.n + (p.you ? '<span class="lb-you">Du</span>' : '') + '</span>' +
    '<span class="lb-sc">' + p.s + '</span></div>'
  ).join('');
}

// ── Progress grid ─────────────────────────────────────────────────────
function renderV5PGrid() {
  const g = document.getElementById('v5-pgrid');
  if (!g) return;
  g.innerHTML = '';
  GQ.forEach(q => {
    const s = getS(q.num, 'general');
    const d = document.createElement('div');
    d.style.cssText = 'width:100%;padding-top:100%;border-radius:3px;cursor:pointer;position:relative;transition:transform .1s;';
    const colors = {u:'var(--s3)', s:'rgba(79,142,247,.45)', k:'rgba(52,211,153,.45)', n:'rgba(248,113,113,.45)'};
    d.style.background = colors[s] || colors.u;
    d.title = 'Q' + q.num + ': ' + q.question.substring(0, 40) + '…';
    d.onmouseenter = () => d.style.transform = 'scale(1.3)';
    d.onmouseleave = () => d.style.transform = '';
    d.onclick = () => { v5ShowPage('quiz'); setTimeout(() => { startQuiz('all'); }, 60); };
    g.appendChild(d);
  });
}
function v5ResetProg() {
  if (!confirm('Gesamten Fortschritt zurücksetzen?')) return;
  // Keep accounts and settings
  const keep = {};
  Object.keys(S).filter(k => k.startsWith('u_') || ['lang','state','theme','v5user','hasSetup'].includes(k)).forEach(k => keep[k] = S[k]);
  localStorage.removeItem('et5'); S = {...keep}; streak = 0;
  saveS(); updStats(); renderV5PGrid(); renderDashboard();
  showToast('success', 'Fortschritt zurückgesetzt');
}

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

// Track answers for stats
const _origPick = typeof pick === 'function' ? pick : null;

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
function confirmLang() {
  // Delegate to v4 selectLang but adapted for v5
  currentLang = pendingLang;
  const el = document.getElementById('lang-overlay');
  if (el) el.classList.remove('open');
  applyLangTheme(currentLang);
  applyUILang();
  saveS();
  // After lang, show state overlay
  setTimeout(() => openOverlay('state'), 80);
}
function confirmState() {
  currentState = pendingState;
  const el = document.getElementById('state-overlay');
  if (el) el.classList.remove('open');
  const stLbl = document.getElementById('nb-state-label');
  if (stLbl) stLbl.textContent = currentState.length > 14 ? currentState.substring(0, 12) + '…' : currentState;
  const selSt = document.getElementById('sel-state-val');
  if (selSt) selSt.textContent = currentState;
  saveS();
  if (!S.hasSetup) { S.hasSetup = true; saveS(); }
}
// Fix v4 overlay functions to use class instead of inline style
function selectLang() { confirmLang(); }
function selectState() { confirmState(); }

// ── INIT ──────────────────────────────────────────────────────────────
applyTheme(currentTheme);
applyLangTheme(currentLang);
buildLandingTools();

// Auto-login if session exists
if (S.lang && S.state && S.v5user) {
  v5User = S.v5user;
  currentLang = S.lang;
  currentState = S.state;
  currentTheme = S.theme || 'dark';
  streak = S.sk || 0;
  lastDate = S.ld || null;
  enterApp(false);
} else if (S.lang && S.state) {
  // Had settings but no user → guest mode
  v5User = {name: 'Gast', email: '', plan: 'free', guest: true};
  currentLang = S.lang;
  currentState = S.state;
  streak = S.sk || 0;
  lastDate = S.ld || null;
  enterApp(false);
} else {
  document.getElementById('v5-landing').style.display = 'block';
}
