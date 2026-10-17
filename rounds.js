export function shuffle(items,random=Math.random){const a=[...items];for(let j=a.length-1;j>0;j--){const k=Math.floor(random()*(j+1));[a[j],a[k]]=[a[k],a[j]];}return a;}
export function buildRound(pool,count=5,choices=3,previous=[],random=Math.random){
 const unique=[...new Map(pool.filter(x=>x&&x.id&&x.label).map(x=>[x.id,x])).values()];
 if(unique.length<count)throw Error('可用題目不足，請選擇另一個難度。');
 const ordered=[...shuffle(unique.filter(x=>!previous.includes(x.id)),random),...shuffle(unique.filter(x=>previous.includes(x.id)),random)];
 return ordered.slice(0,count).map(answer=>{
  const others=shuffle(unique.filter(x=>x.id!==answer.id&&x.label!==answer.label),random),seen=new Set([answer.label]);
  const options=[answer];for(const option of others){if(seen.has(option.label))continue;options.push(option);seen.add(option.label);if(options.length>=choices)break;}
  if(options.length<choices)throw Error('不同答案選項不足。');
  return {answer,options:shuffle(options,random)};
 });
}
export function attempt(round,id){if(round.done)return {status:'locked'};if(!round.question.options.some(x=>x.id===id))return {status:'invalid'};if(id!==round.question.answer.id){round.mistakes++;return {status:'retry'};}round.done=true;return {status:'correct',clean:round.mistakes===0};}
