import test from 'node:test';
import assert from 'node:assert/strict';
import {TUNINGS,frequency,centsBetween,nearestString,detectPitch,validateSong,importBackup,blankTab} from '../core.js';
function wave(hz,sampleRate,harmonics=false,noise=0){
  let seed=42;
  return Float32Array.from({length:4096},(_,i)=>{
    seed=(Math.imul(seed,1664525)+1013904223)|0;
    const t=2*Math.PI*hz*i/sampleRate;
    return .15*Math.sin(t)+(harmonics?.24*Math.sin(2*t)+.12*Math.sin(3*t):0)+noise*(seed/2147483648);
  });
}
for(const rate of [44100,48000])for(const [key,tuning] of Object.entries(TUNINGS)) {
  test(`YIN ${key}, ${rate} Hz: todas las cuerdas y armónicos`,()=>{
    for(const midi of tuning.midi)for(const offset of [-30,0,30]) {
      const hz=frequency(midi)*2**(offset/1200);
      const result=detectPitch(wave(hz,rate,true,.005),rate);
      assert.ok(result,`Sin detección: ${hz}`);
      assert.ok(Math.abs(centsBetween(result.hz,hz))<2,`Desviación: ${result.hz} vs ${hz}`);
    }
  });
}
test('Silencio y ruido no se presentan como una nota afinada',()=>{
  assert.equal(detectPitch(new Float32Array(4096),48000),null);
  let seed=12;const noise=Float32Array.from({length:4096},()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return seed/2147483648*.2;});
  assert.equal(detectPitch(noise,48000),null);
});
test('Identifica la cuerda correcta, conserva octava y selección manual',()=>{
  assert.equal(nearestString(frequency(40),'standard').index,0);
  assert.equal(nearestString(frequency(64),'standard').index,5);
  assert.equal(nearestString(frequency(38),'dropD').index,0);
  assert.equal(nearestString(frequency(45),'standard',0).index,0);
  assert.ok(nearestString(frequency(40)*2**(15/1200),'standard').cents>14.9);
});
const song={id:'old',title:'Prueba',artist:'Autor',content:blankTab,format:'tab',capo:null,tuning:'standard',notes:'',source:'',status:'draft',favorite:false};
test('Aprobar requiere confirmar capo; cero es sin capo',()=>{
  assert.doesNotThrow(()=>validateSong(song));
  assert.throws(()=>validateSong({...song,status:'reviewed'}),/capo/);
  assert.doesNotThrow(()=>validateSong({...song,status:'reviewed',capo:0}));
  for(const capo of [-1,13,1.5,'2'])assert.throws(()=>validateSong({...song,capo}));
});
test('Importación conserva texto exacto, usa IDs nuevos y requiere otra revisión',()=>{
  const content='e|--0---  \nB|---1--\nG|------\nD|------\nA|------\nE|------\n';
  const [result]=importBackup(JSON.stringify({version:1,songs:[{...song,content,status:'reviewed',capo:2}]}),()=> 'new','today');
  assert.equal(result.content,content);assert.equal(result.id,'new');assert.equal(result.status,'draft');assert.equal(result.capo,2);
});
test('Respaldo inválido no produce importación parcial ni permite afinaciones desconocidas',()=>{
  assert.throws(()=>importBackup(JSON.stringify({version:2,songs:[]}),()=>'', ''),/compatible/);
  for(const tuning of ['unknown','__proto__','constructor'])assert.throws(()=>validateSong({...song,tuning}),/afinación/);
  assert.throws(()=>importBackup(JSON.stringify({version:1,songs:[song,{...song,content:null}]}),()=>'', ''));
  assert.equal(blankTab.split('\n').length,6);
});
