const fs=require('fs');
['config','geometry','timeline','flags','audio'].forEach(m=>require('../src/'+m+'.js'));
const FS=globalThis.FS; const t=Date.now();
const a=FS.renderAudio();
fs.mkdirSync('out',{recursive:true});
fs.writeFileSync('out/audio.wav',Buffer.from(FS.encodeWav(a.L,a.R,a.sr)));
let rms=0,pk=0; for(let i=0;i<a.L.length;i++){rms+=a.L[i]*a.L[i]+a.R[i]*a.R[i]; pk=Math.max(pk,Math.abs(a.L[i]),Math.abs(a.R[i]));}
console.log('dur',a.duration.toFixed(2),'s  render',(Date.now()-t),'ms  rms',Math.sqrt(rms/(2*a.L.length)).toFixed(3),'peak',pk.toFixed(3));
