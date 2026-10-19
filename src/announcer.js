// Short, prerecorded calls. One speaker at a time; stale rewards never catch up later.
export const VOICE_FILES=['combo','congratulations','objective-achieved','go','go-go-go','look-out','get-down','mission-completed','game-over','you-win'];
export class Announcer{
 constructor({now,start,duck=()=>{},random=Math.random}){this.now=now;this.start=start;this.duck=duck;this.random=random;this.queue=[];this.current=null;this.lastCombo=0;this.lastChoice=new Map();this.nextAt=0;}
 choose(group,choices){const candidates=choices.filter(v=>v!==this.lastChoice.get(group)),pool=candidates.length?candidates:choices,key=pool[Math.floor(this.random()*pool.length)];this.lastChoice.set(group,key);return key;}
 request(group,choices,priority){const cue={group,key:this.choose(group,choices),priority,expires:this.now()+3};this.queue=this.queue.filter(c=>c.group!==group);this.queue.push(cue);this.queue.sort((a,b)=>b.priority-a.priority);this.queue=this.queue.slice(0,2);}
 event(type,data={}){
  if(type==='fill'){const previous=this.lastCombo;this.lastCombo=data.combo||0;const milestone=[100,50,10].find(n=>previous<n&&this.lastCombo>=n);if(milestone)this.request('streak',milestone===10?['combo']:['congratulations','objective-achieved'],2);}
  if(type==='surge')this.request('surge',['go-go-go','go'],3);
  if(type==='hurt'||type==='shieldBreak'){this.lastCombo=0;this.queue=this.queue.filter(c=>c.group!=='streak');if(type==='hurt'&&data.lives===1&&data.mode!=='practice')this.request('danger',['look-out','get-down'],5);}
  if(type==='clear'&&data.boss)this.request('clear',['mission-completed','objective-achieved'],4);
  if(type==='end')this.request('end',data.result?.won?['you-win']:['game-over'],6);
 }
 step(){
  const t=this.now();this.queue=this.queue.filter(c=>c.expires>t);
  if(this.current){if(!this.queue.length||this.queue[0].priority<5||this.queue[0].priority<=this.current.priority)return;this.stopCurrent();this.nextAt=t;}
  if(t<this.nextAt||!this.queue.length)return;
  const cue=this.queue.shift();this.current=cue;const done=()=>{if(this.current!==cue)return;this.current=null;this.duck(false);this.nextAt=this.now()+.25;};
  cue.stop=this.start(cue.key,done);if(!cue.stop){this.current=null;return;}this.duck(true);
 }
 stopCurrent(){const cue=this.current;this.current=null;cue?.stop?.();this.duck(false);}
 clear(resetStreak=false){this.queue=[];this.stopCurrent();this.nextAt=0;if(resetStreak)this.lastCombo=0;}
}
