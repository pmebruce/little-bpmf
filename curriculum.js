'use strict';
const TOPICS = [
  ['all','全部生活'], ['animals','動物'], ['fruit','水果'],
  ['food','食物'], ['travel','交通'], ['daily','日常用品'], ['nature','大自然']
];
// Each syllable has a separate character and tone. Tone 1 has no printed mark.
const WORD_BANK = [
  ['animals','貓','🐱','ㄇㄠ'],['animals','狗','🐶','ㄍㄡˇ'],['animals','兔','🐰','ㄊㄨˋ'],
  ['animals','魚','🐟','ㄩˊ'],['animals','鳥','🐦','ㄋㄧㄠˇ'],['animals','馬','🐴','ㄇㄚˇ'],
  ['animals','牛','🐮','ㄋㄧㄡˊ'],['animals','羊','🐑','ㄧㄤˊ'],['animals','虎','🐯','ㄏㄨˇ'],
  ['animals','熊','🐻','ㄒㄩㄥˊ'],['animals','青蛙','🐸','ㄑㄧㄥ ㄨㄚ'],['animals','烏龜','🐢','ㄨ ㄍㄨㄟ'],
  ['fruit','瓜','🍉','ㄍㄨㄚ'],['fruit','桃','🍑','ㄊㄠˊ'],['fruit','梨','🍐','ㄌㄧˊ'],
  ['fruit','橘','🍊','ㄐㄩˊ'],['fruit','橙','🍊','ㄔㄥˊ'],['fruit','柚','🍈','ㄧㄡˋ'],
  ['fruit','棗','🟤','ㄗㄠˇ'],['fruit','李','🟣','ㄌㄧˇ'],['fruit','蘋果','🍎','ㄆㄧㄥˊ ㄍㄨㄛˇ'],
  ['fruit','香蕉','🍌','ㄒㄧㄤ ㄐㄧㄠ'],['fruit','草莓','🍓','ㄘㄠˇ ㄇㄟˊ'],['fruit','西瓜','🍉','ㄒㄧ ㄍㄨㄚ'],
  ['food','包','🥟','ㄅㄠ'],['food','飯','🍚','ㄈㄢˋ'],['food','米','🌾','ㄇㄧˇ'],
  ['food','麵','🍜','ㄇㄧㄢˋ'],['food','蛋','🥚','ㄉㄢˋ'],['food','湯','🥣','ㄊㄤ'],
  ['food','糖','🍬','ㄊㄤˊ'],['food','茶','🍵','ㄔㄚˊ'],['food','餅','🍪','ㄅㄧㄥˇ'],
  ['food','牛奶','🥛','ㄋㄧㄡˊ ㄋㄞˇ'],['food','豆花','🥣','ㄉㄡˋ ㄏㄨㄚ'],['food','麵包','🍞','ㄇㄧㄢˋ ㄅㄠ'],
  ['travel','車','🚗','ㄔㄜ'],['travel','船','⛵','ㄔㄨㄢˊ'],['travel','路','🛣️','ㄌㄨˋ'],
  ['travel','橋','🌉','ㄑㄧㄠˊ'],['travel','站','🚉','ㄓㄢˋ'],['travel','票','🎫','ㄆㄧㄠˋ'],
  ['travel','輪','🛞','ㄌㄨㄣˊ'],['travel','燈','🚦','ㄉㄥ'],['travel','公車','🚌','ㄍㄨㄥ ㄔㄜ'],
  ['travel','火車','🚂','ㄏㄨㄛˇ ㄔㄜ'],['travel','飛機','✈️','ㄈㄟ ㄐㄧ'],['travel','輪船','🚢','ㄌㄨㄣˊ ㄔㄨㄢˊ'],
  ['daily','書','📖','ㄕㄨ'],['daily','筆','✏️','ㄅㄧˇ'],['daily','門','🚪','ㄇㄣˊ'],
  ['daily','手','✋','ㄕㄡˇ'],['daily','腳','🦶','ㄐㄧㄠˇ'],['daily','衣','👕','ㄧ'],
  ['daily','鞋','👟','ㄒㄧㄝˊ'],['daily','帽','🧢','ㄇㄠˋ'],['daily','杯','🥤','ㄅㄟ'],
  ['daily','桌','🪑','ㄓㄨㄛ'],['daily','椅','🪑','ㄧˇ'],['daily','書包','🎒','ㄕㄨ ㄅㄠ'],
  ['nature','山','⛰️','ㄕㄢ'],['nature','花','🌸','ㄏㄨㄚ'],['nature','草','🌱','ㄘㄠˇ'],
  ['nature','樹','🌳','ㄕㄨˋ'],['nature','雨','🌧️','ㄩˇ'],['nature','雲','☁️','ㄩㄣˊ'],
  ['nature','風','🌬️','ㄈㄥ'],['nature','水','💧','ㄕㄨㄟˇ'],['nature','石','🪨','ㄕˊ'],
  ['nature','天','🌤️','ㄊㄧㄢ'],['nature','太陽','☀️','ㄊㄞˋ ㄧㄤˊ'],['nature','月亮','🌙','ㄩㄝˋ ㄌㄧㄤˋ'],
  ['animals','小狗','🐶','ㄒㄧㄠˇ ㄍㄡˇ'],['animals','小貓','🐱','ㄒㄧㄠˇ ㄇㄠ'],
  ['animals','河馬','🦛','ㄏㄜˊ ㄇㄚˇ'],['animals','海豚','🐬','ㄏㄞˇ ㄊㄨㄣˊ'],
  ['fruit','芒果','🥭','ㄇㄤˊ ㄍㄨㄛˇ'],['fruit','木瓜','🍈','ㄇㄨˋ ㄍㄨㄚ'],
  ['fruit','葡萄','🍇','ㄆㄨˊ ㄊㄠˊ'],['fruit','鳳梨','🍍','ㄈㄥˋ ㄌㄧˊ'],
  ['food','米飯','🍚','ㄇㄧˇ ㄈㄢˋ'],['food','牛肉','🥩','ㄋㄧㄡˊ ㄖㄡˋ'],
  ['food','蛋糕','🍰','ㄉㄢˋ ㄍㄠ'],['food','泡麵','🍜','ㄆㄠˋ ㄇㄧㄢˋ'],
  ['travel','汽車','🚙','ㄑㄧˋ ㄔㄜ'],['travel','巴士','🚌','ㄅㄚ ㄕˋ'],
  ['travel','單車','🚲','ㄉㄢ ㄔㄜ'],['travel','馬路','🛣️','ㄇㄚˇ ㄌㄨˋ'],
  ['daily','手套','🧤','ㄕㄡˇ ㄊㄠˋ'],['daily','水杯','🥤','ㄕㄨㄟˇ ㄅㄟ'],
  ['daily','雨衣','🧥','ㄩˇ ㄧ'],['daily','毛巾','🧣','ㄇㄠˊ ㄐㄧㄣ'],
  ['nature','彩虹','🌈','ㄘㄞˇ ㄏㄨㄥˊ'],['nature','白雲','☁️','ㄅㄞˊ ㄩㄣˊ'],
  ['nature','大海','🌊','ㄉㄚˋ ㄏㄞˇ'],['nature','森林','🌲','ㄙㄣ ㄌㄧㄣˊ']
].map(([category,word,emoji,z]) => ({
  id:'word:'+word,category,word,emoji,z,
  parts:z.split(' ').map((syllable,i)=>({word:[...word][i],z:syllable}))
}));
const TONE_OPTIONS = [
  {answer:'一聲',mark:'—',hint:'聲音高高平平的。',shape:'平平走'},
  {answer:'二聲',mark:'ˊ',hint:'聲音往上揚。',shape:'往上爬'},
  {answer:'三聲',mark:'ˇ',hint:'單獨慢讀時，先低下去再上來。',shape:'轉個彎'},
  {answer:'四聲',mark:'ˋ',hint:'聲音由高往下落。',shape:'往下滑'},
  {answer:'輕聲',mark:'˙',hint:'聲音念得輕短。',shape:'輕輕點'}
];
const TONE_BANK = WORD_BANK.map(w => {
  const syllable=w.parts[w.parts.length-1];
  const mark=[...syllable.z].find(z=>'ˊˇˋ'.includes(z))||'—';
  return {...w,id:'tone:'+w.word,...TONE_OPTIONS.find(t=>t.mark===mark),target:syllable.word};
}).concat([{id:'tone:媽媽',category:'daily',word:'媽媽',z:'ㄇㄚ ·ㄇㄚ',emoji:'👩',target:'第二個媽',parts:[{word:'媽',z:'ㄇㄚ'},{word:'媽',z:'˙ㄇㄚ'}],...TONE_OPTIONS[4]}]);
