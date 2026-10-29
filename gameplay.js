'use strict';
function modelFor(mode){return state.learning[mode];}
function pool(){return symbolPoolFor(modelFor('listen').level);}
function questionKey(){return game.mode==='listen'?game.q.z:game.mode+':'+game.q.z;}
function start(mode){
  stopAudio();game={mode:mode==='mixed'?'picture':mode,sessionMode:mode,route:['picture','spell','detective','tone','picture'],index:0,first:0,hadError:false,locked:false,finished:false,questions:[],used:[],filled:[],awarded:false};
  page='game';renderQuestion();window.scrollTo(0,0);
}
function renderQuestion(){
  stopAudio();const g=game;if(!g)return;if(g.index===5){finish();return;}
  g.mode=g.sessionMode==='mixed'?g.route[g.index]:g.sessionMode;
  g.hadError=false;g.locked=false;g.errors=0;g.reduced=false;g.partIndex=0;g.partReady=false;g.filled=[];g.used=[];g.pictureChoices=null;g.pictureReady=false;g.picturePhase='image';g.detective=null;
  const model=modelFor(g.mode);g.level=model.level;
  g.q=chooseCurriculumQuestion(g.mode,model,state.topic,g.questions.map(q=>q.id),shuffle);
  if(!g.q){if(g.questions.length){finish();}else{go('home');toast('這個主題目前沒有適合的題目，試試其他主題吧！');}return;}
  g.questions.push(g.q);save();
  const q=g.q;
  const heading=g.mode==='listen'?'寶藏藏在哪個注音？':g.mode==='spell'?`一起拼出「${q.word}」`:g.mode==='picture'?'聽聽看，要找哪張圖？':g.mode==='detective'?`修好「${q.word}」的注音`:'找出聲音走的路線';
  const icon=g.mode==='picture'||g.mode==='listen'?'🎁':g.mode==='spell'||g.mode==='detective'?q.emoji:'🎢';
  const route=g.sessionMode==='mixed'?`<div class="mixed-route" aria-label="本回合任務順序">${g.route.map((m,i)=>`<span class="${i===g.index?'current':i<g.index?'done':''}"><b>${i<g.index?'✓':({picture:'🖼️',spell:'🌉',detective:'🔎',tone:'🎢'})[m]}</b><small>${MODE_LABELS[m]}</small></span>`).join('')}</div>`:'';
  screen.innerHTML=`<section class="game"><div class="game-head"><button class="secondary" id="exit-game">‹ 地圖</button><div class="track"><div style="width:${g.index*20}%"></div></div><small>${g.index+1} / 5</small></div>${route}<div class="panel"><div class="eyebrow">${g.sessionMode==='mixed'?'混合小任務 · ':''}${MODE_NAMES[g.mode]}</div><div class="stage-pill">${stageName(g.mode,g.level)}</div><h2>${heading}</h2><div class="scene"><span class="big">🦊</span><div class="stepping">${Array.from({length:5},(_,i)=>`<span class="${i<g.index?'done':''}">${i<g.index?'★':'·'}</span>`).join('')}</div><span class="big">${icon}</span></div>${g.mode==='tone'?`<p>${q.word.length>1?`聽「${q.word}」，找出「${q.target}」的聲調。`:'聽聽看，是哪一種聲調？'}</p>`:''}<button class="listen" id="replay">🔊 ${g.mode==='listen'?'聽寶藏密語':g.mode==='spell'?'聽整個字詞':g.mode==='picture'?'聽要找的字詞':g.mode==='detective'?'聽正確字音':'播放聲音'}</button>${g.mode==='tone'?'<small>一聲 — 是練習提示，平常注音不標。</small>':''}<div id="spell-lesson" hidden></div><div id="answer-area"></div><div id="feedback" class="feedback" role="status" aria-live="polite">${g.mode==='spell'?'先認識字音，再把小橋搭好。':'先按喇叭，再選答案。'}</div><div class="row" style="justify-content:center"><button class="secondary" id="hint">${g.mode==='spell'?'📖 看拼音示範':'💡 給我提示'}</button><button class="primary" id="next" hidden>繼續探險 →</button></div>${g.mode==='listen'?'':'<small class="voice-note">字詞使用裝置的台灣中文語音；沒有語音時，可由家長陪讀。</small>'}</div></section>`;
  $('#exit-game').onclick=()=>go('home');$('#replay').onclick=()=>g.mode==='listen'?soundSymbol(q.z):speakWord(q.word);
  $('#hint').onclick=hint;$('#next').onclick=()=>{if(!g.locked)return;stopAudio();g.index++;renderQuestion();};
  if(g.mode==='spell')renderSpell();else if(g.mode==='picture')renderPicture();else if(g.mode==='detective')renderDetective();else renderChoices();
}
function renderChoices(){
  const g=game,q=g.q;let opts;
  if(g.mode==='listen'){
    const count=g.level===1?2:g.level<=3?3:4;
    const preferred=g.level>=4?(CONFUSABLE.find(group=>group.includes(q.z))||[]):[];
    opts=answerChoices(q.z,pool().map(s=>s.z),count,shuffle,preferred).map(z=>({label:z,key:z}));
  }else{
    const allowed=g.level===1?['一聲','四聲']:g.level===2?['一聲','二聲','四聲']:g.level===3?['一聲','二聲','三聲','四聲']:TONE_OPTIONS.map(t=>t.answer);
    opts=TONE_OPTIONS.filter(t=>allowed.includes(t.answer)).map(t=>({label:t.mark,key:t.answer,sub:t.answer+' · '+t.shape}));
  }
  $('#answer-area').innerHTML=`<div class="choices">${opts.map(o=>`<button class="choice" data-answer="${o.key}" aria-label="${o.key}">${o.label}${o.sub?`<small>${o.sub}</small>`:''}</button>`).join('')}</div>`;
  document.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{
    if(g.locked||b.disabled)return;
    const correct=g.mode==='listen'?q.z:q.answer;
    if(b.dataset.answer===correct){b.classList.add('correct');win();}
    else{b.classList.add('wrong');b.disabled=true;wrong();}
  });
}
function currentPart(){return game.q.parts[game.partIndex];}
function syllableTokens(){return [...currentPart().z];}
function renderSpell(skipLesson=false){
  const g=game,part=currentPart(),tokens=syllableTokens();$('#hint').hidden=false;$('#answer-area').hidden=false;$('#spell-lesson').hidden=true;g.filled=[];g.used=[];g.partReady=false;
  g.kind=g.level<=2||g.level===4?'missing':'assemble';
  const heading=`<div class="word-parts">${g.q.parts.map((p,i)=>`<span class="${i===g.partIndex?'current':i<g.partIndex?'done':''}">${i<g.partIndex?'✓ ':''}${p.word}</span>`).join('')}</div><p class="sub">${g.q.parts.length>1?`第 ${g.partIndex+1} 個字：`:'這個字：'}${part.word} · ${g.kind==='missing'?'找出空格缺少的注音':tokens.includes('˙')?'輕聲放最前面，再排注音':'先放注音，再放聲調'}</p>`;
  if(g.kind==='missing'){
    let indices=tokens.map((_,i)=>i);if(g.level===1)indices=indices.filter(i=>!TONE_MARKS.includes(tokens[i]));
    g.missingIndex=pick(indices);g.missingAnswer=tokens[g.missingIndex];
    const isTone=TONE_MARKS.includes(g.missingAnswer);
    const candidates=isTone?TONE_MARKS:SYMBOLS.map(s=>s.z);
    const preferred=CONFUSABLE.find(x=>x.includes(g.missingAnswer))||[];
    g.missingChoices=answerChoices(g.missingAnswer,candidates,g.level===1||g.reduced?2:3,shuffle,preferred);
    $('#answer-area').innerHTML=heading+`<div class="slots">${tokens.map((z,i)=>`<div class="slot ${i===g.missingIndex?'missing':'given'}">${i===g.missingIndex?'？':z}</div>`).join('')}</div><div class="choices">${g.missingChoices.map(z=>`<button class="choice" data-missing="${z}" aria-label="缺少的${isTone?'聲調':'注音'} ${z}">${z}</button>`).join('')}</div><button class="primary" id="next-part" hidden>下一個字 →</button>`;
    document.querySelectorAll('[data-missing]').forEach(b=>b.onclick=()=>{
      if(g.locked||g.partReady||b.disabled)return;
      if(b.dataset.missing===g.missingAnswer){b.classList.add('correct');$('.slot.missing').textContent=g.missingAnswer;partSolved();}
      else{b.classList.add('wrong');b.disabled=true;wrong();}
    });
  }else{
    const extraCount=g.reduced?0:g.level>=5?2:1;
    const extras=shuffle(SYMBOLS.map(s=>s.z).filter(z=>!tokens.includes(z))).slice(0,extraCount);
    g.tiles=shuffle([...tokens,...extras]);
    $('#answer-area').innerHTML=heading+`<div class="slots" id="slots"></div><div class="tilebank">${g.tiles.map((z,i)=>`<button data-tile="${i}" aria-label="積木 ${z}">${z}</button>`).join('')}</div><button class="secondary" id="undo">↶ 拿回一塊</button> <button class="primary" id="check">搭好橋了！</button><button class="primary" id="next-part" hidden>下一個字 →</button>`;
    refreshSlots();
    document.querySelectorAll('[data-tile]').forEach(b=>b.onclick=()=>{if(g.locked||g.partReady||b.disabled||g.filled.length>=tokens.length)return;const i=Number(b.dataset.tile);g.filled.push(g.tiles[i]);g.used.push(i);b.disabled=true;refreshSlots();});
    $('#undo').onclick=()=>{if(g.locked||g.partReady)return;const i=g.used.pop();g.filled.pop();if(i!==undefined)document.querySelector(`[data-tile="${i}"]`).disabled=false;refreshSlots();};
    $('#check').onclick=()=>{if(g.locked||g.partReady)return;if(g.filled.length<tokens.length){feedback('還有空格，繼續放積木。');return;}if(g.filled.join('')===part.z)partSolved();else wrong();};
  }
  $('#next-part').onclick=()=>{if(!g.partReady||g.locked)return;g.partIndex++;stopAudio();renderSpell();feedback('新的一座小橋，換這個字了。');};
  if(!skipLesson&&(g.level===1||!state.lessons[g.q.id+':'+g.partIndex]||g.needsLesson)){showLesson(false);g.needsLesson=false;}
}
function refreshSlots(){const tokens=syllableTokens();$('#slots').innerHTML=tokens.map((_,i)=>`<div class="slot">${game.filled[i]||'·'}</div>`).join('');}
function partSolved(){
  const g=game;if(g.locked||g.partReady)return;
  if(g.partIndex===g.q.parts.length-1){win();return;}
  g.partReady=true;document.querySelectorAll('[data-tile],[data-missing],#check,#undo').forEach(b=>b.disabled=true);
  chime();feedback(`「${currentPart().word}」拼好了！再拼下一個字。`,true);$('#next-part').hidden=false;$('#hint').hidden=true;
}
function showLesson(assisted=true){
  const g=game;if(!g||g.locked||g.mode!=='spell')return;stopAudio();if(assisted)g.hadError=true;
  const part=currentPart(),mark=[...part.z].find(z=>TONE_MARKS.includes(z));
  $('#spell-lesson').innerHTML=`<div class="lesson-card"><div class="eyebrow">一起學拼音</div><h3>先聽注音，再聽「${part.word}」</h3><p class="sub">先聽每個注音，再聽完整字音；聲調跟著完整字音聽。</p><div class="formula">${[...part.z].map((z,i)=>`${i?'<span class="join">＋</span>':''}${TONE_MARKS.includes(z)?`<span class="tone-card">${z}<small>${TONE_OPTIONS.find(t=>t.mark===z).answer}</small></span>`:`<button data-demo-symbol="${z}" aria-label="聽注音 ${z}">${z}<small>🔊</small></button>`}`).join('')}</div><div class="blend-result" id="blend-result"><span class="blend-arrow" aria-hidden="true">→</span><strong aria-label="${part.z}">${[...part.z].map((z,i,a)=>`<span class="blend-letter" aria-hidden="true" style="--blend-x:${(i-(a.length-1)/2)*32}px;--blend-delay:${i*55}ms">${z}</span>`).join('')}</strong><span class="blend-word"><span class="blend-emoji" aria-hidden="true">${g.q.emoji||'⭐'}</span>「${part.word}」</span></div><div class="row blend-controls"><button class="primary" id="blend-play">▶ 聽聽怎麼拼</button><button class="secondary" id="blend-stop" hidden>停止播放</button></div><p class="sub" id="blend-status" role="status" aria-live="polite">可以跟著亮起的注音一起念。</p><button class="secondary" id="blend-sound">🔊 合起來聽：${part.word}</button><p class="sub" style="margin-top:14px">${mark==='˙'?'輕聲記號 ˙ 放在注音最前面。':mark?'聲調記號寫在直排注音的右側；這裡用橫排積木練習。':'這是一聲，注音不加聲調記號。'}</p><button class="primary" id="lesson-ready">換我試試 →</button></div>`;
  $('#spell-lesson').hidden=false;$('#answer-area').hidden=true;$('#hint').hidden=true;feedback('跟著聽一聽，準備好了就換你試試。');
  document.querySelectorAll('[data-demo-symbol]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-demo-symbol]').forEach(x=>x.classList.remove('heard'));soundSymbol(b.dataset.demoSymbol);b.classList.add('heard');});
  $('#blend-play').onclick=()=>playBlendLesson(part);$('#blend-stop').onclick=()=>stopAudio();
  $('#blend-sound').onclick=()=>speakWord(part.word);
  $('#lesson-ready').onclick=()=>{if(game!==g||g.locked)return;stopAudio();state.lessons[g.q.id+':'+g.partIndex]=true;save();renderSpell(true);$('#spell-lesson').hidden=true;$('#answer-area').hidden=false;$('#hint').hidden=false;feedback(g.kind==='missing'?'哪個注音不見了？點一個放進空格。':'有多出來的積木，選需要的注音來搭橋。');};
}
function feedback(t,success=false){$('#feedback').textContent=t;$('#feedback').classList.toggle('success',success);}
function shrinkChoices(){
  const g=game;if(g.mode==='picture'||g.mode==='detective'){shrinkNewModeChoices();return;}const correct=g.mode==='listen'?g.q.z:g.mode==='tone'?g.q.answer:g.missingAnswer;
  if(g.mode==='spell'&&g.kind==='assemble'){
    // Keep the learner's current attempt so they can undo it; extras are removed
    // only after clearing the attempt in an explicit guided retry.
    return;
  }
  const buttons=[...document.querySelectorAll(g.mode==='spell'?'[data-missing]':'[data-answer]')].filter(b=>!b.disabled&&!b.hidden);
  while(buttons.length>2){const i=buttons.findIndex(b=>(g.mode==='spell'?b.dataset.missing:b.dataset.answer)!==correct);if(i<0)break;buttons[i].hidden=true;buttons.splice(i,1);}
}
function wrong(){
  const g=game;if(g.locked||g.partReady)return;g.hadError=true;g.errors++;state.mistakes[questionKey()]=(state.mistakes[questionKey()]||0)+1;save();
  shrinkChoices();g.reduced=true;
  if(g.mode==='spell'&&g.errors>=1){showLesson(true);return;}
  if(g.mode==='picture'||g.mode==='detective'){feedback(g.mode==='picture'?'再聽一次，我幫你減少選項。':'再聽正確字音，仔細看哪裡不一樣。');if(g.errors>=2)hint();return;}
  feedback(g.mode==='listen'?'再聽一次，我幫你減少選項。':g.mode==='spell'?'還差一點！可以拿回積木調整，或看拼音示範。':'再聽一次，看看聲音往哪裡走。');
  if(g.errors>=2&&g.mode!=='spell')hint();
}
function hint(){
  const g=game;if(!g||g.locked||g.partReady)return;g.hadError=true;
  if(g.mode==='listen'){feedback(`找找「${g.q.z}」。${g.q.word}：${g.q.note}。`);soundSymbol(g.q.z);}
  else if(g.mode==='spell')showLesson(true);
  else if(g.mode==='picture'||g.mode==='detective')newModeHint();
  else feedback(`${g.q.hint} 這是${g.q.answer} ${g.q.mark}。`);
}
function win(){
  const g=game;if(g.locked)return;g.locked=true;if(!g.hadError)g.first++;
  daily();const key=questionKey();state.correct[key]=(state.correct[key]||0)+1;if(!state.today.includes(key))state.today.push(key);
  if(!g.hadError)state.mistakes[key]=Math.max(0,(state.mistakes[key]||0)-1);
  const change=recordLearning(modelFor(g.mode),g.q.id,g.hadError);state.stars++;save();chime();
  let message=g.hadError?'做到了！練習讓你更進步。 +1 ★':'答對了！往前走一步。 +1 ★';
  if(change==='up')message+=' 下一題試試新挑戰！';if(change==='down')message+=' 下一題我們放慢一點。';
  feedback(message,true);document.querySelectorAll('[data-answer],[data-missing],[data-tile],[data-picture],[data-picture-z],[data-suspect],[data-fix-value],#check,#undo').forEach(b=>b.disabled=true);
  $('#hint').hidden=true;$('#next').hidden=false;$('#next').focus({preventScroll:true});$('.scene .big').style.transform='translateX(18px)';
}
function finish(){
  const g=game;if(g.awarded)return;const completed=g.questions.length;g.finished=true;g.awarded=true;state.rounds++;
  const reward=stickers.findIndex((_,i)=>!state.stickers.includes(i));if(reward>=0)state.stickers.push(reward);save();chime();confetti();
  screen.innerHTML=`<section class="game result panel"><div class="eyebrow">MISSION COMPLETE</div><div class="result-icon">🎉</div><h1>探險成功！</h1><p>完成 ${completed} 個不同挑戰，獲得 ${completed} 顆星星。<br>${g.first===completed?'這次都自己答對了，太棒了！':`有 ${g.first} 題自己答對，其餘也努力完成了！`}</p><div class="reward">${reward>=0?stickers[reward][0]:'🏆'}</div><h3>${reward>=0?'新朋友：'+stickers[reward][1]:'動物朋友都到齊了！'}</h3><p>${g.sessionMode==='mixed'?'下回合再玩不同挑戰！':'下回合：'+stageName(g.mode,modelFor(g.mode).level)}<br>${state.today.length>=5?'今天的小任務已完成，記得讓眼睛休息。':'再玩一回合，或去看看你的收藏。'}</p><div class="row" style="justify-content:center"><button class="secondary" data-go="collection">看看收藏</button><button class="primary" id="again">再探險一次</button></div><button class="secondary" data-go="home" style="margin-top:16px">回到地圖</button></section>`;$('#again').onclick=()=>start(g.sessionMode);
}

