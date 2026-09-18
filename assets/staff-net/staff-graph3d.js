// ns-factory LP 用の複写（元: CBI/jarvis/static/staff-graph3d.js 2026-09-18）。
// 変更点は portraitBase の1か所だけ。
(function (global) {
  'use strict';

  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const TAU=Math.PI*2;
  // 二重の%は 0.4 を 0.3999…にする浮動小数点誤差を生み、パルスの先頭判定を
  // 外すことがある（2026-09-18 実測）。負のときだけ足し戻す形にする。
  const mod=(value,period)=>{const m=value%period;return m<0?m+period:m;};

  const PULSE_PROFILES=Object.freeze({
    idle:Object.freeze({speed:.38,period:2.4,count:1}),
    listen:Object.freeze({speed:.75,period:1.35,count:2}),
    think:Object.freeze({speed:.5,period:1.8,count:1}),
    speak:Object.freeze({speed:1,period:1.35,count:2}),
    confirm:Object.freeze({speed:.45,period:1.8,count:1}),
    error:Object.freeze({speed:.22,period:2.4,count:1}),
    active:Object.freeze({speed:1.1,period:1.2,count:3})
  });

  function validCount(value) {
    return Number.isSafeInteger(value)&&value>=0;
  }

  function validateSnapshot(data,staff) {
    if(data?.available===false)return {available:false};
    if(data?.available!==true||!data.staff||typeof data.staff!=='object')return null;
    const clean={available:true,staff:{}};
    let total=0;
    for(const item of staff){
      const value=data.staff[item.id];
      if(!value||!validCount(value.count)||!Array.isArray(value.recent)
        ||value.recent.some(name=>typeof name!=='string'))return null;
      total+=value.count;
      if(!Number.isSafeInteger(total))return null;
      clean.staff[item.id]={
        count:value.count,
        recent:value.recent.slice(0,10).map(name=>
          name.replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,256))
      };
    }
    return clean;
  }

  function planCounts(before,after) {
    if(before.length!==9||after.length!==9
      ||!before.every(validCount)||!after.every(validCount)){
      throw new TypeError('Invalid particle counts');
    }
    let total=0,oldOffset=0;
    const departments=[];
    for(let i=0;i<9;i++){
      const oldCount=before[i],count=after[i];
      const keep=Math.min(oldCount,count);
      departments.push({
        before:oldCount,after:count,keep,
        add:count-keep,remove:oldCount-keep,
        offset:total,oldOffset
      });
      total+=count;
      oldOffset+=oldCount;
      if(!Number.isSafeInteger(total)||!Number.isSafeInteger(oldOffset)){
        throw new RangeError('Invalid total');
      }
    }
    return {total,departments};
  }

  function fraction(value) {
    return value-Math.floor(value);
  }

  function buildParticles(plan,previous,now,animate) {
    const positions=new Float32Array(plan.total*3);
    const departments=new Float32Array(plan.total);
    const births=new Float32Array(plan.total);
    births.fill(-1);
    for(let department=0;department<9;department++){
      const change=plan.departments[department];
      for(let index=0;index<change.after;index++){
        const destination=change.offset+index;
        const z=fraction((index+1)*.754877666+department*.137)*2-1;
        const angle=index*2.39996323+department*.73;
        // 写真ノード（半径約0.38〜0.55）の外側に雲を作る。0.35始まりだと
        // 肖像の裏に隠れて「知識の粒が消えた」ように見える（2026-09-18 実測）。
        const radius=.62+.85*Math.cbrt(fraction((index+1)*.569840291));
        const radial=Math.sqrt(Math.max(0,1-z*z))*radius;
        positions[destination*3]=Math.cos(angle)*radial;
        positions[destination*3+1]=z*radius;
        positions[destination*3+2]=Math.sin(angle)*radial;
        departments[destination]=department;
        if(previous&&index<change.keep){
          births[destination]=previous.births[change.oldOffset+index];
        }else if(animate){
          births[destination]=now+(index-change.keep)/Math.max(1,change.add)*.4;
        }
      }
    }
    return {positions,departments,births};
  }

  function signalLayout(samples=192) {
    if(!Number.isSafeInteger(samples)||samples<2||samples>4096){
      throw new RangeError('Invalid signal sample count');
    }
    const count=9*(samples+1);
    const positions=new Float32Array(count*3);
    const departments=new Float32Array(count);
    const parameters=new Float32Array(count);
    for(let line=0;line<9;line++){
      for(let step=0;step<=samples;step++){
        const index=line*(samples+1)+step;
        departments[index]=line;
        parameters[index]=step/samples;
      }
    }
    return {positions,departments,parameters};
  }

  function signalPosition(start,end,line,t) {
    const progress=clamp(t,0,1);
    const bend=Math.sin(Math.PI*progress);
    return {
      x:start.x+(end.x-start.x)*progress,
      y:start.y+(end.y-start.y)*progress+bend*.18,
      z:start.z+(end.z-start.z)*progress+bend*.12*Math.cos(line*.7)
    };
  }

  function pulseProfile(state,active=false) {
    return active&&state!=='error'
      ? PULSE_PROFILES.active
      : PULSE_PROFILES[state]||PULSE_PROFILES.idle;
  }

  // CPU reference for the matching shader calculation; used by unit tests.
  function pulseStrength(t,phase,period,count,reduced=false,growthAge=-1) {
    if(reduced)return 0;
    let strength=0;
    for(let slot=0;slot<count;slot++){
      const head=mod(phase+slot*period/count,period);
      const distance=head-t;
      if(distance>=0&&distance<=.16){
        strength+=Math.exp(-distance*32);
      }
    }
    if(growthAge>=0&&growthAge<=1.3){
      const distance=growthAge*.95-t;
      if(distance>=0&&distance<=.22){
        strength+=3.5*Math.exp(-distance*24);
      }
    }
    return strength;
  }

  function portraitMode(status,destroyed=false) {
    if(destroyed)return 'none';
    return status==='ready'?'portrait':'sphere';
  }

  const vertexShader=`
    attribute float aDepartment;
    attribute float aBirth;
    uniform vec3 uCenters[9];
    uniform vec3 uColors[9];
    uniform float uEnergy[9];
    uniform vec3 uChief;
    uniform float uTime;
    uniform float uMotion;
    uniform float uDpr;
    uniform float uViewScale;
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      vec3 center=vec3(0.0);
      vec3 color=vec3(0.0);
      float energy=0.0;
      for(int i=0;i<9;i++){
        if(abs(aDepartment-float(i))<0.5){
          center=uCenters[i];
          color=uColors[i];
          energy=uEnergy[i];
        }
      }
      float progress=1.0;
      if(aBirth>=0.0&&uMotion>0.5){
        progress=smoothstep(0.0,1.2,max(0.0,uTime-aBirth));
      }
      vec3 target=center+position;
      target+=uMotion*0.025*sin(position*5.0+uTime*0.6);
      vec3 point=mix(uChief,target,progress);
      point.y+=uMotion*sin(progress*3.14159265)*0.5;
      vec4 viewPosition=modelViewMatrix*vec4(point,1.0);
      gl_Position=projectionMatrix*viewPosition;
      // 粒はノードと同じく「距離」と「画面の高さ」に比例して拡大縮小する（2026-09-18 事業主指示）。
      // 高さ900pxの画面で従来の1.5倍。寄りすぎで視界が埋まらないよう上限だけ残す。
      gl_PointSize=clamp((2.8+energy)*uDpr*uViewScale*13.5/max(0.2,-viewPosition.z),2.1,32.0*uDpr);
      // 知識の粒は青白ベース（2026-09-18 事業主指示）。発光時だけ幕僚色が少し乗る。
      vColor=mix(vec3(0.74,0.88,1.0),color,clamp(energy*0.35,0.0,0.45));
      vAlpha=clamp(0.55+energy*0.35,0.0,1.0);
    }
  `;

  const fragmentShader=`
    precision mediump float;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      float radius=length(gl_PointCoord-vec2(0.5));
      if(radius>0.5)discard;
      float edge=1.0-smoothstep(0.18,0.5,radius);
      gl_FragColor=vec4(vColor,vAlpha*edge);
    }
  `;

  // Dense, overlapping points form both the faint curved connection and its
  // moving pulse. Width is independent of platform-specific GL line widths.
  const signalVertexShader=`
    attribute float aDepartment;
    attribute float aT;
    uniform vec3 uCenters[9];
    uniform vec3 uColors[9];
    uniform float uEnergy[9];
    uniform vec3 uChief;
    uniform float uMotion;
    uniform float uDpr;
    uniform float uPhase[9];
    uniform float uPeriod[9];
    uniform float uCount[9];
    uniform float uActive[9];
    uniform float uGrowthBirth[9];
    uniform float uSignalTime;
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      vec3 center=vec3(0.0);
      vec3 color=vec3(0.0);
      float energy=0.0;
      float phase=0.0;
      float period=2.4;
      float count=1.0;
      float lineActive=0.0;
      float birth=-100.0;
      for(int i=0;i<9;i++){
        if(abs(aDepartment-float(i))<0.5){
          center=uCenters[i];
          color=uColors[i];
          energy=uEnergy[i];
          phase=uPhase[i];
          period=uPeriod[i];
          count=uCount[i];
          lineActive=uActive[i];
          birth=uGrowthBirth[i];
        }
      }
      vec3 point=mix(uChief,center,aT);
      float bend=sin(aT*3.14159265);
      point.y+=bend*0.18;
      point.z+=bend*0.12*cos(aDepartment*0.7);

      float strength=0.0;
      if(uMotion>0.5){
        for(int slot=0;slot<3;slot++){
          if(float(slot)<count){
            float head=mod(phase+float(slot)*period/count,period);
            float distance=head-aT;
            if(distance>=0.0&&distance<=0.16){
              strength+=exp(-distance*32.0);
            }
          }
        }
        float age=uSignalTime-birth;
        if(age>=0.0&&age<=1.3){
          float distance=age*0.95-aT;
          if(distance>=0.0&&distance<=0.22){
            strength+=3.5*exp(-distance*24.0);
          }
        }
      }

      gl_Position=projectionMatrix*modelViewMatrix*vec4(point,1.0);
      gl_PointSize=clamp((2.6+lineActive*5.0+strength*3.0)*uDpr,1.0,18.0);
      // 首席幕僚からの信号は青白基調（部署色は2割だけ差す・2026-09-18 事業主指示）
      vColor=mix(vec3(0.74,0.88,1.0),color,0.2);
      vAlpha=clamp(0.16+energy*0.10+lineActive*0.5+strength*0.8,0.0,1.0);
    }
  `;

  class StaffGraph3D extends global.StaffGraph {
    static particleCount(count) {
      if(!validCount(count))throw new TypeError('Invalid particle count');
      return count;
    }
    static validateSnapshot(data,staff) {return validateSnapshot(data,staff);}
    static planCounts(before,after) {return planCounts(before,after);}
    static buildParticles(plan,previous,now,animate) {
      return buildParticles(plan,previous,now,animate);
    }
    static signalLayout(samples) {return signalLayout(samples);}
    static signalPosition(start,end,line,t) {return signalPosition(start,end,line,t);}
    static pulseProfile(state,active) {return pulseProfile(state,active);}
    static pulseStrength(t,phase,period,count,reduced,growthAge) {
      return pulseStrength(t,phase,period,count,reduced,growthAge);
    }
    static portraitMode(status,destroyed) {return portraitMode(status,destroyed);}

    constructor(canvas,options={}) {
      const T=global.THREE;
      if(!T||!options.webglCanvas)throw new Error('WebGL unavailable');

      const renderer=new T.WebGLRenderer({
        canvas:options.webglCanvas,
        antialias:true,alpha:false,powerPreference:'default'
      });
      try{
        if(renderer.getContext().isContextLost())throw new Error('WebGL unavailable');
      }catch(error){
        renderer.dispose();
        renderer.forceContextLoss();
        throw error;
      }

      super(canvas,options);
      // LP版（ns-factory）: 顔写真の置き場所を差し替えられるようにする
      this.portraitBase=options.portraitBase||'/static/assets/staff/';
      this.renderer=renderer;
      this.webglCanvas=options.webglCanvas;
      this.dimension='3d';
      this.resources=new Set();
      this.counts=Array(9).fill(0);
      this.buffers=null;
      this.wasReduced=this.reduced;
      this.yaw=-.3;
      this.pitch=.12;
      this.distance=11.5;
      this.hits=[];
      this.pickTargets=[];

      try{
        this.scene=new T.Scene();
        this.world=new T.Group();
        this.scene.add(this.world);
        this.camera=new T.PerspectiveCamera(50,1,.1,100);
        this.camera.position.set(0,0,this.distance);
        this.camera.lookAt(0,0,0);
        this.renderer.setClearColor(this.colors.background,1);
        this.renderer.setPixelRatio(Math.min(global.devicePixelRatio||1,1.5));

        this.blue=new T.Color().setHSL(190/360,.9,.7);
        this.blueWhite=new T.Color(.74,.88,1);
        this.purple=new T.Color().setHSL(275/360,.9,.7);
        this.red=new T.Color(this.colors.error);
        // 接続（idle解除）からの「目覚め」演出の起点（2026-09-18 事業主指示）
        this.awakeAt=-Infinity;
        this.wasIdle=true;
        this.raycaster=new T.Raycaster();
        this.pointer=new T.Vector2();

        this.preparePortraits();

        const sphere=this.own(new T.SphereGeometry(1,20,14));
        for(let index=0;index<this.nodes.length;index++){
          const node=this.nodes[index];
          node.mesh=new T.Mesh(
            sphere,this.own(new T.MeshBasicMaterial({color:this.purple}))
          );
          node.mesh.userData.staffNode=node;
          node.baseRadius=index===0?.55:.38;
          node.mesh.scale.setScalar(node.baseRadius);
          node.anchor=new T.Vector3();
          if(index){
            const y=1-2*((index-1)+.5)/9;
            const radial=Math.sqrt(1-y*y);
            const angle=(index-1)*2.39996323;
            node.anchor.set(Math.cos(angle)*radial*3.2,y*2.8,Math.sin(angle)*radial*3.2);
            this.pickTargets.push(node.mesh);
          }
          node.mesh.position.copy(node.anchor);
          node.projected=new T.Vector3();
          node.onScreen=false;
          node.labelText=node.label;
          node.countText='';
          node.tooltipLines=[];
          node.photo=null;
          node.rim=null;
          node.photoStatus='loading';
          this.world.add(node.mesh);

          node.haloMaterial=this.own(new T.MeshBasicMaterial({
            color:this.blue,transparent:true,opacity:.12,
            depthWrite:false,side:T.BackSide
          }));
          node.halo=new T.Mesh(sphere,node.haloMaterial);
          this.world.add(node.halo);

          if(this.rimTexture){
            node.rim=new T.Sprite(this.own(new T.SpriteMaterial({
              map:this.rimTexture,color:this.blue,
              transparent:true,depthWrite:false,
              blending:T.AdditiveBlending
            })));
            this.world.add(node.rim);
          }
          this.loadPortrait(node);
        }

        this.rings=[];
        const ringGeometry=this.own(new T.RingGeometry(.96,1,64));
        for(let i=0;i<3;i++){
          const material=this.own(new T.MeshBasicMaterial({
            color:this.blue,transparent:true,opacity:0,
            side:T.DoubleSide,depthWrite:false
          }));
          const ring=new T.Mesh(ringGeometry,material);
          ring.rotation.x=i*Math.PI/3;
          ring.rotation.y=.3+i*.5;
          this.world.add(ring);
          this.rings.push(ring);
        }

        const centers=[],colors=[];
        for(let i=1;i<this.nodes.length;i++){
          centers.push(this.nodes[i].mesh.position);
          colors.push(new T.Color());
        }
        this.uniforms={
          uCenters:{value:centers},
          uColors:{value:colors},
          uEnergy:{value:new Float32Array(9)},
          uChief:{value:this.nodes[0].mesh.position},
          uTime:{value:0},
          uMotion:{value:this.reduced?0:1},
          uDpr:{value:Math.min(global.devicePixelRatio||1,1.5)},
          uViewScale:{value:1}
        };
        this.pointMaterial=this.own(new T.ShaderMaterial({
          uniforms:this.uniforms,vertexShader,fragmentShader,
          transparent:true,depthWrite:false
        }));
        this.buffers=buildParticles(planCounts(this.counts,this.counts),null,0,false);
        this.points=new T.Points(this.makeGeometry(this.buffers),this.pointMaterial);
        this.points.frustumCulled=false;
        this.world.add(this.points);
        this.createSignals();

        this.wheelHandler=event=>this.wheel(event);
        this.canvas.addEventListener('wheel',this.wheelHandler,{passive:false});
        this.resize();
        this.updateLabels();
        this.updateScene(global.performance.now(),0);
        this.renderer.render(this.scene,this.camera);
      }catch(error){
        this.destroy();
        throw error;
      }
    }

    own(resource) {
      this.resources.add(resource);
      return resource;
    }

    release(resource) {
      if(resource&&this.resources.delete(resource))resource.dispose();
    }

    preparePortraits() {
      const T=global.THREE;
      this.portraitLoader=null;
      this.rimTexture=null;
      if(!T.TextureLoader||!T.CanvasTexture||!T.Sprite||!T.SpriteMaterial
        ||!global.document.createElement)return;
      try{
        const canvas=global.document.createElement('canvas');
        canvas.width=canvas.height=256;
        const ctx=canvas.getContext('2d');
        if(!ctx)return;
        ctx.clearRect(0,0,256,256);
        ctx.strokeStyle='#ffffff';
        ctx.shadowColor='#ffffff';
        ctx.shadowBlur=30;
        ctx.lineWidth=5;
        ctx.beginPath();
        ctx.arc(128,128,100,0,TAU);
        ctx.stroke();
        ctx.stroke();
        this.rimTexture=this.own(new T.CanvasTexture(canvas));
        this.portraitLoader=new T.TextureLoader();
      }catch{
        // Texture support is optional; retain the sphere representation.
      }
    }

    syncPortrait(node) {
      const mode=portraitMode(node.photoStatus,this.destroyed);
      // r128 raycasting still intersects these explicit sphere targets when
      // visible=false. Photos and knowledge particles are never pick targets.
      node.mesh.visible=mode==='sphere';
      if(node.photo)node.photo.visible=mode==='portrait';
      if(node.rim)node.rim.visible=mode!=='none';
    }

    loadPortrait(node) {
      if(!this.portraitLoader){
        node.photoStatus='failed';
        this.syncPortrait(node);
        return;
      }
      const T=global.THREE;
      let source=null,settled=false;
      const finish=()=>{
        settled=true;
        if(source)this.release(source);
      };
      try{
        source=this.portraitLoader.load(
          `${this.portraitBase}${node.id}.jpg`,
          texture=>{
            try{
              if(this.destroyed)return;
              const canvas=global.document.createElement('canvas');
              canvas.width=canvas.height=512;
              const ctx=canvas.getContext('2d');
              if(!ctx)throw new Error('Canvas unavailable');
              ctx.clearRect(0,0,512,512);
              ctx.save();
              ctx.beginPath();
              ctx.arc(256,256,250,0,TAU);
              ctx.clip();
              ctx.drawImage(texture.image,0,0,512,512);
              ctx.restore();
              // 縁をぼかす（2026-09-18 事業主指示）。外周42pxを透明へフェード。
              const fade=ctx.createRadialGradient(256,256,208,256,256,252);
              fade.addColorStop(0,'rgba(0,0,0,0)');
              fade.addColorStop(1,'rgba(0,0,0,1)');
              ctx.globalCompositeOperation='destination-out';
              ctx.fillStyle=fade;
              ctx.beginPath();ctx.arc(256,256,256,0,TAU);ctx.fill();
              ctx.globalCompositeOperation='source-over';

              const map=this.own(new T.CanvasTexture(canvas));
              const material=this.own(new T.SpriteMaterial({
                map,transparent:true,alphaTest:.02,depthWrite:true
              }));
              node.photo=new T.Sprite(material);
              node.photo.position.copy(node.mesh.position);
              node.photo.scale.setScalar(node.mesh.scale.x*2);
              this.world.add(node.photo);
              node.photoStatus='ready';
              this.syncPortrait(node);
            }catch{
              if(!this.destroyed){
                node.photoStatus='failed';
                this.syncPortrait(node);
              }
            }finally{
              finish();
            }
          },
          undefined,
          ()=>{
            if(!this.destroyed){
              node.photoStatus='failed';
              this.syncPortrait(node);
            }
            finish();
          }
        );
        // Also handle a synchronous loader supplied by a test harness.
        if(settled)source?.dispose();
        else this.own(source);
      }catch{
        finish();
        if(!this.destroyed){
          node.photoStatus='failed';
          this.syncPortrait(node);
        }
      }
    }

    createSignals() {
      const T=global.THREE;
      const layout=signalLayout();
      const geometry=this.own(new T.BufferGeometry());
      geometry.setAttribute('position',new T.BufferAttribute(layout.positions,3));
      geometry.setAttribute('aDepartment',new T.BufferAttribute(layout.departments,1));
      geometry.setAttribute('aT',new T.BufferAttribute(layout.parameters,1));
      geometry.setDrawRange(0,layout.parameters.length);

      this.signalUniforms={
        uCenters:this.uniforms.uCenters,
        uColors:this.uniforms.uColors,
        uEnergy:this.uniforms.uEnergy,
        uChief:this.uniforms.uChief,
        uMotion:this.uniforms.uMotion,
        uDpr:this.uniforms.uDpr,
        uPhase:{value:new Float32Array(9)},
        uPeriod:{value:new Float32Array(9)},
        uCount:{value:new Float32Array(9)},
        uActive:{value:new Float32Array(9)},
        uGrowthBirth:{value:new Float32Array(9)},
        uSignalTime:{value:0}
      };
      this.signalUniforms.uGrowthBirth.value.fill(-100);
      for(let i=0;i<9;i++){
        this.signalUniforms.uPhase.value[i]=i*.27;
        this.signalUniforms.uPeriod.value[i]=PULSE_PROFILES.idle.period;
        this.signalUniforms.uCount.value[i]=1;
      }
      const material=this.own(new T.ShaderMaterial({
        uniforms:this.signalUniforms,
        vertexShader:signalVertexShader,
        fragmentShader,
        transparent:true,depthWrite:false,
        blending:T.AdditiveBlending
      }));
      this.signalPoints=new T.Points(geometry,material);
      this.signalPoints.frustumCulled=false;
      this.signals=new T.Group();
      this.signals.add(this.signalPoints);
      this.world.add(this.signals);
    }

    makeGeometry(buffers) {
      const T=global.THREE;
      const geometry=new T.BufferGeometry();
      try{
        geometry.setAttribute('position',new T.BufferAttribute(buffers.positions,3));
        geometry.setAttribute('aDepartment',new T.BufferAttribute(buffers.departments,1));
        geometry.setAttribute('aBirth',new T.BufferAttribute(buffers.births,1));
        geometry.setDrawRange(0,buffers.births.length);
        return this.own(geometry);
      }catch(error){
        geometry.dispose();
        throw error;
      }
    }

    applyVaultSnapshot(data) {
      const clean=validateSnapshot(data,this.core.STAFF);
      if(!clean)return false;
      const wasAvailable=this.vaultAvailable;
      const next=this.core.STAFF.map(staff=>
        clean.available?clean.staff[staff.id].count:0);
      const plan=planCounts(this.counts,next);
      const changed=next.some((count,index)=>count!==this.counts[index]);
      let buffers=null,geometry=null;
      if(changed){
        buffers=buildParticles(
          plan,this.buffers,global.performance.now()/1000,
          wasAvailable&&!this.reduced
        );
        geometry=this.makeGeometry(buffers);
      }
      super.applyVaultSnapshot(clean);
      if(changed){
        const old=this.points.geometry;
        this.points.geometry=geometry;
        this.buffers=buffers;
        this.counts=next;
        this.release(old);
      }
      if(this.signalUniforms){
        const births=this.signalUniforms.uGrowthBirth.value;
        if(!clean.available){
          births.fill(-100);
        }else if(wasAvailable&&!this.reduced){
          for(let i=0;i<9;i++){
            if(plan.departments[i].add>0)births[i]=this.time;
          }
        }
      }
      this.updateLabels();
      return true;
    }

    finishFlights() {
      if(!this.buffers||!this.points)return;
      this.buffers.births.fill(-1);
      this.points.geometry.getAttribute('aBirth').needsUpdate=true;
    }

    reset() {
      super.reset();
      this.finishFlights();
      if(this.rings)for(const ring of this.rings)ring.visible=false;
      if(this.signalUniforms){
        this.signalUniforms.uGrowthBirth.value.fill(-100);
        this.signalUniforms.uActive.value.fill(0);
        for(let i=0;i<9;i++)this.signalUniforms.uPhase.value[i]=i*.27;
      }
    }

    resize() {
      if(!this.renderer)return super.resize();
      const rect=this.canvas.getBoundingClientRect();
      if(!rect.width||!rect.height)return;
      this.width=rect.width;
      this.height=rect.height;
      const dpr=Math.min(global.devicePixelRatio||1,1.5);
      this.canvas.width=Math.round(this.width*dpr);
      this.canvas.height=Math.round(this.height*dpr);
      this.ctx.setTransform(dpr,0,0,dpr,0,0);
      this.renderer.setPixelRatio(dpr);
      this.renderer.setSize(this.width,this.height,false);
      this.camera.aspect=this.width/this.height;
      this.camera.updateProjectionMatrix();
      if(this.uniforms){
        this.uniforms.uDpr.value=dpr;
        this.uniforms.uViewScale.value=this.height/900; // 粒を画面の高さに比例させる基準
      }
      this.updateLabels();
    }

    setVisible(visible) {
      super.setVisible(visible);
      if(this.webglCanvas)this.webglCanvas.hidden=!visible;
    }

    updateLabels() {
      if(!this.renderer)return;
      this.ctx.font='11px "Yu Gothic UI", sans-serif';
      const width=Math.max(20,Math.min(250,this.width-16)-20);
      for(const node of this.nodes){
        const item=this.knowledge.get(node.id);
        node.labelText=node.label;
        node.countText=item?String(item.count):'';
        const lines=item
          ? [`${node.label} · ${item.count}件`,
             ...(item.recent.length?item.recent.slice(0,3):['ノートはありません'])]
          : [node.label];
        node.tooltipLines=lines.map(line=>this.fitText(line,width));
      }
    }

    updateScene(now,dt) {
      if(this.reduced&&!this.wasReduced){
        this.finishFlights();
        this.signalUniforms.uGrowthBirth.value.fill(-100);
      }
      this.wasReduced=this.reduced;
      if(!this.reduced&&!this.drag)this.yaw+=dt*(this.state==='idle'?.055:.02);
      this.world.rotation.set(this.pitch,this.yaw,0);
      this.camera.position.z=this.distance/Math.min(1,this.camera.aspect);
      this.camera.updateMatrixWorld();

      const time=this.time;
      const reduced=this.reduced;
      const pulse=reduced?0:(1+Math.sin(time*(this.state==='think'?5:2)))/2;
      // 接続時の全画面フラッシュ廃止: idle解除から約2秒かけて明るさを滑らかに上げ、
      // 各写真の〇を青白いハロー・リムで「命が吹き込まれた」ように目覚めさせる
      // （2026-09-18 事業主指示）。
      const idleNow=this.state==='idle';
      if(this.wasIdle&&!idleNow)this.awakeAt=now;
      this.wasIdle=idleNow;
      const wakeT=clamp((now-this.awakeAt)/2000,0,1);
      const wake=wakeT*wakeT*(3-2*wakeT);
      const awakening=idleNow||reduced?0:1-wake;
      // 紫は廃止し青白系に統一（2026-09-18 事業主指摘「ださくなった」対応）。
      // 状態の違いは明るさ（idle=.55）と目覚め演出で表す。
      const baseColor=this.state==='error'?this.red:this.blue;
      const signals=this.signalUniforms;

      for(let index=0;index<this.nodes.length;index++){
        const node=this.nodes[index];
        const until=this.expires.get(node.id)||0;
        if(until&&until<=now)this.expires.delete(node.id);
        const active=clamp((until-now)/1200,0,1);
        const growthUntil=this.growth.get(node.id)||0;
        if(growthUntil&&growthUntil<=now)this.growth.delete(node.id);
        const growth=clamp((growthUntil-now)/2000,0,1);
        const related=index===0||active>0;
        const speech=this.state==='speak'&&related?this.level:0;
        const amplitude=reduced?0:(index===0?.015:.045)+active*.06+speech*.08;

        node.mesh.position.set(
          node.anchor.x+Math.sin(time*.55+node.phase)*amplitude,
          node.anchor.y+Math.cos(time*.45+node.phase)*amplitude,
          node.anchor.z+Math.sin(time*.4+node.phase*.7)*amplitude
        );

        let scale=1;
        if(!reduced){
          if(this.state==='listen')scale+=pulse*.16;
          if(this.state==='think'&&index===0)scale+=pulse*.48;
          scale+=speech*.5+active*.12;
        }
        const radius=node.baseRadius*scale;
        node.mesh.scale.setScalar(radius);
        const brightness=this.state==='idle'?.55:.55+.45*wake;
        node.mesh.material.color.copy(baseColor);
        if(this.state!=='error'&&active>0)node.mesh.material.color.lerp(this.blue,active);
        // 会話中の関連幕僚は強く光らせる（2026-09-18 事業主指示・.3→.9）
        node.mesh.material.color.multiplyScalar(brightness+active*.9+speech*.45+growth*.4);
        // 目覚め中は青白へ寄せる（ハロー・リムは同色を写すのでふわっとにじむ）
        if(awakening>0)node.mesh.material.color.lerp(this.blueWhite,awakening*.6);

        node.halo.position.copy(node.mesh.position);
        node.halo.scale.setScalar(radius*1.3);
        node.haloMaterial.color.copy(node.mesh.material.color);
        node.haloMaterial.opacity=.04+active*.22+speech*.1+growth*.12+awakening*.3;

        if(node.photo){
          node.photo.position.copy(node.mesh.position);
          node.photo.scale.setScalar(radius*2);
        }
        if(node.rim){
          node.rim.position.copy(node.mesh.position);
          node.rim.scale.setScalar(radius*2.4);
          node.rim.material.color.copy(node.mesh.material.color);
          node.rim.material.opacity=clamp(.55+active*.45+speech*.2+growth*.3+awakening*.35,0,1);
        }

        if(index){
          const department=index-1;
          this.uniforms.uColors.value[department].copy(node.mesh.material.color);
          this.uniforms.uEnergy.value[department]=
            (this.state==='idle'?.1:.5)+active*.6+speech*.6+growth*.8;
          const profile=pulseProfile(this.state,active>0);
          signals.uPeriod.value[department]=profile.period;
          signals.uCount.value[department]=profile.count;
          signals.uActive.value[department]=active;
          if(!reduced){
            signals.uPhase.value[department]=mod(
              signals.uPhase.value[department]+dt*profile.speed,profile.period
            );
          }
        }
      }

      for(let index=0;index<this.rings.length;index++){
        const ring=this.rings[index];
        ring.visible=this.state==='think'&&!reduced;
        if(ring.visible){
          const progress=(time*.4+index/3)%1;
          ring.position.copy(this.nodes[0].mesh.position);
          ring.scale.setScalar(.65+progress*2);
          ring.material.opacity=(1-progress)*.35;
        }
      }
      signals.uSignalTime.value=time;
      this.uniforms.uTime.value=now/1000;
      this.uniforms.uMotion.value=reduced?0:1;
      this.scene.updateMatrixWorld(true);
    }

    drawOverlay() {
      const ctx=this.ctx;
      ctx.clearRect(0,0,this.width,this.height);
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.font='11px "Yu Gothic UI", sans-serif';
      for(let index=0;index<this.nodes.length;index++){
        const node=this.nodes[index];
        node.projected.copy(node.mesh.position).applyMatrix4(this.world.matrixWorld);
        const depth=Math.max(1,this.camera.position.z-node.projected.z);
        const radius=node.mesh.scale.x*this.height/(2*Math.tan(25*Math.PI/180)*depth);
        node.projected.project(this.camera);
        node.x=(node.projected.x*.5+.5)*this.width;
        node.y=(-node.projected.y*.5+.5)*this.height;
        node.onScreen=node.projected.z>=-1&&node.projected.z<=1
          &&node.x>=0&&node.x<=this.width&&node.y>=0&&node.y<=this.height;
        if(!node.onScreen)continue;

        const active=this.expires.has(node.id);
        const focused=this.keyboardFocus&&this.focused===index;
        const showLabel=index===0||active||focused||this.tooltipNode===node;
        if(showLabel){
          ctx.fillStyle=index===0||active?this.colors.text:this.colors.muted;
          ctx.fillText(node.labelText,node.x,node.y+radius+12);
        }
        if(node.countText){
          ctx.textAlign='left';
          ctx.fillStyle=this.growth.has(node.id)?this.colors.accent:this.colors.muted;
          ctx.fillText(node.countText,node.x+radius+3,node.y-radius-3);
          ctx.textAlign='center';
        }
        if(focused){
          ctx.strokeStyle=this.colors.accent;
          ctx.beginPath();
          ctx.arc(node.x,node.y,radius+5,0,TAU);
          ctx.stroke();
        }
      }
      this.drawTooltip();
    }

    drawTooltip() {
      const node=this.tooltipNode;
      if(!node||!node.onScreen||this.drag||!node.tooltipLines?.length)return;
      const width=Math.min(250,this.width-16);
      if(width<40)return;
      const height=node.tooltipLines.length*19+16;
      const x=clamp(node.x+18,8,this.width-width-8);
      const y=clamp(node.y-height-24,8,this.height-height-8);
      const ctx=this.ctx;
      ctx.fillStyle=this.colors.background;
      ctx.strokeStyle=this.colors.border;
      ctx.fillRect(x,y,width,height);
      ctx.strokeRect(x,y,width,height);
      ctx.textAlign='left';
      for(let index=0;index<node.tooltipLines.length;index++){
        ctx.fillStyle=index===0?this.colors.accent:this.colors.text;
        ctx.fillText(node.tooltipLines[index],x+10,y+17+index*19);
      }
      ctx.textAlign='center';
    }

    tick(now) {
      this.frameId=null;
      if(this.destroyed||!this.visible||global.document.hidden||!this.renderer)return;
      const dt=clamp((now-this.last)/1000,0,.032);
      this.last=now;
      this.time+=dt;
      this.readLevel(now,dt);
      this.updateScene(now,dt);
      this.renderer.render(this.scene,this.camera);
      this.drawOverlay();
      this.frameId=global.requestAnimationFrame(this.frame);
    }

    pick(event) {
      const rect=this.canvas.getBoundingClientRect();
      if(!rect.width||!rect.height)return null;
      this.pointer.set(
        ((event.clientX-rect.left)/rect.width)*2-1,
        -((event.clientY-rect.top)/rect.height)*2+1
      );
      this.scene.updateMatrixWorld(true);
      this.camera.updateMatrixWorld();
      this.raycaster.setFromCamera(this.pointer,this.camera);
      this.hits.length=0;
      this.raycaster.intersectObjects(this.pickTargets,false,this.hits);
      return this.hits.length?this.hits[0].object.userData.staffNode:null;
    }

    pointerDown(event) {
      if(event.button!==0||this.drag)return;
      event.preventDefault();
      this.canvas.focus();
      this.keyboardFocus=false;
      this.tooltipNode=null;
      this.drag={
        id:event.pointerId,
        x:event.clientX,y:event.clientY,
        startX:event.clientX,startY:event.clientY,
        moved:false,node:this.pick(event)
      };
      this.canvas.setPointerCapture(event.pointerId);
      this.canvas.style.cursor='grabbing';
    }

    pointerMove(event) {
      if(!this.drag){
        this.tooltipNode=this.pick(event);
        this.canvas.style.cursor=this.tooltipNode?'pointer':'grab';
        return;
      }
      if(this.drag.id!==event.pointerId)return;
      const dx=event.clientX-this.drag.x,dy=event.clientY-this.drag.y;
      if(Math.hypot(event.clientX-this.drag.startX,event.clientY-this.drag.startY)>6){
        this.drag.moved=true;
      }
      if(this.drag.moved){
        this.yaw+=dx*.007;
        this.pitch=clamp(this.pitch+dy*.007,-1.2,1.2);
      }
      this.drag.x=event.clientX;
      this.drag.y=event.clientY;
    }

    pointerUp(event) {
      if(!this.drag||this.drag.id!==event.pointerId)return;
      const drag=this.drag;
      const click=!drag.moved
        &&Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)<=6;
      const node=click?this.pick(event):null;
      this.releaseDrag();
      if(node&&node===drag.node)this.onSelect(node.id);
    }

    wheel(event) {
      event.preventDefault();
      const unit=event.deltaMode===1?16:event.deltaMode===2?this.height:1;
      const change=clamp(event.deltaY*unit,-500,500);
      this.distance=clamp(this.distance*Math.exp(change*.001),7,20);
    }

    destroy() {
      if(this.destroyed)return;
      super.destroy();
      if(this.wheelHandler)this.canvas.removeEventListener('wheel',this.wheelHandler);
      if(this.resources){
        for(const resource of this.resources)resource.dispose();
        this.resources.clear();
      }
      this.renderer?.dispose();
      this.renderer?.forceContextLoss();
      this.renderer=null;
      this.scene?.clear();
      this.buffers=null;
      if(this.webglCanvas)this.webglCanvas.hidden=true;
    }
  }

  global.StaffGraph3D=StaffGraph3D;
})(typeof window!=='undefined'?window:globalThis);
