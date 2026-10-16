'use strict';
const STAGE_NAMES = {
  listen:['常用注音 · 二選一','常用注音 · 三選一','37 注音 · 三選一','易混注音 · 四選一','37 注音 · 四選一'],
  spell:['看示範 · 補注音','單字 · 補音或聲調','單字與詞語 · 排注音','詞語 · 補一格','詞語 · 排注音'],
  tone:['一聲與四聲','加入二聲','四聲練習','加入輕聲','詞語聲調'],
  picture:['聽音選圖 · 二選一','聽音選圖 · 三選一','選圖再找注音','同主題圖片與注音','詞語圖片與注音'],
  detective:['找錯聲調','找錯注音','單字與詞語偵探','詞語小偵探','注音與聲調修復']
};
const MODE_LABELS={listen:'聽音',spell:'拼音',tone:'聲調',picture:'選圖',detective:'偵探'};
const MODE_NAMES={listen:'聲音寶藏島',spell:'拼音彩虹橋',tone:'聲調溜滑梯',picture:'圖片尋寶島',detective:'注音偵探社'};
const CONFUSABLE = [['ㄅ','ㄆ'],['ㄉ','ㄊ'],['ㄋ','ㄌ'],['ㄓ','ㄗ'],['ㄔ','ㄘ'],['ㄕ','ㄙ'],['ㄣ','ㄥ'],['ㄢ','ㄤ'],['ㄚ','ㄛ','ㄜ']];
function seedLearning(age){const start=age==='7'?3:age==='6'?2:1;return Object.fromEntries(Object.keys(STAGE_NAMES).map(mode=>[mode,{level:start,streak:0,assistedStreak:0,attempts:0,review:[],recent:[],independent:0,assisted:0}]));}
function normalizeLearning(saved,age){const initial=seedLearning(age);for(const mode of Object.keys(initial)){const old=saved?.[mode];if(!old||typeof old!=='object')continue;initial[mode]={...initial[mode],...old};const m=initial[mode];m.level=Math.max(1,Math.min(5,Math.floor(Number(m.level)||1)));for(const k of ['streak','assistedStreak','attempts','independent','assisted'])m[k]=Math.max(0,Math.floor(Number(m[k])||0));m.review=Array.isArray(m.review)?m.review.filter(x=>x&&typeof x.id==='string'&&Number.isFinite(x.due)).slice(-24):[];m.recent=Array.isArray(m.recent)?m.recent.filter(x=>typeof x==='string').slice(-12):[];}return initial;}
function stageName(mode,level){return STAGE_NAMES[mode][level-1]+(mode==='listen'?'':' · '+tierName(level));}
function symbolPoolFor(level){const glyphs=level===1?'ㄅㄆㄇㄈㄉㄊㄋㄌㄚㄛㄜㄧㄨㄩ':level===2?'ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄚㄛㄜㄞㄟㄠㄡㄢㄣㄧㄨㄩ':null;return glyphs?SYMBOLS.filter(s=>glyphs.includes(s.z)):SYMBOLS;}
function curriculumPool(mode,level,category='all'){
  if(mode==='listen')return symbolPoolFor(level).map(s=>({...s,id:'symbol:'+s.z}));
  const cap=tierForLevel(level);
  let source=(mode==='picture'?PICTURE_BANK:mode==='tone'?TONE_BANK:WORD_BANK).filter(w=>w.tier<=cap&&(category==='all'||w.category===category));
  if(mode==='detective')return source.map(w=>({...w,id:'detective:'+w.word}));
  if(mode!=='tone')return source;
  const allowed=level===1?['一聲','四聲']:level===2?['一聲','二聲','四聲']:level===3?['一聲','二聲','三聲','四聲']:TONE_OPTIONS.map(t=>t.answer);
  return source.filter(w=>allowed.includes(w.answer));
}
function answerChoices(correct,candidates,count,randomize,prefer=[]){const rest=candidates.filter(x=>x!==correct);const priority=randomize(prefer.filter(x=>rest.includes(x)));return randomize([correct,...[...new Set([...priority,...randomize(rest)])].slice(0,count-1)]);}
// A word remains the same question across picture, spelling, tone and detective
// modes. Symbol IDs stay separate from word IDs.
function curriculumQuestionKey(id){return id.replace(/^(word|picture|tone|detective):/,'word:');}
function chooseCurriculumQuestion(mode,model,category,currentIds,randomize){
  const used=new Set(currentIds.map(curriculumQuestionKey));
  const source=[...new Map(curriculumPool(mode,model.level,category)
    .filter(q=>!used.has(curriculumQuestionKey(q.id)))
    .map(q=>[curriculumQuestionKey(q.id),q])).values()];
  // Never recycle a question to fill a round, even when reviews are overdue.
  if(!source.length)return null;
  const ids=new Set(source.map(q=>q.id));
  const due=model.review.filter(q=>q.due<=model.attempts&&ids.has(q.id));
  const cooling=new Set(model.review.filter(q=>q.due>model.attempts).map(q=>q.id));
  const ready=source.filter(q=>!cooling.has(q.id));
  const available=ready.length?ready:source;
  let selected;
  if(due.length)selected=source.find(q=>q.id===[...due].sort((a,b)=>a.due-b.due)[0].id);
  else{
    let eligible=available.filter(q=>!model.recent.includes(q.id));
    if(!eligible.length){
      // If the topic is small, return the least recently shown eligible item.
      const oldest=Math.min(...available.map(q=>model.recent.lastIndexOf(q.id)));
      eligible=available.filter(q=>model.recent.lastIndexOf(q.id)===oldest);
    }
    const newest=eligible.filter(q=>q.tier===tierForLevel(model.level));
    selected=randomize(newest.length&&Math.random()<.65?newest:eligible)[0];
  }
  model.recent=[...model.recent.filter(id=>id!==selected.id),selected.id].slice(-12);
  return selected;
}
// Only a completed, unaided question advances difficulty. Several taps on one
// question must not be recorded as several attempts by the caller.
function recordLearning(model,id,assisted){
  const oldLevel=model.level;model.attempts++;model.review=model.review.filter(x=>x.id!==id);
  if(assisted){model.assisted++;model.streak=0;model.assistedStreak++;model.review.push({id,due:model.attempts+2});if(model.assistedStreak>=2){model.level=Math.max(1,model.level-1);model.assistedStreak=0;}}
  else{model.independent++;model.assistedStreak=0;model.streak++;if(model.streak>=3){model.level=Math.min(5,model.level+1);model.streak=0;}}
  model.review=model.review.slice(-24);return model.level>oldLevel?'up':model.level<oldLevel?'down':null;
}

