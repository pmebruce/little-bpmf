import {buildRound,attempt} from './rounds.js';
const $=id=>document.getElementById(id);let config,scene,phaser,rounds=[],index=0,record,stars=0,previous=[],audio,muted=false,ready=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let saved={stars:0,rounds:0};
function status(text){$('feedback').textContent=text;}
function stopVoice(){if(audio){audio.pause();audio=null;}window.speechSynthesis?.cancel();}
function speak(slow=false){
 stopVoice();if(muted||!record)return;const text=config.mode==='fossil'&&!record.done?'刷開沙土，觀察骨架，找出恐龍的名字。':record.question.answer.say;
 if(!window.speechSynthesis){$('voice-note').textContent='這台裝置無語音，請看文字提示或請家長陪讀。';hint();return;}
 let chosen='';try{const parent=JSON.parse(localStorage.getItem(config.parentKey)||'{}');chosen=parent.voice||'';}catch{}
 const voices=speechSynthesis.getVoices(),matches=voices.filter(v=>config.language==='en-US'?/^en[-_]/i.test(v.lang):/^zh[-_]?(TW|Hant)/i.test(v.lang));
 if(config.language==='zh-TW'&&!matches.length){$('voice-note').textContent='未找到台灣中文語音；請看文字提示或由家長陪讀。';hint();return;}
 const utterance=new SpeechSynthesisUtterance(text);utterance.lang=config.language;utterance.rate=slow?.6:.85;utterance.voice=matches.find(v=>v.voiceURI===chosen||v.name===chosen)||matches.find(v=>v.lang===config.language)||matches[0]||null;
 utterance.onerror=e=>{if(!['interrupted','canceled'].includes(e.error))$('voice-note').textContent='語音未播放，請再按一次喇叭。';};speechSynthesis.speak(utterance);
}
function hint(){if(!record)return;record.hinted=true;$('hint').textContent=record.done?record.question.answer.explanation:config.mode==='fossil'?record.question.answer.clue:record.question.answer.hint;}
function persist(){try{localStorage.setItem(config.progressKey,JSON.stringify(saved));if(config.parentKey){const value=JSON.parse(localStorage.getItem(config.parentKey)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value)){value.stars=(Number.isFinite(value.stars)?Math.max(0,value.stars):0)+1;localStorage.setItem(config.parentKey,JSON.stringify(value));}}}catch{}}
function chime(){if(muted)return;try{const context=scene.sound.context;if(!context)return;context.resume();[523.25,659.25,783.99].forEach((hz,j)=>{const o=context.createOscillator(),g=context.createGain(),t=context.currentTime+j*.11;o.frequency.value=hz;g.gain.setValueAtTime(.055,t);g.gain.exponentialRampToValueAtTime(.001,t+.25);o.connect(g);g.connect(context.destination);o.start(t);o.stop(t+.25);});}catch{}}
function choose(id){
 if(!record||!ready)return;
 if(config.mode==='fossil'&&!scene.revealed){status('先刷開沙土，看看骨架，再選名字。');return;}
 const result=attempt(record,id);if(result.status==='retry'){scene.retry(id);status('再看一看，或按提示找線索。');if(record.mistakes>=2)hint();return;}
 if(result.status!=='correct')return;
 stars++;saved.stars++;persist();scene.success(id);chime();$('stars').textContent='★ '+stars;status('答對了！'+record.question.answer.explanation);$('choices').querySelectorAll('button').forEach(b=>b.disabled=true);$('next').hidden=false;$('next').textContent=index===rounds.length-1?'看看探險成果 ★':'下一個任務 →';$('hint').textContent='';$('speak').textContent='🔊 再聽一次';
}
function question(){
 record={question:rounds[index],mistakes:0,done:false,hinted:false};$('progress').textContent=`任務 ${index+1} / ${rounds.length}`;$('bar').style.width=`${index/rounds.length*100}%`;$('next').hidden=true;$('hint').textContent='';$('voice-note').textContent='按喇叭聽指令；可以慢慢聽，不限時間。';$('speak').textContent='🔊 聽一聽';
 $('prompt').textContent=config.mode==='fossil'?'刷開沙土，觀察是哪隻恐龍':config.mode==='train'?'聽名字，把正確注音送上火車':'聽英文，把正確物品送給小狐狸';
 $('choices').replaceChildren(...record.question.options.map(o=>{const b=document.createElement('button');b.className='choice';b.textContent=o.label;b.setAttribute('aria-label',o.accessible||o.label);b.addEventListener('click',()=>choose(o.id));return b;}));
 $('reveal').hidden=config.mode!=='fossil';$('reveal').disabled=false;status(config.mode==='fossil'?'點沙土或按住刷過去，至少刷開六格。':'可以拖動上方卡片，也可以按下方的大按鈕。');
 scene.loadQuestion(record.question);$('source').replaceChildren();const a=record.question.answer;if(config.mode==='fossil'){const p=document.createElement('p');p.textContent=a.credit;const link=document.createElement('a');link.href=a.source;link.target='_blank';link.rel='noopener';link.textContent='照片來源與授權 ↗';p.append(' ',link);$('source').append(p);}
}
function begin(){if(!scene)return;stopVoice();try{const pool=config.items.filter(x=>$('level').value==='more'||x.starter);rounds=buildRound(pool,5,$('level').value==='more'?3:2,previous);previous=rounds.map(q=>q.answer.id);}catch(e){status(e.message);return;}index=0;stars=0;$('stars').textContent='★ 0';$('summary').hidden=true;$('play-area').hidden=false;$('start-panel').hidden=true;question();}
function next(){if(!record?.done)return;stopVoice();if(++index<rounds.length){question();return;}scene.finish();saved.rounds++;try{localStorage.setItem(config.progressKey,JSON.stringify(saved));}catch{}$('play-area').hidden=true;$('summary').hidden=false;$('summary-text').textContent=`完成 ${rounds.length} 個任務，得到 ${stars} 顆星星！這台裝置在本關已累積 ${saved.stars} 顆星星。`;$('bar').style.width='100%';}
class AdventureScene extends (window.Phaser?.Scene||class{}){
 constructor(){super('Adventure');}
 preload(){for(const item of config.items)if(item.photo)this.load.image(item.id,item.photo);this.load.on('loaderror',file=>{console.warn('Optional image unavailable',file.key);});}
 create(){
  scene=this;this.add.rectangle(320,200,640,400,0xe7f3e6);const g=this.add.graphics();g.fillStyle(0xb9d9bc,1);g.fillEllipse(125,310,550,260);g.fillStyle(0x94c6ab,1);g.fillEllipse(570,335,600,210);g.fillStyle(0xf6df9c,1);g.fillCircle(570,55,30);
  this.cloud=this.add.text(80,35,'☁',{fontSize:'62px',color:'#ffffff'});if(!reduced)this.tweens.add({targets:this.cloud,x:180,duration:9000,yoyo:true,repeat:-1});
  this.layer=this.add.container();this.cards=[];this.sand=[];this.target=null;
  this.input.on('drag',(pointer,obj,x,y)=>{if(record?.done)return;obj.x=x;obj.y=y;});
  this.input.on('dragend',(pointer,obj)=>{if(record?.done)return;const inside=this.target&&Phaser.Geom.Rectangle.Contains(this.target,obj.x,obj.y);if(inside)choose(obj.getData('id'));if(!record.done)this.tweens.add({targets:obj,x:obj.getData('homeX'),y:obj.getData('homeY'),duration:reduced?0:220});});
  this.input.on('pointermove',pointer=>{if(config.mode==='fossil'&&pointer.isDown&&!record?.done)this.brushAt(pointer.x,pointer.y);});
  ready=true;$('start').disabled=false;$('loading').textContent='準備好了！按開始進入遊戲。';
 }
 clear(){this.tweens.killAll();if(!reduced)this.tweens.add({targets:this.cloud,x:this.cloud.x+70,duration:7000,yoyo:true,repeat:-1});this.layer.removeAll(true);this.cards=[];this.sand=[];this.revealed=false;this.target=null;}
 loadQuestion(q){
  this.clear();if(config.mode==='fossil'){this.drawFossil(q);return;}
  if(config.mode==='train')this.drawTrain();else this.drawFox();
  const n=q.options.length;q.options.forEach((o,j)=>{const x=120+j*(400/(n-1)),y=335;const box=this.add.rectangle(0,0,158,90,0xfff9e9).setStrokeStyle(3,0xc7ac75);const text=this.add.text(0,0,o.label,{fontFamily:'system-ui, sans-serif',fontSize:config.mode==='train'?(o.label.length>6?'25px':'34px'):'53px',color:'#234d4a',align:'center'}).setOrigin(.5);const card=this.add.container(x,y,[box,text]).setSize(158,90).setInteractive({useHandCursor:true});card.setData({id:o.id,homeX:x,homeY:y});this.input.setDraggable(card);this.layer.add(card);this.cards.push(card);});
 }
 drawFox(){
  const fox=this.add.text(480,137,'🦊',{fontFamily:'Apple Color Emoji, Segoe UI Emoji, sans-serif',fontSize:'112px'}).setOrigin(.5);this.layer.add(fox);this.actor=fox;
  const basket=this.add.rectangle(480,234,212,92,0xe7b571).setStrokeStyle(4,0xb3824d);const label=this.add.text(480,234,'送到這裡 ↓',{fontSize:'27px',color:'#4d391e',fontFamily:'system-ui'}).setOrigin(.5);this.layer.add([basket,label]);this.target=new Phaser.Geom.Rectangle(365,180,230,105);if(!reduced)this.tweens.add({targets:fox,y:128,duration:900,yoyo:true,repeat:-1});
 }
 drawTrain(){
  const body=this.add.container(355,132),g=this.add.graphics();g.fillStyle(0x438b79,1);g.fillRoundedRect(0,0,150,110,17);g.fillStyle(0xf0c975,1);g.fillRoundedRect(110,-35,88,145,14);g.fillStyle(0xe5f3ed,1);g.fillRoundedRect(125,-20,58,48,8);g.fillStyle(0x2e5851,1);g.fillRect(190,83,35,25);body.add(g);this.layer.add(body);this.actor=body;
  this.wheels=[33,128,183].map(x=>{const wheel=this.add.container(x,111,[this.add.circle(0,0,22,0x23483e),this.add.rectangle(0,0,31,5,0xcde8d3),this.add.circle(0,0,7,0xe9c97d)]);body.add(wheel);return wheel;});
  const cargo=this.add.rectangle(480,235,202,72,0xffedbc).setStrokeStyle(3,0xba9560);const label=this.add.text(480,235,'字卡上車 ↓',{fontSize:'27px',color:'#4d391e',fontFamily:'system-ui'}).setOrigin(.5);this.layer.add([cargo,label]);this.cargoObjects=[cargo,label];this.target=new Phaser.Geom.Rectangle(365,184,230,90);
 }
 drawFossil(q){
  const a=q.answer;this.layer.add(this.add.rectangle(320,201,432,274,0xfffcf2).setStrokeStyle(5,0x9d8157));
  if(this.textures.exists(a.id)){const photo=this.add.image(320,201,a.id);const ratio=Math.min(410/photo.width,250/photo.height);photo.setScale(ratio);this.layer.add(photo);}else{this.layer.add(this.add.text(320,201,'照片暫未載入\n請用提示觀察特徵',{fontSize:'26px',color:'#534b40',align:'center'}).setOrigin(.5));$('hint').textContent=a.clue;}
  for(let j=0;j<9;j++){const x=182+(j%3)*138,y=116+Math.floor(j/3)*85;const tile=this.add.container(x,y,[this.add.rectangle(0,0,136,83,[0xd4ae77,0xcba16e,0xdfbd88][j%3]),this.add.text(0,0,'·  ·  ·',{fontSize:'32px',color:'#af8552'}).setOrigin(.5)]).setSize(136,83).setInteractive({useHandCursor:true});tile.on('pointerdown',()=>this.clearSand(tile));this.layer.add(tile);this.sand.push(tile);}
  this.brush=this.add.text(70,270,'🖌️',{fontSize:'55px'});this.layer.add(this.brush);
 }
 brushAt(x,y){if(this.brush){this.brush.x=x;this.brush.y=y;}for(const tile of this.sand)if(tile.active&&!tile.getData('cleared')&&Math.abs(tile.x-x)<69&&Math.abs(tile.y-y)<43)this.clearSand(tile);}
 clearSand(tile){if(!tile||tile.getData('cleared')||record?.done)return;tile.setData('cleared',true);tile.disableInteractive();this.tweens.add({targets:tile,alpha:0,scale:.85,duration:reduced?0:230});const cleared=this.sand.filter(t=>t.getData('cleared')).length;if(cleared>=6){this.revealed=true;for(const t of this.sand){t.setData('cleared',true);t.disableInteractive();this.tweens.add({targets:t,alpha:0,duration:reduced?0:200});}$('reveal').disabled=true;status('骨架出現了！觀察特徵，選一個名字。');}else status(`已刷開 ${cleared} / 6 格；繼續找線索。`);}
 retry(id){const target=this.cards.find(x=>x.getData('id')===id)||this.brush;if(target&&!reduced)this.tweens.add({targets:target,x:target.x+9,duration:65,yoyo:true,repeat:3});}
 success(id){
  for(const card of this.cards)card.disableInteractive();
  const card=this.cards.find(x=>x.getData('id')===id);if(card)this.tweens.add({targets:card,x:480,y:225,scale:.8,duration:reduced?0:350});
  if(this.actor&&!reduced){if(config.mode==='train'){this.tweens.add({targets:[...(this.cargoObjects||[]),...(card?[card]:[])],x:'+=350',duration:1300,delay:450,ease:'Cubic.easeIn'});this.wheels.forEach(w=>this.tweens.add({targets:w,angle:360,duration:1100}));this.tweens.add({targets:this.actor,x:705,duration:1300,delay:400,ease:'Cubic.easeIn'});}else this.tweens.add({targets:this.actor,angle:8,y:108,duration:160,yoyo:true,repeat:3});}
  for(let j=0;j<12;j++){const star=this.add.text(320,130,'★',{fontSize:'29px',color:['#edac3b','#39a795','#a383c8'][j%3]}).setOrigin(.5);this.layer.add(star);this.tweens.add({targets:star,x:90+Math.random()*460,y:40+Math.random()*230,alpha:0,duration:reduced?0:1300,onComplete:()=>star.destroy()});}
 }
 finish(){this.clear();this.layer.add(this.add.text(320,190,'🏅',{fontSize:'145px'}).setOrigin(.5));}
}
async function init(){
 try{
  const response=await fetch('./game-config.json');if(!response.ok)throw Error('遊戲資料尚未載入，請重新整理。');config=await response.json();
  document.title=config.title;$('title').textContent=config.title;$('subtitle').textContent=config.subtitle;$('home').href=config.home||'./';$('mode-label').textContent=config.mode==='fossil'?'刷化石 · 看特徵':config.mode==='train'?'聽名字 · 找注音':'聽英文 · 送物品';
  try{const s=JSON.parse(localStorage.getItem(config.progressKey)||'{}');if(Number.isFinite(s.stars)&&s.stars>=0)saved.stars=s.stars;if(Number.isFinite(s.rounds)&&s.rounds>=0)saved.rounds=s.rounds;}catch{}
  $('start').addEventListener('click',begin);$('again').addEventListener('click',()=>{$('summary').hidden=true;$('start-panel').hidden=false;});$('next').addEventListener('click',next);$('speak').addEventListener('click',()=>speak());$('slow').addEventListener('click',()=>speak(true));$('help').addEventListener('click',hint);$('reveal').addEventListener('click',()=>scene?.clearSand(scene.sand.find(x=>!x.getData('cleared'))));$('mute').addEventListener('click',()=>{muted=!muted;$('mute').textContent=muted?'聲音：關':'聲音：開';$('mute').setAttribute('aria-pressed',String(muted));if(muted)stopVoice();});
  if(!window.Phaser)throw Error('遊戲引擎未載入，請重新整理或保持網路連線。');
  phaser=new Phaser.Game({type:Phaser.AUTO,parent:'game-canvas',width:640,height:400,backgroundColor:'#e7f3e6',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true},scene:AdventureScene});
  window.addEventListener('pagehide',()=>{stopVoice();phaser.destroy(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden){stopVoice();scene?.scene.pause();}else scene?.scene.resume();});
  if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
 }catch(e){$('loading').textContent=e.message;$('loading').setAttribute('role','alert');}
}
init();
