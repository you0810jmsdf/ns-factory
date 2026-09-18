// ns-factory LP 用の複写（元: CBI/jarvis/static/staff-graph.js 2026-09-18）。無変更。
(function (global) {
  'use strict';

  const TAU=Math.PI*2;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const PALETTE={back:275,front:190,saturation:90};
  const STATES=['idle','listen','think','speak','confirm','error'];
  const POLL_MS=60000;

  class StaffGraph {
    static particleCount(count) {
      return Number.isSafeInteger(count)&&count>0 ? Math.min(count,40) : 0;
    }

    constructor(canvas,options={}) {
      this.canvas=canvas;
      this.ctx=canvas.getContext('2d');
      this.core=options.core||global.JarvisCore;
      this.onSelect=options.onSelect||(()=>{});
      this.state='idle';
      this.visible=true;
      this.destroyed=false;
      this.time=0;
      this.level=0;
      this.pulseAt=-Infinity;
      this.frameId=null;
      this.last=global.performance.now();
      this.width=0;
      this.height=0;
      this.drag=null;
      this.focused=1;
      this.keyboardFocus=false;
      this.source=null;
      this.analyser=null;
      this.samples=null;
      this.expires=new Map();

      this.knowledge=new Map();
      this.growth=new Map();
      this.vaultAvailable=false;
      this.tooltipNode=null;
      this.pageActive=true;
      this.pollTimer=null;
      this.requestTimer=null;
      this.controller=null;
      this.pollEpoch=0;
      this.lastPollAt=-Infinity;
      this.pollSupported=typeof global.fetch==='function'
        && typeof global.AbortController==='function'
        && typeof global.setTimeout==='function';

      const style=global.getComputedStyle(canvas);
      this.colors={
        background:style.getPropertyValue('--bg').trim()||'#03050c',
        text:style.getPropertyValue('--text').trim()||'#e7eef8',
        muted:style.getPropertyValue('--muted').trim()||'#94a2b7',
        border:style.getPropertyValue('--border').trim()||'#222c3d',
        accent:style.getPropertyValue('--accent').trim()||'#96e4e4',
        error:style.getPropertyValue('--graph-error').trim()||'#f0a8b0'
      };

      this.nodes=[
        {id:'chief',label:'首席幕僚',phase:0},
        ...this.core.STAFF.map((staff,index)=>({
          id:staff.id,label:staff.label+'幕僚',phase:index*TAU/9
        }))
      ].map(node=>({...node,x:0,y:0,vx:0,vy:0,ax:0,ay:0}));

      this.media=global.matchMedia
        ? global.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
      this.reduced=!!this.media?.matches;
      this.motionChange=event=>{
        this.reduced=event.matches;
        this.nodes.forEach(node=>{node.vx=0;node.vy=0;});
      };
      this.media?.addEventListener?.('change',this.motionChange);

      this.handlers={
        pointerdown:event=>this.pointerDown(event),
        pointermove:event=>this.pointerMove(event),
        pointerup:event=>this.pointerUp(event),
        pointerleave:()=>{this.tooltipNode=null;},
        pointercancel:()=>{this.releaseDrag();this.tooltipNode=null;},
        lostpointercapture:()=>this.releaseDrag(),
        keydown:event=>this.keyDown(event),
        focus:()=>{
          this.keyboardFocus=true;
          this.tooltipNode=this.nodes[this.focused];
        },
        blur:()=>{this.keyboardFocus=false;this.tooltipNode=null;}
      };
      for(const [name,handler] of Object.entries(this.handlers)){
        canvas.addEventListener(name,handler);
      }

      this.resizeHandler=()=>this.resize();
      if(global.ResizeObserver){
        this.observer=new global.ResizeObserver(this.resizeHandler);
        this.observer.observe(canvas);
      }else{
        global.addEventListener('resize',this.resizeHandler);
      }
      this.visibilityHandler=()=>{
        this.releaseDrag();
        this.tooltipNode=null;
        this.schedule();
        this.syncPolling();
      };
      this.pageHideHandler=()=>{
        this.pageActive=false;
        this.cancelPolling();
        this.tooltipNode=null;
      };
      this.pageShowHandler=()=>{
        this.pageActive=true;
        this.syncPolling();
      };
      global.document.addEventListener('visibilitychange',this.visibilityHandler);
      global.addEventListener('pagehide',this.pageHideHandler);
      global.addEventListener('pageshow',this.pageShowHandler);
      this.frame=now=>this.tick(now);
      this.resize();
      this.schedule();
      this.syncPolling();
    }

    pollingAllowed() {
      return this.pollSupported&&!this.destroyed
        &&this.pageActive&&!global.document.hidden;
    }

    cancelPolling() {
      if(this.pollTimer!==null)global.clearTimeout(this.pollTimer);
      if(this.requestTimer!==null)global.clearTimeout(this.requestTimer);
      this.pollTimer=null;
      this.requestTimer=null;
      this.pollEpoch++;
      this.controller?.abort();
      this.controller=null;
    }

    syncPolling() {
      if(!this.pollingAllowed()){
        this.cancelPolling();
        return;
      }
      if(this.controller||this.pollTimer!==null)return;
      const delay=Math.max(0,POLL_MS-(global.performance.now()-this.lastPollAt));
      this.pollTimer=global.setTimeout(()=>{
        this.pollTimer=null;
        void this.refreshVault();
      },delay);
    }

    async refreshVault() {
      if(!this.pollingAllowed()||this.controller)return;
      const epoch=this.pollEpoch;
      const controller=new global.AbortController();
      this.controller=controller;
      this.lastPollAt=global.performance.now();
      this.requestTimer=global.setTimeout(()=>controller.abort(),15000);
      try{
        const response=await global.fetch('/api/vault-graph',{
          signal:controller.signal,
          credentials:'same-origin',
          cache:'no-store'
        });
        if(!response.ok)throw new Error('Unavailable');
        const data=await response.json();
        if(epoch!==this.pollEpoch||controller.signal.aborted)return;
        this.applyVaultSnapshot(data);
      }catch{
        // Keep the last snapshot on transient fetch failures: the 5-minute
        // rescan on OneDrive can exceed the 15s client timeout, and clearing
        // here made the particles blink out once per cache cycle. Only an
        // explicit {available:false} from the server clears the display.
      }finally{
        if(epoch===this.pollEpoch){
          if(this.requestTimer!==null)global.clearTimeout(this.requestTimer);
          this.requestTimer=null;
          this.controller=null;
          this.syncPolling();
        }
      }
    }

    applyVaultSnapshot(data) {
      const next=new Map();
      let valid=data?.available===true&&data.staff
        &&typeof data.staff==='object';
      if(valid){
        for(const staff of this.core.STAFF){
          const item=data.staff[staff.id];
          if(!item||!Number.isSafeInteger(item.count)||item.count<0
            ||!Array.isArray(item.recent)
            ||item.recent.some(name=>typeof name!=='string')){
            valid=false;
            break;
          }
          next.set(staff.id,{
            count:item.count,
            recent:item.recent.slice(0,10).map(name=>
              name.replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,256))
          });
        }
      }
      if(!valid){
        this.knowledge.clear();
        this.growth.clear();
        this.vaultAvailable=false;
        this.tooltipNode=null;
        return;
      }
      const now=global.performance.now();
      if(this.vaultAvailable){
        for(const [id,item] of next){
          if(item.count>(this.knowledge.get(id)?.count||0)){
            this.growth.set(id,now+2000);
          }
        }
      }
      this.knowledge=next;
      this.vaultAvailable=true;
    }

    setState(state) {
      if(!STATES.includes(state))throw new Error('Unknown graph state');
      this.state=state;
      if(state!=='speak')this.pulseAt=-Infinity;
    }

    reactToText(text) {
      const until=global.performance.now()+8000;
      for(const id of this.core.detectStaff(text))this.expires.set(id,until);
    }

    pulseSpeech() {
      if(this.state==='speak')this.pulseAt=global.performance.now();
    }

    attachNode(context,node) {
      if(this.source===node&&this.analyser)return;
      this.detach();
      if(!context||!node)return;
      const analyser=context.createAnalyser();
      analyser.fftSize=256;
      node.connect(analyser);
      this.source=node;
      this.analyser=analyser;
      this.samples=new Float32Array(analyser.fftSize);
    }

    detach() {
      if(this.source&&this.analyser){
        try{this.source.disconnect(this.analyser);}catch{}
      }
      this.source=null;
      this.analyser=null;
      this.samples=null;
      this.level=0;
    }

    reset() {
      this.expires.clear();
      this.growth.clear();
      this.tooltipNode=null;
      this.keyboardFocus=false;
      this.pulseAt=-Infinity;
      this.detach();
      this.releaseDrag();
      this.state='idle';
      this.nodes.forEach(node=>{node.vx=0;node.vy=0;});
      this.cancelPolling();
      this.syncPolling();
    }

    setVisible(visible) {
      this.visible=!!visible;
      if(!this.visible){
        this.releaseDrag();
        this.tooltipNode=null;
      }else{
        this.resize();
      }
      this.schedule();
    }

    schedule() {
      if(this.frameId!==null){
        global.cancelAnimationFrame(this.frameId);
        this.frameId=null;
      }
      if(this.destroyed||!this.visible||global.document.hidden)return;
      this.last=global.performance.now();
      this.frameId=global.requestAnimationFrame(this.frame);
    }

    resize() {
      const rect=this.canvas.getBoundingClientRect();
      if(!rect.width||!rect.height)return;
      const oldWidth=this.width,oldHeight=this.height;
      this.width=rect.width;
      this.height=rect.height;
      const dpr=Math.min(global.devicePixelRatio||1,2);
      this.canvas.width=Math.round(this.width*dpr);
      this.canvas.height=Math.round(this.height*dpr);
      this.ctx.setTransform(dpr,0,0,dpr,0,0);

      this.nodes.forEach((node,index)=>{
        const angle=-Math.PI/2+(index-1)*TAU/9;
        node.ax=index ? this.width/2+Math.cos(angle)*this.width*.34 : this.width/2;
        node.ay=index ? this.height/2+Math.sin(angle)*this.height*.34 : this.height/2;
        if(oldWidth&&oldHeight){
          node.x*=this.width/oldWidth;
          node.y*=this.height/oldHeight;
        }else{
          node.x=node.ax;
          node.y=node.ay;
        }
        this.bound(node);
      });
    }

    bound(node) {
      node.x=clamp(node.x,42,Math.max(42,this.width-42));
      node.y=clamp(node.y,30,Math.max(30,this.height-38));
    }

    activity(node,now) {
      const until=this.expires.get(node.id)||0;
      return clamp((until-now)/1200,0,1);
    }

    readLevel(now,dt) {
      let target=0;
      if(this.analyser){
        this.analyser.getFloatTimeDomainData(this.samples);
        let sum=0;
        for(const sample of this.samples)sum+=sample*sample;
        target=clamp(Math.sqrt(sum/this.samples.length)*7,0,1);
      }else if(this.state==='speak'){
        const boundary=Math.exp(-Math.max(0,now-this.pulseAt)/220);
        target=.18+.16*Math.pow(Math.sin(this.time*6),2)+boundary*.6;
      }
      this.level+=(target-this.level)*Math.min(1,dt*12);
    }

    step(dt,now) {
      const forces=this.nodes.map(()=>({x:0,y:0}));
      const center=this.nodes[0];
      for(let i=0;i<this.nodes.length;i++){
        const node=this.nodes[i];
        const active=this.activity(node,now);
        const motion={idle:1,listen:1.8,think:2.6,speak:2.2,confirm:1.5,error:.7}[this.state];
        const amplitude=2.5*motion+active*14+(this.state==='speak'?this.level*18:0);
        forces[i].x+=(node.ax-node.x)*5+Math.sin(this.time*.65+node.phase)*amplitude;
        forces[i].y+=(node.ay-node.y)*5+Math.cos(this.time*.55+node.phase)*amplitude;
        if(i){
          const dx=node.x-center.x,dy=node.y-center.y;
          const distance=Math.max(1,Math.hypot(dx,dy));
          const rest=Math.hypot(node.ax-center.ax,node.ay-center.ay);
          const spring=(distance-rest)*3;
          forces[i].x-=dx/distance*spring;
          forces[i].y-=dy/distance*spring;
          forces[0].x+=dx/distance*spring*.25;
          forces[0].y+=dy/distance*spring*.25;
        }

        for(let j=i+1;j<this.nodes.length;j++){
          let dx=node.x-this.nodes[j].x,dy=node.y-this.nodes[j].y;
          if(Math.abs(dx)+Math.abs(dy)<.01){dx=.1;dy=.1;}
          const distance=Math.max(.1,Math.hypot(dx,dy));
          const strength=Math.min(140,16000/Math.max(225,distance*distance));
          const fx=dx/distance*strength,fy=dy/distance*strength;
          forces[i].x+=fx;forces[i].y+=fy;
          forces[j].x-=fx;forces[j].y-=fy;
        }
      }

      this.nodes.forEach((node,index)=>{
        if(this.drag?.node===node)return;
        if(this.reduced){
          node.x=node.ax;node.y=node.ay;node.vx=0;node.vy=0;
        }else{
          const damping=Math.exp(-4*dt);
          node.vx=clamp((node.vx+forces[index].x*dt)*damping,-140,140);
          node.vy=clamp((node.vy+forces[index].y*dt)*damping,-140,140);
          node.x+=node.vx*dt;node.y+=node.vy*dt;
        }
        this.bound(node);
      });
    }

    tint(alpha=1,front=false) {
      if(this.state==='error')return this.colors.error;
      const hue=front||this.state==='listen'||this.state==='speak'
        ? PALETTE.front : PALETTE.back;
      return `hsla(${hue},${PALETTE.saturation}%,70%,${alpha})`;
    }

    drawKnowledge(node,now) {
      const item=this.knowledge.get(node.id);
      if(!item)return;
      const ctx=this.ctx;
      const count=StaffGraph.particleCount(item.count);
      const growth=clamp(((this.growth.get(node.id)||0)-now)/2000,0,1);
      const drift=this.reduced?0:this.time*.16;
      ctx.fillStyle=this.tint(1,true);
      ctx.shadowColor=ctx.fillStyle;
      ctx.shadowBlur=growth>0?12:3;
      ctx.globalAlpha=.45+growth*.55;
      for(let i=0;i<count;i++){
        const angle=i*2.39996323+node.phase+drift*(i%2?1:-1);
        const radius=23+(i%4)*5;
        const x=node.x+Math.cos(angle)*radius;
        const y=node.y+Math.sin(angle)*radius*.55;
        ctx.beginPath();
        ctx.arc(x,y,1.15+(this.reduced?0:growth*.65),0,TAU);
        ctx.fill();
      }
      ctx.globalAlpha=1;
      ctx.shadowBlur=0;
      ctx.textAlign='left';
      ctx.font='10px monospace';
      ctx.fillStyle=growth>0?this.colors.accent:this.colors.muted;
      ctx.fillText(String(item.count),node.x+15,node.y-15);
      ctx.textAlign='center';
    }

    fitText(text,width) {
      const ctx=this.ctx;
      if(ctx.measureText(text).width<=width)return text;
      let result=text;
      while(result&&ctx.measureText(result+'…').width>width){
        result=result.slice(0,-1);
      }
      return result+'…';
    }

    drawTooltip() {
      const node=this.tooltipNode;
      const item=node&&this.knowledge.get(node.id);
      if(!node||!item||this.drag)return;
      const ctx=this.ctx;
      const width=Math.min(250,this.width-16);
      if(width<40)return;
      const names=item.recent.slice(0,3);
      const lines=[
        `${node.label} · ${item.count}件`,
        ...(names.length?names:['ノートはありません'])
      ];
      const height=lines.length*19+16;
      const x=clamp(node.x+18,8,this.width-width-8);
      const y=clamp(node.y-height-16,8,this.height-height-8);
      ctx.save();
      ctx.globalAlpha=1;
      ctx.shadowBlur=0;
      ctx.fillStyle=this.colors.background;
      ctx.strokeStyle=this.colors.border;
      ctx.lineWidth=1;
      ctx.fillRect(x,y,width,height);
      ctx.strokeRect(x,y,width,height);
      ctx.textAlign='left';
      ctx.textBaseline='middle';
      ctx.font='11px "Yu Gothic UI", sans-serif';
      lines.forEach((line,index)=>{
        ctx.fillStyle=index===0?this.colors.accent:this.colors.text;
        // Canvas text only; never interpreted as HTML.
        ctx.fillText(this.fitText(line,width-20),x+10,y+17+index*19);
      });
      ctx.restore();
    }

    draw(now) {
      const ctx=this.ctx,w=this.width,h=this.height;
      if(!w||!h)return;
      ctx.clearRect(0,0,w,h);
      ctx.fillStyle=this.colors.background;
      ctx.fillRect(0,0,w,h);
      const center=this.nodes[0];
      const pulse=this.reduced?0:(1+Math.sin(this.time*(this.state==='think'?5:2)))/2;
      const level=this.reduced?0:this.level;

      if(this.state==='think'){
        for(let i=0;i<3;i++){
          const progress=this.reduced ? .45 : ((this.time*.42+i/3)%1);
          ctx.globalAlpha=this.reduced ? .18 : (1-progress)*.32;
          ctx.strokeStyle=this.tint(1,true);
          ctx.lineWidth=1;
          ctx.beginPath();
          ctx.arc(center.x,center.y,22+progress*Math.min(w,h)*.35,0,TAU);
          ctx.stroke();
        }
        ctx.globalAlpha=1;
      }

      for(let i=1;i<this.nodes.length;i++){
        const node=this.nodes[i],active=this.activity(node,now);
        ctx.globalAlpha=.3+active*.5+(this.state==='listen' ? .12 : 0);
        ctx.strokeStyle=this.tint(1,active>0);
        ctx.lineWidth=active>0?1.5:1;
        ctx.beginPath();ctx.moveTo(center.x,center.y);ctx.lineTo(node.x,node.y);ctx.stroke();
      }
      ctx.globalAlpha=1;
      ctx.textAlign='center';
      ctx.textBaseline='middle';

      this.nodes.forEach((node,index)=>{
        this.drawKnowledge(node,now);
        const active=this.activity(node,now);
        const reacting=index===0||active>0;
        const base=index===0?12:6;
        const swell=this.state==='listen'?pulse*1.6
          :this.state==='think'&&index===0?pulse*4
          :this.state==='speak'&&reacting?level*7:0;
        const radius=base+swell+active*2;
        const color=this.tint(1,index===0||active>0);
        ctx.shadowColor=color;
        ctx.shadowBlur=(this.state==='idle'?7:14)+active*14+(reacting?level*18:0);
        ctx.fillStyle=color;
        ctx.globalAlpha=this.state==='idle'&&!active ? .65 : 1;
        ctx.beginPath();ctx.arc(node.x,node.y,radius,0,TAU);ctx.fill();
        ctx.globalAlpha=1;
        ctx.shadowBlur=0;

        if(active>0||(this.keyboardFocus&&this.focused===index)){
          ctx.strokeStyle=this.state==='error'?this.colors.error:this.colors.accent;
          ctx.lineWidth=1.2;
          ctx.beginPath();ctx.arc(node.x,node.y,radius+5,0,TAU);ctx.stroke();
        }
        ctx.font=index===0?'600 12px "Yu Gothic UI", sans-serif':'11px "Yu Gothic UI", sans-serif';
        ctx.fillStyle=active>0||index===0?this.colors.text:this.colors.muted;
        ctx.fillText(node.label,node.x,node.y+radius+14);
        if(index===0){
          ctx.font='9px monospace';
          ctx.fillStyle=this.colors.muted;
          ctx.fillText('JARVIS',node.x,node.y-radius-12);
        }
      });
      this.drawTooltip();
    }

    tick(now) {
      this.frameId=null;
      if(this.destroyed||!this.visible||global.document.hidden)return;
      const dt=clamp((now-this.last)/1000,0,.032);
      this.last=now;
      this.time+=dt;
      for(const [id,until] of this.expires)if(until<=now)this.expires.delete(id);
      for(const [id,until] of this.growth)if(until<=now)this.growth.delete(id);
      this.readLevel(now,dt);
      this.step(dt,now);
      this.draw(now);
      this.frameId=global.requestAnimationFrame(this.frame);
    }

    point(event) {
      const rect=this.canvas.getBoundingClientRect();
      return {x:event.clientX-rect.left,y:event.clientY-rect.top};
    }

    hit(point) {
      let best=null,distance=Infinity;
      for(const node of this.nodes){
        const d=Math.hypot(node.x-point.x,node.y-point.y);
        if(d<22&&d<distance){best=node;distance=d;}
      }
      return best;
    }

    pointerDown(event) {
      if(event.button!==0||this.drag)return;
      const point=this.point(event),node=this.hit(point);
      if(!node)return;
      event.preventDefault();
      this.canvas.focus();
      this.keyboardFocus=false;
      this.tooltipNode=null;
      this.focused=this.nodes.indexOf(node);
      this.drag={node,id:event.pointerId,start:point,moved:false};
      this.canvas.setPointerCapture(event.pointerId);
      this.canvas.style.cursor='grabbing';
    }

    pointerMove(event) {
      const point=this.point(event);
      if(!this.drag){
        const node=this.hit(point);
        this.tooltipNode=node?.id==='chief'?null:node;
        this.canvas.style.cursor=node?'grab':'default';
        return;
      }
      if(this.drag.id!==event.pointerId)return;
      if(Math.hypot(point.x-this.drag.start.x,point.y-this.drag.start.y)>6)this.drag.moved=true;
      if(this.drag.moved){
        Object.assign(this.drag.node,{x:point.x,y:point.y,vx:0,vy:0});
        this.bound(this.drag.node);
      }
    }

    pointerUp(event) {
      if(!this.drag||this.drag.id!==event.pointerId)return;
      const point=this.point(event);
      const {node,moved,start}=this.drag;
      const click=!moved&&Math.hypot(point.x-start.x,point.y-start.y)<=6;
      this.releaseDrag();
      if(click&&node.id!=='chief')this.onSelect(node.id);
    }

    releaseDrag() {
      const drag=this.drag;
      this.drag=null;
      if(drag&&this.canvas.hasPointerCapture(drag.id)){
        this.canvas.releasePointerCapture(drag.id);
      }
      this.canvas.style.cursor='default';
    }

    keyDown(event) {
      const direction=['ArrowRight','ArrowDown'].includes(event.key)?1
        :['ArrowLeft','ArrowUp'].includes(event.key)?-1:0;
      if(direction){
        event.preventDefault();
        this.focused=1+(this.focused-1+direction+9)%9;
        this.keyboardFocus=true;
        this.tooltipNode=this.nodes[this.focused];
        this.canvas.setAttribute('aria-label',
          `${this.nodes[this.focused].label}を選択中。Enterで相談内容を入力します。`);
      }else if(event.key==='Enter'||event.key===' '){
        event.preventDefault();
        if(this.focused>0)this.onSelect(this.nodes[this.focused].id);
      }
    }

    destroy() {
      if(this.destroyed)return;
      this.destroyed=true;
      this.reset();
      if(this.frameId!==null)global.cancelAnimationFrame(this.frameId);
      this.frameId=null;
      this.observer?.disconnect();
      if(!this.observer)global.removeEventListener('resize',this.resizeHandler);
      this.media?.removeEventListener?.('change',this.motionChange);
      global.document.removeEventListener('visibilitychange',this.visibilityHandler);
      global.removeEventListener('pagehide',this.pageHideHandler);
      global.removeEventListener('pageshow',this.pageShowHandler);
      for(const [name,handler] of Object.entries(this.handlers)){
        this.canvas.removeEventListener(name,handler);
      }
      this.knowledge.clear();
    }
  }

  global.StaffGraph=StaffGraph;
  if(typeof module!=='undefined'&&module.exports)module.exports=StaffGraph;
})(typeof window!=='undefined'?window:globalThis);
