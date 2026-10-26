import { TUNINGS, frequency, nearestString, detectPitch, validateSong, importBackup, blankTab } from './core.js';
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key = 'seis-cuerdas.library.v1';
let songs = [], selectedId = null, filter = 'all', editingId = null, storageBlocked = false, toastTimer, rawStorage = '';
let scoreSize = 13;
const capoLabel = value => value === null ? 'Capo por confirmar' : value === 0 ? 'Sin capo' : `Capo · traste ${value}`;
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').hidden = true, 6000); }
function download(name, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], {type})); const link = document.createElement('a');
  link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function save(next) {
  if (storageBlocked) { toast('Primero recupera el respaldo de los datos que no pudimos leer.'); return false; }
  try { localStorage.setItem(key, JSON.stringify({version:1,songs:next})); songs = next; return true; }
  catch { toast('No se pudo guardar. Puede faltar espacio o estar bloqueado el almacenamiento. Descarga un respaldo.'); return false; }
}
function load() {
  try {
    rawStorage = localStorage.getItem(key) || '';
    if (rawStorage) {
      const data = JSON.parse(rawStorage);
      if (data.version !== 1 || !Array.isArray(data.songs)) throw new Error();
      const ids = new Set();
      data.songs.forEach(s => { validateSong(s); if (typeof s.id !== 'string' || ids.has(s.id)) throw new Error(); ids.add(s.id); });
      songs = data.songs;
    }
  } catch {
    storageBlocked = true;
    const banner = document.createElement('section'); banner.className = 'storage-error';
    banner.innerHTML = '<strong>No pudimos leer tu biblioteca.</strong><p>Los datos existentes siguen intactos. Descarga una copia antes de reiniciar el almacenamiento.</p><button class="button subtle" id="recover">Descargar datos originales</button><button class="button subtle" id="reset-storage">Reiniciar biblioteca</button>';
    $('#library-view').prepend(banner);
    $('#recover').onclick = () => download('seis-cuerdas-recuperacion.txt', rawStorage, 'text/plain');
    $('#reset-storage').onclick = async () => {
      if (!await confirmAction('¿Reiniciar biblioteca?', 'Esto borra los datos locales que no pudimos leer. Descarga antes la copia original.', 'Reiniciar')) return;
      try { localStorage.removeItem(key); storageBlocked = false; songs=[]; banner.remove(); renderLibrary(); } catch { toast('El navegador no permite usar el almacenamiento.'); }
    };
  }
  selectedId = songs[0]?.id;
}
function confirmAction(title, description, button) {
  return new Promise(resolve => {
    const dialog = $('#confirm-dialog'); $('#confirm-title').textContent = title; $('#confirm-description').textContent = description; $('#confirm-accept').textContent = button;
    let finished = false;
    const finish = answer => { if (finished) return; finished = true; dialog.close(); resolve(answer); };
    $('#confirm-cancel').onclick = () => finish(false); $('#confirm-accept').onclick = () => finish(true);
    dialog.oncancel = event => { event.preventDefault(); finish(false); }; dialog.showModal();
  });
}
function renderLibrary() {
  const query = $('#search').value.toLocaleLowerCase('es').trim();
  const visible = songs.filter(s => `${s.title} ${s.artist}`.toLocaleLowerCase('es').includes(query) && (filter === 'all' || (filter === 'favorite' ? s.favorite : s.status === filter)));
  if (!visible.some(s => s.id === selectedId)) selectedId = visible[0]?.id;
  $('#nav-count').textContent = songs.length; $('#total-count').textContent = songs.length; $('#draft-count').textContent = songs.filter(s => s.status === 'draft').length;
  $('#result-count').textContent = `${visible.length} ${visible.length === 1 ? 'canción' : 'canciones'}`;
  $('#export-button').disabled = songs.length === 0;
  $('#song-list').innerHTML = visible.length ? visible.map(s => `<article class="song-card ${s.id === selectedId ? 'selected' : ''}"><button class="song-open" data-id="${escape(s.id)}" aria-pressed="${s.id === selectedId}"><strong class="song-title">${escape(s.title)}</strong><span class="song-artist">${escape(s.artist || 'Sin artista')}</span><span class="card-tags"><span class="status-dot ${s.status === 'draft' ? 'draft' : ''}">● ${s.status === 'draft' ? 'Por revisar' : 'Revisada'}</span><span>${escape(capoLabel(s.capo))}</span></span></button><button class="star-button ${s.favorite ? 'on' : ''}" data-star="${escape(s.id)}" aria-pressed="${s.favorite === true}" aria-label="${s.favorite ? 'Quitar de' : 'Añadir a'} favoritas: ${escape(s.title)}">${s.favorite ? '★' : '☆'}</button></article>`).join('') : `<div class="empty"><h3>${songs.length ? 'Sin coincidencias' : 'La primera canción te espera.'}</h3><p>${songs.length ? 'Prueba otra búsqueda o filtro.' : 'Añade tu tablatura favorita o explora un ejercicio de ejemplo.'}</p></div>`;
  $$('.song-open').forEach(button => button.onclick = () => { selectedId = button.dataset.id; renderLibrary(); });
  $$('[data-star]').forEach(button => button.onclick = () => { if(save(songs.map(s => s.id === button.dataset.star ? {...s,favorite:!s.favorite} : s))) renderLibrary(); });
  renderReader();
}
function renderReader() {
  const song = songs.find(s => s.id === selectedId);
  if (!song) {
    $('#reader').innerHTML = `<div class="empty-reader"><div class="strings-illustration" aria-hidden="true"></div><span class="eyebrow">TU PRÓXIMO ACORDE EMPIEZA AQUÍ</span><h2 style="margin-top:17px">Un espacio para<br>tus favoritas.</h2><p>Conserva cada nota, cada espacio y cada acorde. Revisa tu versión y tenla lista para tocar.</p><button id="demo-song" class="button subtle">Explorar un ejemplo ↗</button><span class="demo-label">Ejercicio original · Sin canciones precargadas</span><button id="empty-help" class="text-button">Cómo instalar y guardar respaldos</button></div>`;
    $('#demo-song').onclick = () => openEditor(null, {title:'Un rato con las seis',artist:'Ejercicio original · Seis Cuerdas',format:'tab',capo:0,tuning:'standard',content:'[Intro · arpegio suave]\n\ne|--------0-----------0---------|\nB|------1---1-------1---1-------|\nG|----0-------0---0-------0-----|\nD|------------------------------|\nA|--3-----------3---------------|\nE|------------------------------|\n\n[Segunda vuelta]\n\ne|--------0-----------0---------|\nB|------0---0-------0---0-------|\nG|----0-------0---0-------0-----|\nD|--2-----------2---------------|\nA|------------------------------|\nE|------------------------------|',notes:'Toca despacio. Deja sonar cada nota y repite el ejercicio a tu ritmo.',source:'Ejercicio original creado para esta app.'});
    $('#empty-help').onclick = () => $('#help-dialog').showModal(); return;
  }
  const draft = song.status === 'draft';
  $('#reader').innerHTML = `<div class="reader-header"><div class="reader-topline"><span class="pill ${draft ? 'draft' : ''}">${draft ? '○ POR REVISAR' : '✓ REVISADA POR TI'}</span><div class="reader-actions"><button id="edit-song">Editar</button><button id="delete-song">Eliminar</button></div></div><h2>${escape(song.title)}</h2><p class="reader-artist">${escape(song.artist || 'Sin artista')}</p><div class="metadata"><span class="capo">${escape(capoLabel(song.capo))}</span><span>${escape(TUNINGS[song.tuning].name)}</span><span>${song.format === 'tab' ? 'TAB · 6 cuerdas' : 'Letra y acordes'}</span></div></div><div class="score-toolbar"><span>${song.format === 'tab' ? 'TABLATURA' : 'LETRA Y ACORDES'} · DESLIZA SI ES NECESARIO</span><div class="font-controls"><button id="font-smaller" aria-label="Reducir texto">A−</button><button id="font-larger" aria-label="Ampliar texto">A+</button></div></div><pre class="score" tabindex="0" aria-label="Contenido de la canción"></pre>${song.notes ? `<p class="reader-notes">${escape(song.notes)}</p>` : ''}${song.source ? `<p class="reader-source">FUENTE · ${escape(song.source)}</p>` : ''}${draft ? '<div class="review-box"><p>Comprueba la tablatura, el capo y la afinación antes de llevarla a tu repertorio.</p><label><input id="review-check" type="checkbox"> Ya revisé el contenido, la afinación y la posición del capo.</label><button id="approve-song" class="button primary" disabled>Aprobar canción ✓</button></div>' : '<div class="review-box"><p>Lista para tocar. Si la editas, volverá a quedar por revisar.</p><button id="tune-song" class="button subtle">Afinar con esta afinación ↗</button></div>'}`;
  $('.score').textContent = song.content; $('.score').style.setProperty('--score-size',`${scoreSize}px`);
  $('#edit-song').onclick = () => openEditor(song);
  $('#delete-song').onclick = async () => { if (await confirmAction('¿Eliminar esta canción?', `Se eliminará «${song.title}» de este dispositivo.`, 'Eliminar') && save(songs.filter(s => s.id !== song.id))) { renderLibrary(); toast('Canción eliminada.'); } };
  $('#font-smaller').onclick = () => { scoreSize = Math.max(10,scoreSize-1); $('.score').style.setProperty('--score-size',`${scoreSize}px`); };
  $('#font-larger').onclick = () => { scoreSize = Math.min(22,scoreSize+1); $('.score').style.setProperty('--score-size',`${scoreSize}px`); };
  if (draft) {
    $('#review-check').onchange = e => $('#approve-song').disabled = !e.target.checked;
    $('#approve-song').onclick = () => {
      if (song.capo === null) { toast('Confirma el capo en el editor: sin capo o el traste correspondiente.'); return; }
      if(save(songs.map(s => s.id === song.id ? {...s,status:'reviewed',updatedAt:new Date().toISOString()} : s))) { renderLibrary(); toast('Canción revisada y lista para tocar.'); }
    };
  } else $('#tune-song').onclick = () => { $('#tuner-tuning').value = song.tuning; selectedString = -1; renderStrings(); setRoute('tuner'); };
}
const options = Object.entries(TUNINGS).map(([key,t]) => `<option value="${key}">${escape(t.name)} · ${t.notes.map(n => n.replace(/\d/g,'')).join(' ')}</option>`).join('');
$('#song-form [name=tuning]').innerHTML = options; $('#tuner-tuning').innerHTML = options;
for (let i=1;i<=12;i++) $('#song-form [name=capo]').add(new Option(`Traste ${i}`,String(i)));
let editorInitial = '';
function editorSnapshot() { return JSON.stringify([...new FormData($('#song-form')).entries()]); }
function openEditor(song = null, values = {}) {
  editingId = song?.id || null; $('#song-form').reset(); $('#form-error').textContent = '';
  $('#editor-title').textContent = song ? 'Editar canción' : 'Nueva canción';
  for (const [key,value] of Object.entries(song || values)) { const input = $('#song-form').elements.namedItem(key); if (input) input.value = value ?? ''; }
  editorInitial = editorSnapshot(); $('#editor').showModal();
}
async function closeEditor() {
  if (editorSnapshot() !== editorInitial && !await confirmAction('¿Descartar los cambios?', 'Los cambios de este formulario todavía no se han guardado.', 'Descartar')) return;
  $('#editor').close();
}
$('#close-editor').onclick = closeEditor; $('#cancel-editor').onclick = closeEditor;
$('#editor').oncancel = e => { e.preventDefault(); closeEditor(); };
$('#new-song').onclick = () => openEditor();
$('#insert-tab').onclick = () => { const input = $('#song-content'); input.setRangeText(`${input.value ? '\n\n' : ''}${blankTab}`,input.selectionStart,input.selectionEnd,'end'); input.focus(); };
$('#song-form').onsubmit = event => {
  event.preventDefault(); const data = Object.fromEntries(new FormData(event.target)); const now = new Date().toISOString();
  const existing = songs.find(s => s.id === editingId);
  const song = {...data,id:editingId || crypto.randomUUID(),title:data.title.trim(),artist:data.artist.trim(),capo:data.capo === '' ? null : Number(data.capo),favorite:existing?.favorite || false,status:'draft',createdAt:existing?.createdAt || now,updatedAt:now};
  try { validateSong(song); } catch (error) { $('#form-error').textContent=error.message; return; }
  if (!save(editingId ? songs.map(s => s.id === editingId ? song : s) : [song,...songs])) return;
  selectedId = song.id; filter = 'all'; $('#search').value = ''; updateFilters(); renderLibrary(); $('#editor').close(); toast('Guardada. Revisa la canción y apruébala cuando esté lista.');
};
function updateFilters() { $$('[data-filter]').forEach(b => { const active = b.dataset.filter === filter; b.classList.toggle('selected',active); b.setAttribute('aria-pressed',String(active)); }); }
$$('[data-filter]').forEach(button => button.onclick = () => {filter=button.dataset.filter;updateFilters();renderLibrary();});
$('#search').oninput = renderLibrary;
$('#export-button').onclick = () => download(`seis-cuerdas-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify({version:1,exportedAt:new Date().toISOString(),songs},null,2));
$('#import-button').onclick = () => $('#import-file').click();
$('#import-file').onchange = async event => {
  const file = event.target.files[0]; event.target.value = ''; if (!file) return;
  if (file.size > 5_000_000) { toast('El archivo supera el límite de 5 MB.'); return; }
  try {
    const text = await file.text();
    if (file.name.toLowerCase().endsWith('.txt')) { if (text.length > 100000) throw new Error('El texto supera los 100 000 caracteres.'); openEditor(null,{title:file.name.replace(/\.txt$/i,''),content:text}); return; }
    const imported = importBackup(text,() => crypto.randomUUID(),new Date().toISOString());
    if (!imported.length) { toast('El respaldo no contiene canciones.'); return; }
    if (!await confirmAction(`¿Importar ${imported.length} canciones?`,'Se añadirán como pendientes de revisión. Tu biblioteca actual se conserva; si ya existen, habrá duplicados.','Importar')) return;
    if (save([...imported,...songs])) { selectedId=imported[0].id; filter='draft'; $('#search').value=''; updateFilters(); renderLibrary(); toast('Importadas. Revisa cada canción antes de aprobarla.'); }
  } catch(error) { toast(error instanceof SyntaxError ? 'El archivo no es un respaldo JSON válido.' : error.message); }
};
$('#help').onclick = () => $('#help-dialog').showModal(); $('#top-help').onclick = () => $('#help-dialog').showModal(); $('#close-help').onclick = () => $('#help-dialog').close();
function setRoute(route) { location.hash = route; renderRoute(route); }
function renderRoute(route) {
  const tuner = route === 'tuner'; $('#library-view').hidden = tuner; $('#tuner-view').hidden = !tuner;
  $('#breadcrumb').textContent = `MI ESPACIO / ${tuner ? 'AFINADOR' : 'BIBLIOTECA'}`;
  $$('[data-route]').forEach(b => { const active = b.dataset.route === (tuner?'tuner':'library'); b.classList.toggle('active',active); if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current'); });
  if (!tuner) stopMic();
}
$$('[data-route]').forEach(b => b.onclick = () => setRoute(b.dataset.route));
window.addEventListener('hashchange',() => renderRoute(location.hash.slice(1)));

// Microphone lifecycle: an explicit click starts audio; every route/visibility exit stops tracks.
let selectedString = -1, stream = null, context = null, analyser = null, micActive = false, micPending = false, micGeneration = 0, frame = 0, lastFrame = 0, lastPitch = 0, recent = [];
function renderStrings() {
  const tuning = TUNINGS[$('#tuner-tuning').value];
  $('#strings').innerHTML = tuning.notes.map((note,i) => `<button class="string-button ${selectedString === i ? 'active' : ''}" data-string="${i}" aria-pressed="${selectedString === i}" aria-label="Cuerda ${6-i}, ${note}, ${frequency(tuning.midi[i]).toFixed(1)} hercios">${note.replace(/\d/g,'')}<small>${6-i}ª · ${frequency(tuning.midi[i]).toFixed(1)}</small></button>`).join('');
  $$('[data-string]').forEach(b => b.onclick = () => { selectedString=Number(b.dataset.string); recent=[]; renderStrings(); clearPitch(); });
  $('#auto-string').textContent = selectedString === -1 ? 'Detección automática de cuerda activa' : 'Volver a detección automática';
}
function clearPitch() {
  $('#detected-note').innerHTML = `—<small>${micActive ? 'TOCA UNA CUERDA AL AIRE' : 'ACTIVA EL MICRÓFONO'}</small>`;
  $('#frequency').textContent='— Hz · — cents'; $('#pitch-feedback').textContent = micActive ? 'Escuchando… toca una cuerda a la vez.' : 'Elige una afinación para empezar.';
  $('#needle').style.left='50%'; $('#needle').style.opacity='.25'; $('#detected-note').style.color='';
  $$('[data-string]').forEach(b => b.classList.remove('detected'));
}
$('#tuner-tuning').onchange = () => { selectedString=-1; recent=[]; renderStrings(); clearPitch(); };
$('#auto-string').onclick = () => { selectedString=-1; recent=[]; renderStrings(); clearPitch(); };
function stopMic() {
  micGeneration++; micPending=false; micActive=false; cancelAnimationFrame(frame);
  stream?.getTracks().forEach(track => track.stop()); stream=null;
  if(context) context.close().catch(()=>{}); context=null; analyser=null; recent=[];
  $('#mic-button').textContent='Activar micrófono'; $('#mic-state').textContent='Micrófono apagado'; clearPitch();
}
async function startMic() {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) { $('#pitch-feedback').textContent='Para usar el micrófono, abre la app con HTTPS (o localhost en desarrollo).'; return; }
  const generation=++micGeneration; micPending=true; $('#mic-button').textContent='Cancelar'; $('#mic-state').textContent='Esperando permiso de micrófono…';
  let incoming = null, audio = null;
  try {
    audio = new AudioContext(); context=audio; await audio.resume();
    if(generation !== micGeneration) { await audio.close(); return; }
    incoming = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
    if (generation !== micGeneration || document.hidden || $('#tuner-view').hidden) { incoming.getTracks().forEach(t => t.stop()); await audio.close(); return; }
    stream=incoming; context=audio; analyser=context.createAnalyser(); analyser.fftSize=4096;
    context.createMediaStreamSource(stream).connect(analyser);
    micPending=false; micActive=true; $('#mic-button').textContent='Apagar micrófono'; $('#mic-state').textContent='● Micrófono activo · solo en este dispositivo';
    incoming.getTracks().forEach(track => track.addEventListener('ended',() => { if(generation === micGeneration) { stopMic(); toast('Se interrumpió el acceso al micrófono.'); } }));
    clearPitch(); const buffer = new Float32Array(analyser.fftSize); lastPitch=performance.now(); lastFrame=0;
    const tick = time => {
      if(!micActive || generation !== micGeneration) return;
      frame=requestAnimationFrame(tick); if(time-lastFrame < 100) return; lastFrame=time;
      analyser.getFloatTimeDomainData(buffer); const pitch=detectPitch(buffer,context.sampleRate);
      if (!pitch) { if(time-lastPitch > 650) { recent=[]; clearPitch(); } return; }
      lastPitch=time; recent.push(pitch.hz); if(recent.length>3)recent.shift();
      const hz=[...recent].sort((a,b)=>a-b)[Math.floor(recent.length/2)]; const tuning=$('#tuner-tuning').value;
      const match=nearestString(hz,tuning,selectedString); const cents=Math.round(match.cents); const close=Math.abs(cents)<=5;
      const midi=Math.round(69+12*Math.log2(hz/440)); const names=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
      const actual=`${names[((midi%12)+12)%12]}${Math.floor(midi/12)-1}`;
      $('#detected-note').innerHTML=`${escape(actual)}<small>OBJETIVO · ${escape(TUNINGS[tuning].notes[match.index])} · ${6-match.index}ª CUERDA</small>`;
      $('#detected-note').style.color=close?'var(--green)':'var(--amber)';
      $('#needle').style.left=`${50 + Math.max(-50,Math.min(50,cents))}%`; $('#needle').style.opacity='1'; $('#needle').style.background=close?'var(--green)':'var(--amber)';
      $('#frequency').textContent=`${hz.toFixed(1)} Hz · ${cents>0?'+':''}${cents} cents`;
      $('#pitch-feedback').textContent=close?'Afinada. Aquí suena bien.':cents<0?'Está grave · sube el tono poco a poco.':'Está aguda · baja el tono poco a poco.';
      $$('[data-string]').forEach(b => b.classList.toggle('detected',Number(b.dataset.string)===match.index));
    }; frame=requestAnimationFrame(tick);
  } catch(error) {
    incoming?.getTracks().forEach(t => t.stop()); if(audio && audio.state !== 'closed') audio.close().catch(()=>{});
    if(generation !== micGeneration) return;
    stopMic(); $('#pitch-feedback').textContent=error.name === 'NotAllowedError' ? 'Permiso denegado. Permite el micrófono en los ajustes del sitio y vuelve a intentar.' : error.name === 'NotFoundError' ? 'No se encontró un micrófono disponible.' : 'No pudimos abrir el micrófono. Cierra otras apps que lo estén usando e inténtalo de nuevo.';
  }
}
$('#mic-button').onclick = () => micActive || micPending ? stopMic() : startMic();
document.addEventListener('visibilitychange',() => { if(document.hidden)stopMic(); });
window.addEventListener('pagehide',stopMic);
window.addEventListener('beforeunload',event => { if($('#editor').open && editorSnapshot() !== editorInitial) { event.preventDefault(); event.returnValue=''; } });
window.addEventListener('storage',event => { if(event.key === key) { toast('La biblioteca cambió en otra pestaña. Recarga para ver los cambios antes de editar.'); storageBlocked=true; } });
let installPrompt;
window.addEventListener('beforeinstallprompt',event => {event.preventDefault();installPrompt=event;$('#install').hidden=false;});
$('#install').onclick = async () => { if(installPrompt) { await installPrompt.prompt(); installPrompt=null; $('#install').hidden=true; } };
if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>toast('La app abrió, pero no se pudo activar el modo sin conexión.'));
load(); updateFilters(); renderLibrary(); renderStrings(); renderRoute(location.hash.slice(1));
