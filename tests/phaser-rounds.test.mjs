import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {buildRound,attempt} from '../rounds.js';
const config=JSON.parse(fs.readFileSync(new URL('../game-config.json',import.meta.url)));
test('five-question rounds and answer labels do not repeat at either difficulty',()=>{
 for(const more of [false,true]){let previous=[];for(let j=0;j<500;j++){
  const round=buildRound(config.items.filter(x=>more||x.starter),5,more?3:2,previous);assert.equal(round.length,5);assert.equal(new Set(round.map(x=>x.answer.id)).size,5);
  for(const q of round){assert.equal(q.options.length,more?3:2);assert.equal(new Set(q.options.map(x=>x.label)).size,q.options.length);assert.ok(q.options.some(x=>x.id===q.answer.id));}
  previous=round.map(q=>q.answer.id);
 }}
});
test('retries preserve the question and repeated correct taps cannot score twice',()=>{
 const question=buildRound(config.items,5,3)[0],r={question,mistakes:0,done:false};
 assert.equal(attempt(r,'not-an-option').status,'invalid');assert.equal(attempt(r,question.options.find(x=>x.id!==question.answer.id).id).status,'retry');assert.equal(r.mistakes,1);assert.equal(r.done,false);
 assert.equal(attempt(r,question.answer.id).status,'correct');assert.equal(attempt(r,question.answer.id).status,'locked');
});
test('the game shell, local engine and all existing photo references are packaged',()=>{
 const root=new URL('../',import.meta.url);for(const file of ['adventure.html','adventure.css','game.js','rounds.js','vendor/phaser.min.js','vendor/Phaser-LICENSE.md'])assert.ok(fs.statSync(new URL(file,root)).size>0);
 for(const item of config.items)if(item.photo)assert.ok(fs.statSync(new URL(item.photo,root)).size>0);
 const sw=fs.readFileSync(new URL('sw.js',root),'utf8');for(const file of ['adventure.html','adventure.css','game.js','rounds.js','game-config.json','vendor/phaser.min.js'])assert.ok(sw.includes('./'+file));
});