let blendRun=null;
function cancelBlendPlayback(){
  const run=blendRun;if(!run)return;blendRun=null;run.cancelled=true;if(run.cancelStep)run.cancelStep();
  document.querySelectorAll('[data-demo-symbol],#blend-result,.tone-card').forEach(el=>el.classList.remove('heard','blend-active'));
  const play=$('#blend-play'),stop=$('#blend-stop'),status=$('#blend-status');
  const lesson=$('#spell-lesson');if(lesson)lesson.dataset.blendPhase='ready';
  if(play){play.disabled=false;play.textContent='↻ 再聽一次';}if(stop)stop.hidden=true;
  if(status)status.textContent='播放已停止，可以重聽或換你試試。';
}
function blendAudioStep(run,source,text){
  return new Promise(resolve=>{
    let timer,done=false,media;
    const finish=ok=>{if(done)return;done=true;clearTimeout(timer);run.cancelStep=null;
      if(source){media.onended=media.onerror=null;media.pause();if(activeAudio===media)activeAudio=null;}
      else{media.onend=media.onerror=null;}
      resolve(ok&&!run.cancelled);
    };
    if(source){media=new Audio(source);activeAudio=media;media.onended=()=>finish(true);media.onerror=()=>finish(false);}
    else{voices();if((!voiceList.length&&!(window.NaturalVoice&&NaturalVoice.has(text)))||!('speechSynthesis'in window)){resolve(false);return;}
      media=new SpeechSynthesisUtterance(text);utterance=media;media.voice=voiceList.find(v=>v.name===state.voice)||voiceList[0];media.lang='zh-TW';media.rate=.65;media.onend=()=>finish(true);media.onerror=()=>finish(false);
    }
    run.cancelStep=()=>finish(false);timer=setTimeout(()=>{finish(false);if(!source)speechSynthesis.cancel();},10000);
    try{if(source)media.play().catch(()=>finish(false));else speechSynthesis.speak(media);}catch{finish(false);}
  });
}
async function playBlendLesson(part){
  stopAudio();const run={cancelled:false,cancelStep:null},g=game;blendRun=run;
  const play=$('#blend-play'),stop=$('#blend-stop'),status=$('#blend-status');
  if(!play){blendRun=null;return;}play.disabled=true;stop.hidden=false;
  const lesson=$('#spell-lesson');if(lesson)lesson.dataset.blendPhase='sounds';
  const buttons=[...document.querySelectorAll('[data-demo-symbol]')];
  let ok=true;
  for(const button of buttons){
    if(run.cancelled||game!==g)return;
    document.querySelectorAll('[data-demo-symbol]').forEach(el=>el.classList.remove('heard'));
    button.classList.add('heard');status.textContent='聽注音：'+button.dataset.demoSymbol;
    const source=VOICES[button.dataset.demoSymbol];if(!source){ok=false;break;}
    ok=await blendAudioStep(run,source,null);
    if(!ok)break;
  }
  if(run.cancelled||game!==g)return;
  document.querySelectorAll('[data-demo-symbol]').forEach(el=>el.classList.remove('heard'));
  if(ok){if(lesson)lesson.dataset.blendPhase='blend';$('#blend-result').classList.add('blend-active');document.querySelectorAll('.tone-card').forEach(el=>el.classList.add('blend-active'));
    status.textContent='合起來聽「'+part.word+'」，也聽聽它的聲調。';
    ok=await blendAudioStep(run,null,part.word);
  }
  if(run.cancelled||game!==g)return;
  blendRun=null;if(lesson)lesson.dataset.blendPhase=ok?'done':'ready';document.querySelectorAll('.blend-active').forEach(el=>el.classList.remove('blend-active'));
  play.disabled=false;play.textContent='↻ 再聽一次';stop.hidden=true;
  status.textContent=ok?'換你試試！也可以再聽一次。':'聲音暫時無法播放，請點小卡重聽，或請家長陪讀。';
}

go('home');

