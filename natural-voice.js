/* natural-voice.js v1 — plays pre-recorded 曉臣 (zh-TW-HsiaoChenNeural) clips for Chinese speech.
   Wraps speechSynthesis.speak/cancel. Text is matched whole, or sentence by sentence; anything
   without a clip (or any playback failure) falls back to the browser's own speech. */
(function(){
'use strict';
var me=document.currentScript,BASE=new URL('voice-zh/',(me&&me.src)||location.href).href,VER=(me&&me.dataset.v)||'1';
var synth=window.speechSynthesis;if(!synth||!synth.speak)return;
var nativeSpeak=synth.speak.bind(synth),nativeCancel=synth.cancel.bind(synth),proto=Object.getPrototypeOf(synth);
var map=null,eager=[],ctx=null,buffers={},loading={},queue=[],cur=null,stopCur=null,htmlAudio=null,warmed=false,unlocked=false;
var HAN=/[\u3400-\u9fff]/;
function norm(t){return String(t==null?'':t).replace(/\s+/g,' ').trim()}
function clean(p){return p.replace(/^[\s，、：:·\-—]+|[\s，、：:·\-—]+$/g,'')}
function pieces(s){var out=[],buf='';for(var i=0;i<s.length;i++){var c=s[i];buf+=c;if('。！？!?；'.indexOf(c)>=0){out.push(buf.trim());buf=''}}if(buf.trim())out.push(buf.trim());return out}
var mapReady=fetch(BASE+'manifest.json?v='+VER).then(function(r){return r.json()}).then(function(m){map=m.clips||{};eager=m.eager||[];if(ctx)warm()}).catch(function(){map={}});
function url(f){return BASE+f+'?v='+VER}
function load(f){if(buffers[f])return Promise.resolve(buffers[f]);if(!ctx)return Promise.reject();if(!loading[f])loading[f]=fetch(url(f)).then(function(r){if(!r.ok)throw 0;return r.arrayBuffer()}).then(function(b){return new Promise(function(ok,no){ctx.decodeAudioData(b,ok,no)})}).then(function(b){buffers[f]=b;return b}).catch(function(e){delete loading[f];throw e});return loading[f]}
function warm(){if(warmed||!map)return;warmed=true;var list=eager.slice(),i=0;function next(){if(i>=list.length)return;load(list[i++]).catch(function(){}).then(next)}for(var k=0;k<4;k++)next()}
function unlock(){var AC=window.AudioContext||window.webkitAudioContext;try{if(AC&&!ctx){ctx=new AC({latencyHint:'interactive'});warm()}if(ctx&&ctx.state!=='running')ctx.resume();if(ctx&&!unlocked){unlocked=true;var s=ctx.createBufferSource();s.buffer=ctx.createBuffer(1,1,22050);s.connect(ctx.destination);s.start(0)}}catch(e){}if(!htmlAudio&&window.Audio){try{htmlAudio=new Audio();htmlAudio.preload='auto'}catch(e){}}}
['pointerdown','touchstart','touchend','mousedown','keydown'].forEach(function(t){window.addEventListener(t,unlock,{capture:true,passive:true})});
function fire(u,type){try{u.dispatchEvent(new Event(type))}catch(e){try{var h=u['on'+type];if(h)h.call(u,{type:type,utterance:u})}catch(_){}}}
function lookup(u){if(!map)return null;var lang=String(u.lang||'').toLowerCase(),t=norm(u.text);
 if(lang&&lang.indexOf('zh')!==0&&lang.indexOf('cmn')!==0)return null;if(!HAN.test(t))return null;
 if(map[t])return [map[t]];var c=clean(t);if(map[c])return [map[c]];
 var ps=pieces(t),fs=[];for(var i=0;i<ps.length;i++){var p=clean(ps[i]);if(!p)continue;if(!HAN.test(p)&&/^[\s\p{P}\p{S}]*$/u.test(p))continue;var f=map[p]||map[p.replace(/[。！？!?；]+$/,'')]||map[p+'。'];if(!f)return null;fs.push(f)}
 return fs.length?fs:null}
function done(item){if(cur!==item)return;cur=null;stopCur=null;fire(item.u,'end');pump()}
function toNative(item){if(cur!==item)return;cur=null;stopCur=null;if(item.started){fire(item.u,'end');pump();return}runNative(item)}
function runNative(item){cur=item;item.native=true;var w=function(){item.u.removeEventListener('end',w);item.u.removeEventListener('error',w);if(cur===item){cur=null;pump()}};item.u.addEventListener('end',w);item.u.addEventListener('error',w);nativeSpeak(item.u)}
function playBuffers(item,bufs){var i=0,vol=typeof item.u.volume==='number'?item.u.volume:1,src=null,timer=0;
 stopCur=function(){clearTimeout(timer);if(src){src.onended=null;try{src.stop()}catch(e){}}};
 function step(){if(cur!==item)return;if(i>=bufs.length){done(item);return}try{if(ctx.state!=='running')ctx.resume();var s=ctx.createBufferSource(),g=ctx.createGain();g.gain.value=vol;s.buffer=bufs[i];s.__clip=item.fs[i];s.connect(g);g.connect(ctx.destination);s.onended=function(){i++;timer=setTimeout(step,i<bufs.length?110:0)};src=s;s.start(0);if(!item.started){item.started=true;fire(item.u,'start')}}catch(e){toNative(item)}}
 step()}
function playHtml(item){if(!htmlAudio){toNative(item);return}var i=0,vol=typeof item.u.volume==='number'?item.u.volume:1;
 stopCur=function(){htmlAudio.onended=null;htmlAudio.onerror=null;try{htmlAudio.pause()}catch(e){}};
 function step(){if(cur!==item)return;if(i>=item.fs.length){done(item);return}htmlAudio.onended=function(){i++;step()};htmlAudio.onerror=function(){toNative(item)};try{htmlAudio.volume=vol;htmlAudio.src=url(item.fs[i]);var p=htmlAudio.play();if(!item.started){item.started=true;fire(item.u,'start')}if(p&&p.catch)p.catch(function(e){if(!(e&&e.name==='AbortError'))toNative(item)})}catch(e){toNative(item)}}
 step()}
function pump(){if(cur||!queue.length)return;var item=queue.shift();if(!item.fs){runNative(item);return}cur=item;
 var have=item.fs.map(function(f){return buffers[f]});if(ctx&&have.every(Boolean)){playBuffers(item,have);return}
 if(!ctx){playHtml(item);return}
 var settled=false,t=setTimeout(function(){if(!settled){settled=true;playHtml(item)}},800);
 Promise.all(item.fs.map(load)).then(function(b){if(!settled){settled=true;clearTimeout(t);playBuffers(item,b)}},function(){if(!settled){settled=true;clearTimeout(t);playHtml(item)}})}
synth.speak=function(u){var fs=null;try{fs=lookup(u)}catch(e){}if(!fs&&!cur&&!queue.length)return nativeSpeak(u);queue.push({u:u,fs:fs});pump()};
synth.cancel=function(){var q=queue,c=cur;queue=[];cur=null;if(stopCur){stopCur();stopCur=null}if(c&&!c.native)fire(c.u,'end');nativeCancel()};
function g(n){var d=Object.getOwnPropertyDescriptor(proto,n);return d&&d.get?d.get.call(synth):false}
try{Object.defineProperty(synth,'speaking',{configurable:true,get:function(){return (!!cur&&!cur.native)||g('speaking')}})}catch(e){}
try{Object.defineProperty(synth,'pending',{configurable:true,get:function(){return queue.length>0||g('pending')}})}catch(e){}
window.NaturalVoice={version:VER,ready:mapReady,unlock:unlock,has:function(t){return !!lookup({text:t,lang:'zh-TW'})},buffers:buffers};
})();
