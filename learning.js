'use strict';
const STAGE_NAMES = {
  listen:['常用注音 · 二選一','常用注音 · 三選一','37 注音 · 三選一','易混注音 · 四選一','37 注音 · 四選一'],
  spell:['看示範 · 補注音','單字 · 補音或聲調','單字 · 排注音','詞語 · 補一格','詞語 · 排注音'],
  tone:['一聲與四聲','加入二聲','四聲練習','加入輕聲','詞語聲調']
};
const CONFUSABLE = [['ㄅ','ㄆ'],['ㄉ','ㄊ'],['ㄋ','ㄌ'],['ㄓ','ㄗ'],['ㄔ','ㄘ'],['ㄕ','ㄙ'],['ㄣ','ㄥ'],['ㄢ','ㄤ'],['ㄚ','ㄛ','ㄜ']];
function seedLearning(age){const start=age==='7'?3:age==='6'?2:1;return Object.fromEntries(['listen','spell','tone'].map(mode=>[mode,{level:start,streak:0,assistedStreak:0,attempts:0,review:[],recent:[],independent:0,assisted:0}]));}
function normalizeLearning(saved,age){const initial=seedLearning(age);for(const mode of Object.keys(initial)){const old=saved?.[mode];if(!old||typeof old!=='object')continue;initial[mode]={...initial[mode],...old};const m=initial[mode];m.level=Math.max(1,Math.min(5,Math.floor(Number(m.level)||1)));for(const k of ['streak','assistedStreak','attempts','independent','assisted'])m[k]=Math.max(0,Math.floor(Number(m[k])||0));m.review=Array.isArray(m.review)?m.review.filter(x=>x&&typeof x.id==='string'&&Number.isFinite(x.due)).slice(-24):[];m.recent=Array.isArray(m.recent)?m.recent.filter(x=>typeof x==='string').slice(-12):[];}return initial;}
function stageName(mode,level){return STAGE_NAMES[mode][level-1];}
function symbolPoolFor(level){const glyphs=level===1?'ㄅㄆㄇㄈㄉㄊㄋㄌㄚㄛㄜㄧㄨㄩ':level===2?'ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄚㄛㄜㄞㄟㄠㄡㄢㄣㄧㄨㄩ':null;return glyphs?SYMBOLS.filter(s=>glyphs.includes(s.z)):SYMBOLS;}
function curriculumPool(mode,level,category='all'){
  if(mode==='listen')return symbolPoolFor(level).map(s=>({...s,id:'symbol:'+s.z}));
  let source=(mode==='spell'?WORD_BANK:TONE_BANK).filter(w=>category==='all'||w.category===category);
  if(mode==='spell')return source.filter(w=>level>=4?w.parts.length>1:w.parts.length===1);
  const allowed=level===1?['一聲','四聲']:level===2?['一聲','二聲','四聲']:level===3?['一聲','二聲','三聲','四聲']:TONE_OPTIONS.map(t=>t.answer);
  return source.filter(w=>allowed.includes(w.answer)&&(level>=5||w.parts.length===1||w.answer==='輕聲'));
}
function answerChoices(correct,candidates,count,randomize,prefer=[]){const rest=candidates.filter(x=>x!==correct);const priority=randomize(prefer.filter(x=>rest.includes(x)));return randomize([correct,...[...new Set([...priority,...randomize(rest)])].slice(0,count-1)]);}
function chooseCurriculumQuestion(mode,model,category,currentIds,randomize){
  const source=curriculumPool(mode,model.level,category);if(!source.length)throw Error('Empty curriculum pool');
  const ids=new Set(source.map(q=>q.id));const due=model.review.filter(q=>q.due<=model.attempts&&ids.has(q.id)&&!currentIds.slice(-2).includes(q.id));
  const cooling=new Set(model.review.filter(q=>q.due>model.attempts).map(q=>q.id));
  const ready=source.filter(q=>!cooling.has(q.id));const available=ready.length?ready:source;
  let selected;if(due.length){selected=source.find(q=>q.id===due.sort((a,b)=>a.due-b.due)[0].id);}
  else{let eligible=available.filter(q=>!currentIds.includes(q.id)&&!model.recent.includes(q.id));if(!eligible.length)eligible=available.filter(q=>!currentIds.includes(q.id));if(!eligible.length)eligible=available.filter(q=>!currentIds.slice(-2).includes(q.id));if(!eligible.length)eligible=available;selected=randomize(eligible)[0];}
  model.recent=[...model.recent,selected.id].slice(-12);return selected;
}
// Only a completed, unaided question advances difficulty. Several taps on one
// question must not be recorded as several attempts by the caller.
function recordLearning(model,id,assisted){
  const oldLevel=model.level;model.attempts++;model.review=model.review.filter(x=>x.id!==id);
  if(assisted){model.assisted++;model.streak=0;model.assistedStreak++;model.review.push({id,due:model.attempts+2});if(model.assistedStreak>=2){model.level=Math.max(1,model.level-1);model.assistedStreak=0;}}
  else{model.independent++;model.assistedStreak=0;model.streak++;if(model.streak>=3){model.level=Math.min(5,model.level+1);model.streak=0;}}
  model.review=model.review.slice(-24);return model.level>oldLevel?'up':model.level<oldLevel?'down':null;
}
