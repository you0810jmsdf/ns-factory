'use strict';
// Trace directed pixel boundaries. Clockwise outer contours and counterclockwise holes.
function traceContours(mask,w,h){
 const edges=new Map(),stride=w+1;
 function add(x,y,d){const k=y*stride+x;let list=edges.get(k);if(!list)edges.set(k,list=[]);list.push(d);}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(!mask[i])continue;if(y===0||!mask[i-w])add(x,y,0);if(x===w-1||!mask[i+1])add(x+1,y,1);if(y===h-1||!mask[i+w])add(x+1,y+1,2);if(x===0||!mask[i-1])add(x,y+1,3);}
 const loops=[],dx=[1,0,-1,0],dy=[0,1,0,-1];
 while(edges.size){const first=edges.keys().next().value;let k=first,prev=-1,points=[];
 do{const choices=edges.get(k);if(!choices)throw Error('輪郭が閉じていません');let d=prev<0?choices[0]:[(prev+1)%4,prev,(prev+3)%4,(prev+2)%4].find(n=>choices.includes(n));choices.splice(choices.indexOf(d),1);if(!choices.length)edges.delete(k);const x=k%stride,y=Math.floor(k/stride);if(d!==prev)points.push([x,y]);k=(y+dy[d])*stride+x+dx[d];prev=d;}while(k!==first);
 loops.push(points);
 }return loops;
}
function simplifyLine(points,epsilon){if(points.length<=2)return points;const keep=new Uint8Array(points.length);keep[0]=keep[points.length-1]=1;const stack=[[0,points.length-1]],eps=epsilon*epsilon;while(stack.length){const [a,b]=stack.pop(),p=points[a],q=points[b],vx=q[0]-p[0],vy=q[1]-p[1],length=vx*vx+vy*vy;let best=eps,index=-1;for(let i=a+1;i<b;i++){const t=length?Math.max(0,Math.min(1,((points[i][0]-p[0])*vx+(points[i][1]-p[1])*vy)/length)):0,ex=points[i][0]-p[0]-t*vx,ey=points[i][1]-p[1]-t*vy,d=ex*ex+ey*ey;if(d>best){best=d;index=i;}}if(index>=0){keep[index]=1;stack.push([a,index],[index,b]);}}return points.filter((_,i)=>keep[i]);}
function smoothContour(points,strength){if(!strength||points.length<5)return points;let far=1,best=0;for(let i=1;i<points.length;i++){const d=(points[i][0]-points[0][0])**2+(points[i][1]-points[0][1])**2;if(d>best){best=d;far=i;}}const eps=strength*.55;const a=simplifyLine(points.slice(0,far+1),eps),b=simplifyLine([...points.slice(far),points[0]],eps);const out=[...a.slice(0,-1),...b.slice(0,-1)];return out.length>=3?out:points;}
function contourPath(loops,strength=1){const f=n=>String(Math.round(n*1000)/1000),pt=p=>f(p[0])+' '+f(p[1]);return loops.map(raw=>{const p=smoothContour(raw,strength);if(!strength)return 'M'+p.map(pt).join('L')+'Z';const corners=p.map((v,i)=>{const prev=p[(i+p.length-1)%p.length],next=p[(i+1)%p.length],a=Math.hypot(prev[0]-v[0],prev[1]-v[1]),b=Math.hypot(next[0]-v[0],next[1]-v[1]),r=Math.min(strength*.8,a*.35,b*.35);return {v,in:[v[0]+(prev[0]-v[0])*r/a,v[1]+(prev[1]-v[1])*r/a],out:[v[0]+(next[0]-v[0])*r/b,v[1]+(next[1]-v[1])*r/b]};});let d='M'+pt(corners[0].out);for(let j=1;j<=corners.length;j++){const c=corners[j%corners.length];d+='L'+pt(c.in)+'Q'+pt(c.v)+' '+pt(c.out);}return d+'Z';}).join('');}
function svgDocument(width,height,body){return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;}
if(typeof module!=='undefined')module.exports={traceContours,contourPath,smoothContour,svgDocument};
