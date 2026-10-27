/* Little Adventure Islands return link, v1. */
(()=>{
 'use strict';
 const game=document.currentScript?.dataset.game;
 const ids=['bpmf','pencil','english','dino','painter','science','story','builder','princess','song'];
 if(!ids.includes(game))return;
 function mount(){
  if(document.getElementById('islands-return-bar'))return;
  const host=document.createElement('div');host.id='islands-return-bar';
  host.style.cssText='display:block;position:relative;z-index:2000;flex:0 0 auto;width:100%;min-height:42px;box-sizing:border-box;';
  const shadow=host.attachShadow({mode:'open'});
  shadow.innerHTML='<style>:host{font:16px/1.4 system-ui,-apple-system,"PingFang TC",sans-serif}div{display:flex;align-items:center;justify-content:space-between;gap:10px;box-sizing:border-box;min-height:42px;padding:4px max(12px,env(safe-area-inset-right)) 4px max(12px,env(safe-area-inset-left));background:#f5f5e9;border-bottom:1px solid #d7e2d1;color:#36584b}a{display:inline-flex;align-items:center;min-height:34px;padding:0 12px;border-radius:18px;background:#e1ebd9;color:#285447;font-weight:800;text-decoration:none;white-space:nowrap}a:focus-visible{outline:3px solid #407d70;outline-offset:2px}span{font-size:12px;color:#698271}@media(max-width:420px){span{font-size:11px}}</style><div><a target="_top" rel="noopener" href="https://little-adventure-islands.pages.dev/?return='+game+'#ocean">← 回群島</a><span>接著探索其他小屋</span></div>';
  document.body.prepend(host);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
