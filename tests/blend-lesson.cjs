const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('gameplay.js','utf8');
const nodes=new Map();function element(){return {hidden:false,disabled:false,textContent:'',classList:{add(){},remove(){}},dataset:{}}}for(const id of ['#blend-play','#blend-stop','#blend-status','#blend-result','#spell-lesson'])nodes.set(id,element());
const buttons=['ㄇ','ㄠ'].map(z=>({...element(),dataset:{demoSymbol:z}}));let events=[],delay=5,fail=false,speechAvailable=true;
const context=vm.createContext({console,setTimeout,clearTimeout,game:{},activeAudio:null,utterance:null,state:{voice:'TW'},voiceList:[{name:'TW'}],VOICES:{'ㄇ':'m.mp3','ㄠ':'ao.mp3'},$:s=>nodes.get(s),document:{querySelectorAll:s=>s==='[data-demo-symbol]'?buttons:[]},voices(){context.voiceList=speechAvailable?[{name:'TW'}]:[]},
Audio:class{constructor(src){this.src=src}play(){events.push(this.src);this.timer=setTimeout(()=>fail?this.onerror?.():this.onended?.(),delay);return Promise.resolve()}pause(){clearTimeout(this.timer)}},SpeechSynthesisUtterance:class{constructor(text){this.text=text}},speechSynthesis:{speak(u){events.push(u.text);this.timer=setTimeout(()=>u.onend?.(),delay)},cancel(){clearTimeout(this.timer)}}});
context.window=context;
vm.runInContext(fs.readFileSync('app.js','utf8').match(/function stopAudio\(\)\{[^\n]+/)[0],context);
vm.runInContext(source.slice(source.indexOf('let blendRun=null;'),source.lastIndexOf("go('home');")),context);
const play=()=>vm.runInContext("playBlendLesson({word:'貓',z:'ㄇㄠ'})",context);const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
await play();assert.deepEqual(events,['m.mp3','ao.mp3','貓']);assert.equal(nodes.get('#blend-play').disabled,false);assert.match(nodes.get('#blend-status').textContent,/換你試試/);assert.equal(nodes.get('#spell-lesson').dataset.blendPhase,'done');
events=[];delay=80;const pending=play();assert.equal(nodes.get('#spell-lesson').dataset.blendPhase,'sounds');vm.runInContext('stopAudio()',context);await pending;await wait(100);assert.deepEqual(events,['m.mp3']);assert.equal(nodes.get('#spell-lesson').dataset.blendPhase,'ready');assert.equal(nodes.get('#blend-play').disabled,false);
// A superseding play cancels the old sequence without cancelling the new one.
events=[];delay=10;const old=play(),latest=play();await Promise.all([old,latest]);assert.deepEqual(events,['m.mp3','m.mp3','ao.mp3','貓']);
events=[];fail=true;await play();assert.deepEqual(events,['m.mp3']);assert.match(nodes.get('#blend-status').textContent,/暫時無法/);fail=false;
events=[];speechAvailable=false;await play();assert.deepEqual(events,['m.mp3','ao.mp3']);assert.match(nodes.get('#blend-status').textContent,/家長陪讀/);speechAvailable=true;
events=[];delay=80;const leaving=play();context.game={};vm.runInContext('stopAudio()',context);await leaving;assert.deepEqual(events,['m.mp3']);
// Verify retry clears and regenerates the answer while retaining hadError.
const lessonNodes=new Map();context.$=s=>{if(!lessonNodes.has(s))lessonNodes.set(s,element());return lessonNodes.get(s)};context.game={mode:'spell',locked:false,hadError:false,q:{id:'word:貓'},partIndex:0};context.currentPart=()=>({word:'貓',z:'ㄇㄠ'});context.state.lessons={};context.TONE_MARKS=['ˊ','ˇ','ˋ','˙'];context.feedback=()=>{};context.save=()=>{};let retries=0;context.renderSpell=skip=>{assert.equal(skip,true);retries++};
vm.runInContext(source.slice(source.indexOf('function showLesson('),source.indexOf('function feedback(')),context);vm.runInContext('showLesson(true)',context);assert.equal(context.game.hadError,true);lessonNodes.get('#lesson-ready').onclick();assert.equal(retries,1);assert.equal(context.game.hadError,true);assert.equal(lessonNodes.get('#answer-area').hidden,false);
console.log('PASS sequential recordings + whole word, stop, superseding play, failure, missing TW voice, navigation cancellation, guided retry and assistance flag.');
})().catch(e=>{console.error(e);process.exitCode=1});
