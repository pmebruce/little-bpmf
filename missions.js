'use strict';
function renderPicture(){
  const g=game;if(!g.pictureChoices)g.pictureChoices=pictureOptions(g.q,g.level,shuffle);
  g.picturePhase='image';g.pictureReady=false;
  $('#answer-area').innerHTML=`<p class="sub">先聽聲音，再找圖片。</p><div class="picture-grid">${g.pictureChoices.map((q,i)=>`<button class="picture-choice" data-picture="${q.id}" aria-label="圖片 ${i+1}：${q.word}"><span class="picture-art" aria-hidden="true">${q.emoji}</span><span class="picture-caption" hidden>${q.word}</span></button>`).join('')}</div><div id="picture-reveal" hidden></div><button class="primary" id="picture-next" hidden>再找對應的注音 →</button>`;
  document.querySelectorAll('[data-picture]').forEach(b=>b.onclick=()=>{
    if(g.locked||g.pictureReady||g.picturePhase!=='image'||b.disabled)return;
    if(b.dataset.picture===g.q.id){
      b.classList.add('correct');b.querySelector('.picture-caption').hidden=false;
      document.querySelectorAll('[data-picture]').forEach(x=>x.disabled=true);
      $('#picture-reveal').hidden=false;
      if(g.level<3){$('#picture-reveal').innerHTML=`<div class="picture-answer"><strong>${g.q.word}</strong><span>${g.q.z}</span></div>`;win();}
      else{g.pictureReady=true;$('#picture-reveal').innerHTML=`<div class="picture-answer"><strong>找到「${g.q.word}」了！</strong><span>接著找出它的注音。</span></div>`;chime();feedback('圖片找對了，還有一個小挑戰！',true);$('#picture-next').hidden=false;$('#hint').hidden=true;}
    }else{b.classList.add('wrong');b.disabled=true;wrong();}
  });
  $('#picture-next').onclick=()=>{if(g.locked||!g.pictureReady||g.picturePhase!=='image')return;g.picturePhase='phonics';g.pictureReady=false;renderPicturePhonics();};
}
function renderPicturePhonics(){
  const g=game;
  const count=g.reduced?2:g.level>=4?4:3;
  const near=g.pictureChoices.filter(w=>w.z!==g.q.z).map(w=>w.z);
  const options=answerChoices(g.q.z,PICTURE_BANK.filter(w=>w.tier<=tierForLevel(g.level)).map(w=>w.z),count,shuffle,near);
  $('#answer-area').innerHTML=`<div class="picture-answer"><span class="picture-art" aria-hidden="true">${g.q.emoji}</span><strong>${g.q.word}</strong><p class="sub">再聽一次，找出這張圖的注音。</p></div><div class="choices phonics-choices">${options.map(z=>`<button class="choice" data-picture-z="${z}" aria-label="注音 ${z}">${z}</button>`).join('')}</div>`;
  $('#hint').hidden=false;feedback('看圖、聽字音，選對應的注音。');
  document.querySelectorAll('[data-picture-z]').forEach(b=>b.onclick=()=>{
    if(g.locked||g.picturePhase!=='phonics'||b.disabled)return;
    if(b.dataset.pictureZ===g.q.z){b.classList.add('correct');win();}
    else{b.classList.add('wrong');b.disabled=true;wrong();}
  });
}
function detectiveEvidence(interactive=true){
  const d=game.detective;
  return `<div class="case-evidence">${d.parts.map((p,pi)=>`<div class="evidence-syllable"><small>${p.word}</small><div class="suspect-row">${p.tokens.map((z,ti)=>z?(interactive?`<button class="suspect-token" data-suspect="${pi}:${ti}" aria-label="檢查第 ${pi+1} 個字的 ${z}">${z}</button>`:`<span class="suspect-token ${pi===d.partIndex&&ti===d.tokenIndex?'repaired':''}">${z}</span>`):'').join('')}</div></div>`).join('')}</div>`;
}
function renderDetective(){
  const g=game;g.detective=makeDetectivePuzzle(g.q,g.level,shuffle);
  $('#answer-area').innerHTML=`<div class="case-folder"><div class="case-heading"><span>🔎 注音案件</span><strong>有一個地方寫錯了</strong></div><p>聽正確字音，點出可疑的注音或聲調。</p><div id="detective-evidence">${detectiveEvidence()}</div></div>`;
  document.querySelectorAll('[data-suspect]').forEach(b=>b.onclick=()=>{
    const d=g.detective;if(g.locked||d.phase!=='find'||b.disabled)return;
    if(b.dataset.suspect===d.partIndex+':'+d.tokenIndex){d.phase='fix';chime();renderDetectiveFix();feedback('找到可疑位置了！選正確的寫法來修好它。',true);}
    else{b.classList.add('wrong');b.disabled=true;wrong();}
  });
  feedback('先聽字音，再找出哪個地方寫錯了。');
}
function fixLabel(value,isTone){if(!isTone)return value;return value?`${value} ${TONE_OPTIONS.find(t=>t.mark===value).answer}`:'一聲（不標）';}
function renderDetectiveFix(){
  const g=game,d=g.detective;
  const candidates=d.isTone?['','ˊ','ˇ','ˋ']:SYMBOLS.map(s=>s.z);
  const count=g.reduced?2:g.level===1?2:g.level<=3?3:4;
  const near=d.isTone?[d.wrong]:(CONFUSABLE.find(group=>group.includes(d.original))||[d.wrong]);
  const options=answerChoices(d.original,candidates,count,shuffle,near);
  $('#answer-area').innerHTML=`<div class="case-folder"><div class="case-heading"><span>🔧 修復注音</span><strong>「${d.parts[d.partIndex].word}」的這一格</strong></div><div id="detective-evidence">${detectiveEvidence(false)}</div><p>把 <strong class="bad-token">${d.wrong}</strong> 換成哪一個？</p></div><div class="choices fix-choices">${options.map(z=>`<button class="choice ${d.isTone?'tone-fix':''}" data-fix-value="${z}" aria-label="換成 ${fixLabel(z,d.isTone)}">${d.isTone?(z?`${z}<small>${TONE_OPTIONS.find(t=>t.mark===z).answer}</small>`:'<span class="no-tone">一聲<small>不標記號</small></span>'):z}</button>`).join('')}</div>`;
  // The marked tile identifies the location already found, without showing its answer.
  const marker=$('#detective-evidence .evidence-syllable:nth-child('+(d.partIndex+1)+') .suspect-token:nth-child('+(d.tokenIndex+1)+')');
  if(marker){marker.classList.remove('repaired');marker.classList.add('selected');}
  $('#hint').hidden=false;
  document.querySelectorAll('[data-fix-value]').forEach(b=>b.onclick=()=>{
    if(g.locked||d.phase!=='fix'||b.disabled)return;
    if(b.dataset.fixValue===d.original){
      d.parts[d.partIndex].tokens[d.tokenIndex]=d.original;
      if(repairedPuzzleText(d)!==g.q.z)throw Error('Detective repair does not match the reference');
      d.phase='done';b.classList.add('correct');$('#detective-evidence').innerHTML=detectiveEvidence(false);win();
    }else{b.classList.add('wrong');b.disabled=true;wrong();}
  });
}
function newModeHint(){
  const g=game;
  if(g.mode==='picture'){
    if(g.picturePhase==='image'){
      feedback(`要找的是「${g.q.word}」${g.q.emoji}。再聽一次，找相同的圖。`);
      document.querySelectorAll('[data-picture]').forEach(b=>{if(b.dataset.picture===g.q.id)b.classList.add('hinted');});
    }else feedback(`「${g.q.word}」的注音是 ${g.q.z}。`);
    speakWord(g.q.word);return;
  }
  const d=g.detective;
  if(d.phase==='find'){
    const b=document.querySelector(`[data-suspect="${d.partIndex}:${d.tokenIndex}"]`);if(b)b.classList.add('hinted');
    feedback(`看「${d.parts[d.partIndex].word}」這個字，${d.wrong} 是可疑的位置。`);
  }else feedback(`這一格應該是 ${fixLabel(d.original,d.isTone)}，修好後讀作 ${g.q.z}。`);
}
function shrinkNewModeChoices(){
  const g=game;let selector,attribute,correct;
  if(g.mode==='picture'){
    if(g.picturePhase==='image'){selector='[data-picture]';attribute='picture';correct=g.q.id;}
    else{selector='[data-picture-z]';attribute='pictureZ';correct=g.q.z;}
  }else{
    if(g.detective.phase!=='fix')return;
    selector='[data-fix-value]';attribute='fixValue';correct=g.detective.original;
  }
  const buttons=[...document.querySelectorAll(selector)].filter(b=>!b.disabled&&!b.hidden);
  while(buttons.length>2){const index=buttons.findIndex(b=>b.dataset[attribute]!==correct);if(index<0)break;buttons[index].hidden=true;buttons.splice(index,1);}
}
