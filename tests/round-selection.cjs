const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({console});for(const f of ['data.js','curriculum.js','learning.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
vm.runInContext(`
function shuffled(a){a=[...a];for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function ok(b,msg){if(!b)throw Error(msg)}
let total=0;
for(const mode of Object.keys(STAGE_NAMES))for(let level=1;level<=5;level++)for(const [topic]of TOPICS){
const model=seedLearning('5')[mode];model.level=level;
for(let round=0;round<30;round++){
const used=[];for(let n=0;n<5;n++){
const q=chooseCurriculumQuestion(mode,model,topic,used,shuffled);
if(!q){ok(curriculumPool(mode,model.level,topic).every(q=>used.map(curriculumQuestionKey).includes(curriculumQuestionKey(q.id))),'Stopped before exhaustion');break}
ok(!used.map(curriculumQuestionKey).includes(curriculumQuestionKey(q.id)),'Round duplicate');used.push(q.id);recordLearning(model,q.id,Math.random()<.6);total++;
}
}
}
// Exact regression: overdue first question must not return in fourth slot.
let model=seedLearning('5').picture;const first=curriculumPool('picture',1,'all')[0];model.attempts=4;model.review=[{id:first.id,due:4}];const used=[first.id,'picture:狗','picture:兔'];let q=chooseCurriculumQuestion('picture',model,'all',used,a=>a);ok(q.id!==first.id,'Overdue duplicate');
// Different modes cannot recycle the same word in a mixed round.
for(const mode of ['spell','tone','detective','picture']){const m=seedLearning('5')[mode];const p=curriculumPool(mode,1,'all');m.review=p.map(q=>({id:q.id,due:0}));const blocked=p.slice(0,5).map(q=>'picture:'+q.word);q=chooseCurriculumQuestion(mode,m,'all',blocked,a=>a);ok(!blocked.map(curriculumQuestionKey).includes(curriculumQuestionKey(q.id)),'Mixed duplicate')}
// Exhaustion returns null even when every question is due for review.
model=seedLearning('5').listen;let p=curriculumPool('listen',1);model.review=p.map(q=>({id:q.id,due:0}));ok(chooseCurriculumQuestion('listen',model,'all',p.map(q=>q.id),a=>a)===null,'Exhaustion duplicate');
// All recently seen: prefer least recent, not another random recent item.
model=seedLearning('5').listen;p=curriculumPool('listen',1);model.recent=p.map(q=>q.id);q=chooseCurriculumQuestion('listen',model,'all',[],a=>a);ok(q.id===p[0].id,'Recency ordering');
console.log('PASS '+total+' selections across 5 modes, 5 starting levels, 7 topics, adaptive levels, reviews, mixed modes, exhaustion and recency.');
`,c);
const ui=vm.createContext({console});vm.runInContext(fs.readFileSync('gameplay.js','utf8').replace(/go\('home'\);\s*$/,''),ui);vm.runInContext(`
let rendered='',persisted=0;const screen={set innerHTML(v){rendered=v}};let state={rounds:0,stickers:[],today:[]},game={questions:[{},{}],first:2,sessionMode:'mixed'};const stickers=[['🐻','熊']];function save(){persisted++}function chime(){}function confetti(){}function $(s){return {}};finish();if(!rendered.includes('完成 2 個不同挑戰，獲得 2 顆星星。'))throw Error('Short round misreported');finish();if(persisted!==1)throw Error('Double reward');console.log('PASS shortened round summary and award guard');
`,ui);
