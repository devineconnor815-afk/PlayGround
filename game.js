(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = 960, H = 640;
  const keys = new Set(), touch = { up:false, down:false, left:false, right:false };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  let mode = 'title', last = 0, time = 0, shake = 0, flash = 0, attackId = 0;
  let player, slimes, boss, keyItem, particles, floating, attack, hurtTimer, spawnKey;
  const walls = [
    {x:142,y:198,w:46,h:48},{x:772,y:198,w:46,h:48},
    {x:142,y:463,w:46,h:48},{x:772,y:463,w:46,h:48},
    {x:276,y:278,w:36,h:35},{x:648,y:278,w:36,h:35}
  ];
  function freshGame(){
    player={x:480,y:523,face:{x:0,y:-1},hp:5,maxHp:5,speed:210,invuln:0};
    slimes=[{x:320,y:360,hp:1,phase:0,seed:1},{x:640,y:360,hp:1,phase:1,seed:2}];
    boss={x:480,y:162,hp:5,maxHp:5,state:'sleep',timer:0,flash:0,dir:{x:0,y:1},target:{x:480,y:500}};
    keyItem=null; particles=[]; floating=[]; attack=0; hurtTimer=0; spawnKey=false; shake=0; flash=0;
  }
  freshGame();
  function startGame(){ freshGame(); mode='play'; }
  function inputDown(e){
    const k=e.key.toLowerCase();
    if(['arrowup','arrowdown','arrowleft','arrowright',' ','w','a','s','d'].includes(k)) e.preventDefault();
    keys.add(k);
    if(k==='escape'){ if(mode==='play') mode='pause'; else if(mode==='pause') mode='play'; }
    if((k==='enter'||k===' ') && mode!=='play' && mode!=='pause') startGame();
    if((k==='r')&&(mode==='dead'||mode==='won')) startGame();
    if((k===' '||k==='j'||k==='z')&&mode==='play') doAttack();
  }
  function inputUp(e){keys.delete(e.key.toLowerCase());}
  window.addEventListener('keydown',inputDown); window.addEventListener('keyup',inputUp);
  canvas.addEventListener('pointerdown',()=>{ if(mode==='title'||mode==='dead'||mode==='won') startGame(); else if(mode==='pause') mode='play'; });
  document.querySelectorAll('.dpad button').forEach(button=>{
    const dir=button.dataset.dir;
    const down=e=>{e.preventDefault();touch[dir]=true;};
    const up=e=>{e.preventDefault();touch[dir]=false;};
    button.addEventListener('pointerdown',down); button.addEventListener('pointerup',up);
    button.addEventListener('pointerleave',up); button.addEventListener('pointercancel',up);
  });
  const attackButton=document.querySelector('.attack-button');
  attackButton.addEventListener('pointerdown',e=>{e.preventDefault();if(mode==='play')doAttack();});
  function doAttack(){ if(attack<=0){attack=.26; attackId++; burst(player.x+player.face.x*24,player.y+player.face.y*24,'#f3d37e',4,50);} }
  function burst(x,y,color,n=8,power=100){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=power*(.35+Math.random()*.75);particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.25+Math.random()*.35,max:.6,color,size:2+Math.random()*3});}}
  function textPop(x,y,text,color='#f2d07c'){floating.push({x,y,text,color,life:.8});}
  function movePlayer(dx,dy,dt){
    const len=Math.hypot(dx,dy)||1; dx=dx/len*player.speed*dt; dy=dy/len*player.speed*dt;
    if(Math.hypot(dx,dy)>.1){if(Math.abs(dx)>Math.abs(dy))player.face={x:Math.sign(dx),y:0};else player.face={x:0,y:Math.sign(dy)};}
    for(const axis of ['x','y']){
      player[axis]+=axis==='x'?dx:dy;
      player.x=clamp(player.x,82,878);player.y=clamp(player.y,91,577);
      for(const o of walls){if(player.x+10>o.x&&player.x-10<o.x+o.w&&player.y+10>o.y&&player.y-10<o.y+o.h){if(axis==='x')player.x-=dx;else player.y-=dy;}}
    }
  }
  function damagePlayer(){if(player.invuln>0||mode!=='play')return;player.hp--;player.invuln=1.05;shake=.22;flash=.2;burst(player.x,player.y,'#ff8368',11,130);if(player.hp<=0){mode='dead';textPop(player.x,player.y-20,'FALLEN','#ff9b83');}}
  function hitSlimes(){
    if(attack<.12)return;
    for(const s of slimes){if(s.hp<=0)continue;const vx=s.x-player.x,vy=s.y-player.y,forward=vx*player.face.x+vy*player.face.y,side=Math.abs(vx*player.face.y-vy*player.face.x);
      if(forward>0&&forward<67&&side<37&&s.lastHit!==attackId){s.lastHit=attackId;s.hp=0;burst(s.x,s.y,'#a9d894',12,140);textPop(s.x,s.y-19,'SLIME DOWN','#d3e2aa');}}
    slimes=slimes.filter(s=>s.hp>0);
    if(slimes.length===0&&!spawnKey){spawnKey=true;keyItem={x:480,y:355};textPop(480,328,'A KEY APPEARS','#f3d37e');burst(480,355,'#f3d37e',18,120);}
  }
  function updateBoss(dt){
    if(boss.state==='sleep')return;
    boss.flash=Math.max(0,boss.flash-dt);
    if(boss.state==='windup'){
      boss.timer-=dt;
      if(boss.timer<=0){boss.state='dash';boss.timer=.42;const dx=player.x-boss.x,dy=player.y-boss.y,l=Math.hypot(dx,dy)||1;boss.dir={x:dx/l,y:dy/l};boss.target={x:player.x,y:player.y};burst(boss.x,boss.y,'#ed7454',8,95);}
    }else if(boss.state==='dash'){
      boss.x+=boss.dir.x*440*dt;boss.y+=boss.dir.y*440*dt;boss.timer-=dt;
      boss.x=clamp(boss.x,115,845);boss.y=clamp(boss.y,117,550);
      if(dist(player,boss)<37)damagePlayer();
      if(boss.timer<=0){boss.state='recover';boss.timer=1.25;burst(boss.x,boss.y,'#f2b66a',12,90);}
    }else if(boss.state==='recover'){
      boss.timer-=dt;
      if(boss.timer<=0){boss.state='windup';boss.timer=.88;}
    }
    if(attack>.12&&boss.state==='recover'&&boss.hp>0){
      const vx=boss.x-player.x,vy=boss.y-player.y,forward=vx*player.face.x+vy*player.face.y,side=Math.abs(vx*player.face.y-vy*player.face.x);
      if(forward>0&&forward<91&&side<51&&boss.lastHit!==attackId){boss.lastHit=attackId;boss.hp--;boss.flash=.2;shake=.12;burst(boss.x,boss.y,'#ffe19a',13,165);textPop(boss.x,boss.y-48,'−1','#ffe19a');
        if(boss.hp<=0){boss.state='dead';burst(boss.x,boss.y,'#f2c877',36,220);textPop(boss.x,boss.y-60,'WARDEN DEFEATED','#f3d37e');}}
    }
  }
  function update(dt){
    time+=dt; if(mode!=='play')return;
    attack=Math.max(0,attack-dt);player.invuln=Math.max(0,player.invuln-dt);shake=Math.max(0,shake-dt);flash=Math.max(0,flash-dt);
    let dx=(keys.has('d')||keys.has('arrowright')||touch.right?1:0)-(keys.has('a')||keys.has('arrowleft')||touch.left?1:0);
    let dy=(keys.has('s')||keys.has('arrowdown')||touch.down?1:0)-(keys.has('w')||keys.has('arrowup')||touch.up?1:0);
    movePlayer(dx,dy,dt);
    if(boss.state==='sleep'){
      for(const s of slimes){s.phase+=dt;const d=dist(player,s);if(d<215){const vx=player.x-s.x,vy=player.y-s.y,l=Math.hypot(vx,vy)||1;s.x+=vx/l*42*dt;s.y+=vy/l*42*dt;}else s.x+=Math.sin(s.phase*1.7+s.seed)*7*dt;
        if(d<27)hurtTimer-=dt;else hurtTimer=Math.max(0,hurtTimer);
        if(d<27&&hurtTimer<=0){damagePlayer();hurtTimer=.65;}}
    }
    hitSlimes();
    if(keyItem){keyItem.y=355+Math.sin(time*3)*4;if(dist(player,keyItem)<28){keyItem=null;boss.state='windup';boss.timer=1.15;burst(480,250,'#f6d278',28,165);textPop(480,293,'THE SEAL IS BROKEN','#f3d37e');}}
    updateBoss(dt);
    if(boss.state==='dead'&&player.y<132&&Math.abs(player.x-480)<48){mode='won';burst(480,112,'#ffe19a',40,200);}
    for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(.06,dt);p.vy*=Math.pow(.06,dt);p.life-=dt;}
    particles=particles.filter(p=>p.life>0);
    for(const p of floating){p.y-=22*dt;p.life-=dt;}floating=floating.filter(p=>p.life>0);
  }
  function rr(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
  function drawRoom(){
    ctx.fillStyle='#111a18';ctx.fillRect(0,0,W,H);
    const grad=ctx.createRadialGradient(480,350,55,480,350,570);grad.addColorStop(0,'#2b3630');grad.addColorStop(.7,'#222d29');grad.addColorStop(1,'#182321');ctx.fillStyle=grad;ctx.fillRect(48,68,864,534);
    for(let y=78,row=0;y<590;y+=48,row++)for(let x=58,col=0;x<902;x+=48,col++){
      ctx.fillStyle=((row+col)%2===0)?'#2a3530':'#28332e';ctx.fillRect(x,y,48,48);
      ctx.strokeStyle='#344039';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,47,47);
      if((row*7+col*13)%11===0){ctx.fillStyle='#4b5143';ctx.fillRect(x+12,y+15,2,2);ctx.fillRect(x+15,y+17,1,1);}
      if((row+col*3)%17===0){ctx.fillStyle='#34443a';ctx.fillRect(x+34,y+33,7,1);ctx.fillRect(x+37,y+34,1,4);}
    }
    // heavy carved room border
    ctx.fillStyle='#151d1b';ctx.fillRect(48,68,864,18);ctx.fillRect(48,586,864,18);ctx.fillRect(48,68,18,536);ctx.fillRect(894,68,18,536);
    for(let x=52;x<908;x+=44){ctx.fillStyle='#39443b';ctx.fillRect(x,69,39,13);ctx.fillRect(x,588,39,13);ctx.fillStyle='#56604e';ctx.fillRect(x+2,71,35,2);ctx.fillStyle='#0c1312';ctx.fillRect(x,82,39,3);}
    for(let y=86;y<586;y+=44){ctx.fillStyle='#39443b';ctx.fillRect(50,y,13,39);ctx.fillRect(897,y,13,39);ctx.fillStyle='#59614d';ctx.fillRect(52,y+2,3,35);ctx.fillStyle='#0e1513';ctx.fillRect(61,y,3,39);}
    // inlaid rune tracks and cracked floor
    ctx.strokeStyle='#86906b20';ctx.lineWidth=2;ctx.strokeRect(220,125,520,428);ctx.strokeRect(229,134,502,410);
    ctx.strokeStyle='#78684255';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(238,252);ctx.lineTo(253,265);ctx.lineTo(247,273);ctx.moveTo(720,405);ctx.lineTo(704,414);ctx.lineTo(711,428);ctx.moveTo(419,479);ctx.lineTo(428,466);ctx.lineTo(422,453);ctx.stroke();
    // corner braziers
    for(const [x,y] of [[100,112],[860,112],[100,553],[860,553]]){
      ctx.fillStyle='#111715';ctx.fillRect(x-13,y+8,26,13);ctx.fillStyle='#626650';ctx.fillRect(x-11,y+3,22,10);ctx.fillStyle='#a47643';ctx.fillRect(x-7,y,14,7);
      const glow=ctx.createRadialGradient(x,y-5,1,x,y-5,34);glow.addColorStop(0,'#f2ad4a99');glow.addColorStop(1,'#f2ad4a00');ctx.fillStyle=glow;ctx.fillRect(x-34,y-39,68,68);
      ctx.fillStyle='#ffd176';ctx.beginPath();ctx.ellipse(x,y-7,4,8+Math.sin(time*8+x)*2,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff0ad';ctx.fillRect(x-1,y-12,2,6);
    }
    drawArch();
    for(const o of walls)drawPot(o);
    // faint ambient motes
    for(let i=0;i<8;i++){const x=110+((i*137+Math.sin(time*.4+i)*18)%740),y=130+((i*83+time*8)%420);ctx.fillStyle='#d3c88722';ctx.fillRect(x,y,2,2);}
  }
  function drawArch(){
    const sealed=boss.state==='sleep';ctx.save();
    ctx.fillStyle='#121918';ctx.fillRect(426,71,108,77);ctx.fillStyle='#515448';ctx.fillRect(434,75,92,68);ctx.fillStyle='#252c27';ctx.fillRect(442,83,76,60);
    ctx.fillStyle=sealed?'#322d24':'#131e1a';ctx.beginPath();ctx.arc(480,112,31,Math.PI,0);ctx.lineTo(511,143);ctx.lineTo(449,143);ctx.closePath();ctx.fill();
    if(sealed){ctx.strokeStyle='#d2a954';ctx.lineWidth=3;ctx.beginPath();ctx.arc(480,116,22,Math.PI*.08,Math.PI*.92);ctx.stroke();ctx.fillStyle='#dcb968';ctx.fillRect(477,100,6,6);ctx.fillRect(477,114,6,6);ctx.fillRect(477,128,6,6);ctx.fillStyle='#55452a';ctx.fillRect(459,141,42,5);}
    else{ctx.strokeStyle='#e3ba69';ctx.lineWidth=2;ctx.beginPath();ctx.arc(480,115,22,Math.PI,0);ctx.stroke();ctx.fillStyle='#c49a5d';ctx.fillRect(461,140,38,3);}
    ctx.fillStyle='#73715a';ctx.fillRect(416,143,128,7);ctx.fillStyle='#232b26';ctx.fillRect(423,150,114,4);ctx.restore();
  }
  function drawPot(o){
    const x=o.x,y=o.y,w=o.w,h=o.h;ctx.save();ctx.translate(x,y);
    // shadow and low stone plinth
    ctx.fillStyle='#11181599';ctx.beginPath();ctx.ellipse(w/2,h-1,w*.68,8,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#64614d';ctx.fillRect(-3,h-7,w+6,8);ctx.fillStyle='#8c8260';ctx.fillRect(0,h-8,w,2);
    if(w>40){ctx.fillStyle='#744b37';ctx.beginPath();ctx.moveTo(8,12);ctx.lineTo(13,5);ctx.lineTo(w-13,5);ctx.lineTo(w-8,12);ctx.lineTo(w-11,h-8);ctx.lineTo(11,h-8);ctx.closePath();ctx.fill();ctx.fillStyle='#a36d48';ctx.fillRect(10,12,w-20,4);ctx.fillStyle='#583b31';ctx.fillRect(13,18,w-26,h-28);ctx.fillStyle='#bd8760';ctx.fillRect(14,14,4,h-25);ctx.fillStyle='#d0a875';ctx.fillRect(w/2-3,2,6,5);ctx.fillStyle='#513e31';ctx.fillRect(w/2-5,0,10,3);}
    else{ctx.fillStyle='#4c5245';ctx.fillRect(2,8,w-4,h-10);ctx.fillStyle='#858366';ctx.fillRect(5,5,w-10,6);ctx.fillStyle='#353e35';ctx.fillRect(8,13,w-16,h-18);ctx.fillStyle='#a99a6b';ctx.fillRect(10,10,w-20,2);}
    ctx.restore();
  }
  function drawKey(){if(!keyItem)return;const x=keyItem.x,y=keyItem.y;ctx.save();ctx.shadowColor='#f8ca64';ctx.shadowBlur=18;ctx.translate(x,y);ctx.rotate(Math.sin(time*2)*.12);ctx.strokeStyle='#f4cf77';ctx.lineWidth=5;ctx.beginPath();ctx.arc(-5,-6,9,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(2,0);ctx.lineTo(15,13);ctx.lineTo(20,8);ctx.moveTo(12,10);ctx.lineTo(8,14);ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#fff0b0';ctx.fillRect(-7,-8,3,3);ctx.restore();}
  function drawSlime(s){ctx.save();ctx.translate(s.x,s.y);const bob=Math.sin(time*7+s.seed)*2;ctx.fillStyle='#12191688';ctx.beginPath();ctx.ellipse(0,11,20,7,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#466d4c';ctx.beginPath();ctx.ellipse(0,bob,18,15+bob*.3,0,Math.PI,0);ctx.lineTo(18,3);ctx.quadraticCurveTo(16,16,0,15);ctx.quadraticCurveTo(-16,15,-18,3);ctx.fill();ctx.fillStyle='#87ae69';ctx.beginPath();ctx.ellipse(-4,-4,9,5,-.2,Math.PI,0);ctx.fill();ctx.fillStyle='#e6d9ac';ctx.fillRect(-8,0,4,5);ctx.fillRect(4,0,4,5);ctx.fillStyle='#26352a';ctx.fillRect(-7,2,2,3);ctx.fillRect(5,2,2,3);ctx.fillStyle='#b9cc8b';ctx.fillRect(-11,7,4,2);ctx.fillRect(8,7,4,2);ctx.restore();}
  function drawBoss(){if(boss.state==='dead')return;const x=boss.x,y=boss.y;ctx.save();
    if(boss.state==='windup'){ctx.strokeStyle=`rgba(241,105,73,${.22+.25*Math.sin(time*18)})`;ctx.lineWidth=3;ctx.setLineDash([7,7]);ctx.beginPath();ctx.arc(x,y,31+Math.sin(time*14)*3,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
    if(boss.state==='dash'){ctx.globalAlpha=.25;ctx.fillStyle='#f08054';ctx.beginPath();ctx.ellipse(x-boss.dir.x*30,y-boss.dir.y*30,25,15,Math.atan2(boss.dir.y,boss.dir.x),0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
    ctx.fillStyle='#11171599';ctx.beginPath();ctx.ellipse(x,y+15,32,12,0,0,Math.PI*2);ctx.fill();
    const shell=boss.flash?'#f6d998':'#5e493d',armor=boss.flash?'#fff0b1':'#9b7955';
    ctx.fillStyle=shell;ctx.beginPath();ctx.arc(x,y,27,0,Math.PI*2);ctx.fill();ctx.fillStyle='#392d28';ctx.beginPath();ctx.arc(x,y-1,21,0,Math.PI*2);ctx.fill();
    // horned crown
    ctx.fillStyle=armor;ctx.beginPath();ctx.moveTo(x-21,y-11);ctx.lineTo(x-31,y-32);ctx.lineTo(x-10,y-23);ctx.lineTo(x,y-34);ctx.lineTo(x+10,y-23);ctx.lineTo(x+31,y-32);ctx.lineTo(x+21,y-9);ctx.closePath();ctx.fill();ctx.fillStyle='#47362d';ctx.fillRect(x-17,y-14,34,17);
    ctx.fillStyle='#f2bd61';ctx.fillRect(x-11,y-8,5,4);ctx.fillRect(x+6,y-8,5,4);ctx.fillStyle='#fff0a0';ctx.fillRect(x-10,y-8,2,2);ctx.fillRect(x+7,y-8,2,2);
    ctx.fillStyle='#75604b';ctx.fillRect(x-17,y+14,11,7);ctx.fillRect(x+7,y+14,11,7);ctx.fillStyle=armor;ctx.fillRect(x-22,y+19,13,5);ctx.fillRect(x+9,y+19,13,5);
    ctx.restore();
  }
  function drawPlayer(){const p=player;ctx.save();ctx.translate(p.x,p.y);if(p.invuln>0&&Math.floor(time*18)%2===0)ctx.globalAlpha=.45;
    ctx.fillStyle='#11171599';ctx.beginPath();ctx.ellipse(0,12,16,8,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#8b3e31';ctx.beginPath();ctx.moveTo(-12,-7);ctx.lineTo(-14,14);ctx.lineTo(0,9);ctx.lineTo(12,14);ctx.lineTo(11,-8);ctx.closePath();ctx.fill();ctx.fillStyle='#b4573f';ctx.fillRect(-10,-5,4,14);
    ctx.fillStyle='#344d3e';ctx.fillRect(-10,-8,20,18);ctx.fillStyle='#49674d';ctx.fillRect(-7,-9,14,14);ctx.fillStyle='#dfc98f';ctx.fillRect(-8,-15,16,10);ctx.fillStyle='#f1d9a1';ctx.fillRect(-5,-17,10,4);ctx.fillStyle='#342d27';ctx.fillRect(-5,-12,2,3);ctx.fillRect(4,-12,2,3);ctx.fillStyle='#789067';ctx.fillRect(-10,-19,20,5);ctx.fillStyle='#bb9f59';ctx.fillRect(-3,-21,6,5);
    // sword slash crescent
    if(attack>0){ctx.save();ctx.translate(p.face.x*12,p.face.y*12);ctx.rotate(Math.atan2(p.face.y,p.face.x));ctx.globalAlpha=Math.min(1,attack*7);ctx.strokeStyle='#fff0bd';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,38,-.88,.88);ctx.stroke();ctx.strokeStyle='#f1bd61';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,43,-.78,.78);ctx.stroke();ctx.restore();}
    else{ctx.strokeStyle='#d9d7bd';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(p.face.x*9,p.face.y*9);ctx.lineTo(p.face.x*24,p.face.y*24);ctx.stroke();ctx.fillStyle='#c59e5d';ctx.fillRect(p.face.x*8-2,p.face.y*8-2,4,4);}
    ctx.restore();}
  function drawHUD(){
    // header plaque
    ctx.fillStyle='#111a18';ctx.fillRect(0,0,W,68);ctx.fillStyle='#3d4a3e';ctx.fillRect(0,65,W,3);ctx.fillStyle='#b89a5f';ctx.fillRect(28,64,126,2);ctx.fillRect(806,64,126,2);
    ctx.fillStyle='#e2d9bf';ctx.font='700 13px Manrope, sans-serif';ctx.textAlign='left';ctx.fillText('THE SUNKEN KEEP',30,25);
    ctx.fillStyle='#78887c';ctx.font='10px "DM Mono", monospace';ctx.fillText('DUNGEON 01  ·  THE WARDEN’S CHAMBER',30,45);
    ctx.fillStyle='#7d8c7f';ctx.font='10px "DM Mono", monospace';ctx.textAlign='right';ctx.fillText('EMBERVAULT   /   01',930,24);
    // health hearts
    ctx.textAlign='left';ctx.fillStyle='#7e8d80';ctx.fillText('VITALITY',744,44);
    for(let i=0;i<player.maxHp;i++){const x=814+i*23,y=39;ctx.fillStyle=i<player.hp?'#d95d4e':'#39443d';ctx.beginPath();ctx.moveTo(x,y+7);ctx.bezierCurveTo(x-13,y-1,x-9,y-9,x,y-3);ctx.bezierCurveTo(x+9,y-9,x+13,y-1,x,y+7);ctx.fill();if(i<player.hp){ctx.fillStyle='#f29373';ctx.fillRect(x-4,y-4,3,2);}}
    if(slimes.length){ctx.fillStyle='#758479';ctx.font='10px "DM Mono", monospace';ctx.textAlign='left';ctx.fillText('GUARDIANS',30,616);for(let i=0;i<2;i++){ctx.fillStyle=i<slimes.length?'#9cb97b':'#39453b';ctx.beginPath();ctx.arc(126+i*20,612,5,0,Math.PI*2);ctx.fill();}}
    else if(keyItem){ctx.fillStyle='#e4c47d';ctx.font='10px "DM Mono", monospace';ctx.textAlign='left';ctx.fillText('KEY REVEALED  —  CLAIM IT',30,616);}
    else if(boss.state==='sleep'){ctx.fillStyle='#879188';ctx.font='10px "DM Mono", monospace';ctx.textAlign='left';ctx.fillText('THE SEAL IS OPEN',30,616);}
    if(boss.state!=='sleep'&&boss.state!=='dead'){
      ctx.fillStyle='#111816d9';ctx.fillRect(354,77,252,37);ctx.strokeStyle='#7c6347';ctx.strokeRect(354.5,77.5,251,36);
      ctx.textAlign='left';ctx.fillStyle='#e6d7bd';ctx.font='700 10px Manrope, sans-serif';ctx.fillText('THE ASHEN WARDEN',365,92);
      ctx.fillStyle='#342d28';ctx.fillRect(365,99,230,7);ctx.fillStyle='#ce7650';ctx.fillRect(365,99,230*(boss.hp/boss.maxHp),7);ctx.fillStyle='#f2b378';ctx.fillRect(365,99,230*(boss.hp/boss.maxHp),2);
      ctx.textAlign='right';ctx.fillStyle='#c2b49b';ctx.font='9px "DM Mono", monospace';ctx.fillText(`${boss.hp} / ${boss.maxHp}`,595,92);
      if(boss.state==='recover'){ctx.textAlign='center';ctx.fillStyle='#f1d18e';ctx.font='9px "DM Mono", monospace';ctx.fillText('STRIKE NOW',480,127);}
    }
  }
  function overlay(){
    if(mode==='play')return;
    ctx.fillStyle=mode==='title'?'rgba(7,12,11,.48)':'rgba(7,12,11,.63)';ctx.fillRect(0,68,W,572);
    const x=230,y=mode==='title'?190:205,w=500,h=mode==='title'?285:230;
    rr(x,y,w,h,7,'#151e1c','rgba(211,190,135,.62)');ctx.strokeStyle='#647263';ctx.strokeRect(x+8,y+8,w-16,h-16);
    ctx.fillStyle='#d9b866';ctx.textAlign='center';ctx.font='11px "DM Mono", monospace';ctx.fillText(mode==='title'?'A ONE-ROOM DUNGEON':'EMBERVAULT',480,y+38);
    if(mode==='title'){
      ctx.fillStyle='#eee7d4';ctx.font='800 44px Manrope, sans-serif';ctx.fillText('THE ASHEN',480,y+94);ctx.fillStyle='#d6ad61';ctx.fillText('WARDEN',480,y+139);
      ctx.fillStyle='#9dab9e';ctx.font='13px Manrope, sans-serif';ctx.fillText('Two guardians. One key. One way out.',480,y+171);
      ctx.fillStyle='#ddd7c3';ctx.font='11px "DM Mono", monospace';ctx.fillText('DEFEAT THE SLIMES TO REVEAL THE KEY',480,y+204);ctx.fillText('THEN BREAK THE SEAL AND FACE THE WARDEN',480,y+224);
      rr(365,y+242,230,30,3,'#b98b47','#e2c47a');ctx.fillStyle='#171c17';ctx.font='700 11px "DM Mono", monospace';ctx.fillText('ENTER THE DUNGEON',480,y+262);
    }else if(mode==='pause'){
      ctx.fillStyle='#eee7d4';ctx.font='800 39px Manrope, sans-serif';ctx.fillText('PAUSED',480,y+101);ctx.fillStyle='#aab4a5';ctx.font='13px Manrope, sans-serif';ctx.fillText('Take a breath, adventurer.',480,y+137);ctx.fillStyle='#d8bc7c';ctx.font='11px "DM Mono", monospace';ctx.fillText('PRESS ESC OR CLICK TO RESUME',480,y+184);
    }else if(mode==='won'){
      ctx.fillStyle='#eee7d4';ctx.font='800 39px Manrope, sans-serif';ctx.fillText('THE SEAL IS BROKEN',480,y+100);ctx.fillStyle='#d6ad61';ctx.font='16px Manrope, sans-serif';ctx.fillText('The Sunken Keep falls silent.',480,y+137);ctx.fillStyle='#aab4a5';ctx.font='12px Manrope, sans-serif';ctx.fillText('You escaped the chamber with the Warden defeated.',480,y+164);ctx.fillStyle='#d8bc7c';ctx.font='11px "DM Mono", monospace';ctx.fillText('PRESS R OR CLICK TO PLAY AGAIN',480,y+198);
    }else{
      ctx.fillStyle='#eee7d4';ctx.font='800 43px Manrope, sans-serif';ctx.fillText('YOU FELL',480,y+100);ctx.fillStyle='#c58a72';ctx.font='15px Manrope, sans-serif';ctx.fillText('The dungeon claims another hero.',480,y+139);ctx.fillStyle='#d8bc7c';ctx.font='11px "DM Mono", monospace';ctx.fillText('PRESS R OR CLICK TO TRY AGAIN',480,y+190);
    }
  }
  function render(){
    ctx.save();if(shake>0)ctx.translate((Math.random()-.5)*shake*28,(Math.random()-.5)*shake*28);
    drawRoom();
    // order by depth for a little overlap and readable sprites
    const things=[];slimes.forEach(s=>things.push({y:s.y,draw:()=>drawSlime(s)}));if(boss.state!=='dead')things.push({y:boss.y,draw:drawBoss});things.push({y:player.y,draw:drawPlayer});
    things.sort((a,b)=>a.y-b.y).forEach(o=>o.draw());drawKey();
    for(const p of particles){ctx.globalAlpha=clamp(p.life/.6,0,1);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);}ctx.globalAlpha=1;
    for(const p of floating){ctx.globalAlpha=clamp(p.life/.25,0,1);ctx.textAlign='center';ctx.font='700 10px "DM Mono", monospace';ctx.fillStyle='#111';ctx.fillText(p.text,p.x+1,p.y+1);ctx.fillStyle=p.color;ctx.fillText(p.text,p.x,p.y);}ctx.globalAlpha=1;
    drawHUD();overlay();if(flash>0){ctx.fillStyle=`rgba(255,111,86,${flash*.35})`;ctx.fillRect(0,68,W,H-68);}ctx.restore();
  }
  function frame(now){const dt=Math.min(.033,(now-last)/1000||0);last=now;update(dt);render();requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
})();