function pictureOptions(q,level,randomize){
  const count=level===1?2:level===2?3:4;
  const alternatives=PICTURE_BANK.filter(w=>w.tier<=tierForLevel(level)&&w.id!==q.id&&w.emoji!==q.emoji&&w.z!==q.z&&!pictureConflicts(q.word,w.word));
  const sameTopic=level>=4?randomize(alternatives.filter(w=>w.category===q.category)):[];
  const ordered=[...sameTopic,...randomize(alternatives)];
  const selected=[q];const pictures=new Set([q.emoji]);
  for(const word of ordered){if(pictures.has(word.emoji))continue;selected.push(word);pictures.add(word.emoji);if(selected.length===count)break;}
  return randomize(selected);
}
function makeDetectivePuzzle(q,level,randomize){
  const parts=q.parts.map(p=>({word:p.word,tokens:[...p.z]}));
  const partIndex=randomize(parts.map((_,i)=>i))[0];
  const tokens=parts[partIndex].tokens;const toneIndex=tokens.findIndex(t=>['ˊ','ˇ','ˋ'].includes(t));
  const isTone=!tokens.includes('˙')&&(level===1||level>=3&&Math.random()<.5);
  let tokenIndex,original,wrong;
  if(isTone){tokenIndex=toneIndex<0?tokens.length:toneIndex;original=toneIndex<0?'':tokens[toneIndex];wrong=randomize(['ˊ','ˇ','ˋ'].filter(t=>t!==original))[0];}
  else{tokenIndex=randomize(tokens.map((_,i)=>i).filter(i=>!TONE_MARKS.includes(tokens[i])))[0];original=tokens[tokenIndex];const near=CONFUSABLE.find(group=>group.includes(original))||[];wrong=answerChoices(original,SYMBOLS.map(s=>s.z),2,randomize,near).find(z=>z!==original);}
  tokens[tokenIndex]=wrong;return {parts,partIndex,tokenIndex,original,wrong,isTone,phase:'find'};
}
function repairedPuzzleText(puzzle){return puzzle.parts.map(p=>p.tokens.filter(Boolean).join('')).join(' ');}

