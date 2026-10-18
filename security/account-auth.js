// Account security v1.0.0. Supabase Auth owns passwords; profiles are scoped by auth.uid().
const GUEST_KEY = 'wordyssey_guest_progress_v1';
const LEGACY_BACKUP_KEY = 'wordyssey_legacy_progress_v1';
let authClient = null;
let accountEpoch = 0;
let authMode = 'login';
let authBusy = false;
let accountNotice = '';
let importBusy = false;
function safeText(value){return String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function accountStorageKey(){return ACCOUNT?.userId ? `wordyssey_user_${ACCOUNT.userId}` : GUEST_KEY;}
function readProgressKey(key){try{const p=JSON.parse(localStorage.getItem(key));return p && typeof p==='object' && !Array.isArray(p) ? p : null;}catch{return null;}}
function preserveLegacyProgress(){
  const raw=localStorage.getItem('wordyssey');
  if(raw && !localStorage.getItem(LEGACY_BACKUP_KEY) && !localStorage.getItem('wordyssey_auth_migrated_v1')) localStorage.setItem(LEGACY_BACKUP_KEY,raw);
  const old=localStorage.getItem(ACCOUNT_KEY);
  if(old && !localStorage.getItem('wordyssey_legacy_account_v1')) localStorage.setItem('wordyssey_legacy_account_v1',old);
  if(!localStorage.getItem(GUEST_KEY))localStorage.setItem(GUEST_KEY,JSON.stringify(S));
  localStorage.setItem('wordyssey_auth_migrated_v1','1');
}
function paintAccount(){renderAccountBox();renderHomeAccountBox();}
function switchAuthMode(mode){authMode=mode;accountNotice='';paintAccount();}
function cloudHeaders(extra={}){
  // Public library requests never need an account or a private token.
  return Object.assign({apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`,'Content-Type':'application/json'},extra);
}
function cloudUrl(params=''){return `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}${params}`;}
function cloudTableUrl(table,params=''){return `${SUPABASE_URL}/rest/v1/${table}${params}`;}
async function progressHeaders(userId){
  if(!authClient)throw new Error('Inicia sesión para sincronizar.');
  const {data,error}=await authClient.auth.getSession();
  if(error || !data.session || data.session.user.id!==userId)throw new Error('La sesión terminó. Inicia sesión de nuevo.');
  return cloudHeaders({Authorization:`Bearer ${data.session.access_token}`});
}
async function clearAccount(){
  if(authBusy)return;
  authBusy=true;
  try{
    await cloudSaveNow(true);
    const {error}=await authClient.auth.signOut({scope:'local'});
    if(error)throw error;
    await acceptAuthSession(null);
    go('scr-home');
  }catch{accountNotice='No se pudo cerrar la sesión. Intenta de nuevo.';paintAccount();}
  finally{authBusy=false;}
}
async function cloudFetchProfile(userId){
  const headers=await progressHeaders(userId);
  const res=await fetch(cloudUrl(`?user_id=eq.${encodeURIComponent(userId)}&select=profile_key,display_name,progress,updated_at&limit=1`),{headers});
  if(!res.ok)throw new Error('No se pudo leer el avance.');
  return (await res.json())[0]||null;
}
async function cloudSaveNow(silent=false){
  if(!ACCOUNT?.userId || syncBusy)return false;
  const userId=ACCOUNT.userId,epoch=accountEpoch;
  const snapshot=structuredClone(S);
  syncBusy=true;
  try{
    const headers=await progressHeaders(userId);
    if(epoch!==accountEpoch)return false;
    const res=await fetch(cloudUrl('?on_conflict=profile_key'),{method:'POST',headers:Object.assign(headers,{Prefer:'resolution=merge-duplicates'}),body:JSON.stringify({profile_key:userId,user_id:userId,display_name:ACCOUNT.email,progress:snapshot,updated_at:new Date().toISOString()})});
    if(!res.ok)throw new Error('No se pudo guardar el avance.');
    if(epoch!==accountEpoch)return false;
    syncStatus='Avance guardado en tu cuenta.';
    if(!silent)toast('Avance guardado ☁️');
    return true;
  }catch{
    if(epoch===accountEpoch){syncStatus='Tu avance está guardado en este navegador. No se pudo sincronizar; intenta de nuevo.';if(!silent)toast('No se pudo sincronizar.');}
    return false;
  }finally{syncBusy=false;paintAccount();}
}
function scheduleCloudSave(){if(!ACCOUNT?.userId)return;clearTimeout(syncTimer);const epoch=accountEpoch;syncTimer=setTimeout(()=>{if(epoch===accountEpoch)cloudSaveNow(true);},900);}
async function connectProfile(){
  if(authBusy || !authClient)return;
  const email=document.getElementById('profile-email-input')?.value.trim()||'';
  const password=document.getElementById('profile-password-input')?.value||'';
  const form=document.getElementById('profile-auth-form');
  if(!form?.reportValidity())return;
  if(authMode==='signup' && password.length<10){accountNotice='Usa una contraseña de al menos 10 caracteres.';paintAccount();return;}
  authBusy=true;accountNotice='Conectando...';const mode=authMode;
  const pass=document.getElementById('profile-password-input');if(pass)pass.value='';
  paintAccount();
  try{
    if(mode==='signup'){
      const settings=await fetch(`${SUPABASE_URL}/auth/v1/settings`,{headers:{apikey:SUPABASE_ANON_KEY}});
      if(!settings.ok)throw new Error('No se pudo comprobar el registro. Intenta de nuevo.');
      if(!(await settings.json()).mailer_autoconfirm)throw new Error('El registro está temporalmente pendiente de habilitación. Puedes practicar sin cuenta.');
    }
    const result=mode==='signup' ? await authClient.auth.signUp({email,password}) : await authClient.auth.signInWithPassword({email,password});
    if(result.error)throw new Error(mode==='login'?'No se pudo iniciar sesión. Revisa tus datos o intenta más tarde.':'No se pudo crear la cuenta. Intenta iniciar sesión si ya tienes una.');
    if(!result.data.session)throw new Error('No se pudo abrir la sesión. Puedes continuar practicando sin cuenta.');
    await acceptAuthSession(result.data.session);
    accountNotice='';go('scr-profile');
  }catch(e){accountNotice=e.message;paintAccount();}
  finally{authBusy=false;paintAccount();}
}
async function syncProfileNow(){
  if(!ACCOUNT?.userId){accountNotice='Inicia sesión para sincronizar.';paintAccount();return;}
  const epoch=accountEpoch,userId=ACCOUNT.userId;
  try{
    const remote=await cloudFetchProfile(userId);
    if(epoch!==accountEpoch)return;
    if(remote?.progress)S=mergeProgress(S,remote.progress);
    save(false);renderHome();renderProfile();
    await cloudSaveNow(true);
  }catch{if(epoch===accountEpoch){syncStatus='No se pudo sincronizar. El avance local se conserva.';paintAccount();}}
}
async function acceptAuthSession(session){
  const nextId=session?.user?.id||null;
  if(nextId && ACCOUNT?.userId===nextId){ACCOUNT.email=session.user.email||ACCOUNT.email;return;}
  if(!nextId && !ACCOUNT)return;
  clearTimeout(syncTimer);accountEpoch++;
  localStorage.setItem(accountStorageKey(),JSON.stringify(S));
  ACCOUNT=nextId?{userId:nextId,profileKey:nextId,email:session.user.email||'',displayName:session.user.email||''}:null;
  S=Object.assign(structuredClone(DEFAULT),readProgressKey(accountStorageKey())||{});
  save(false);syncStatus=ACCOUNT?'Conectado. Recuperando tu avance...':'Práctica sin cuenta: avance solo en este navegador.';
  renderHome();renderProfile();
  if(ACCOUNT)await syncProfileNow();
}
async function importLocalProgress(){
  if(!ACCOUNT || importBusy)return;
  const snapshot=readProgressKey(LEGACY_BACKUP_KEY)||readProgressKey(GUEST_KEY);
  if(!snapshot){toast('No hay un avance anterior en este navegador.');return;}
  if(!confirm('¿Este es tu avance anterior de este navegador? Se combinará con tu cuenta actual.'))return;
  importBusy=true;
  try{S=mergeProgress(S,snapshot);save(false);renderHome();renderProfile();await cloudSaveNow(false);}
  finally{importBusy=false;}
}
function renderAccountBox(){
  const el=document.getElementById('profile-account');if(!el)return;
  if(ACCOUNT){
    const hasLocal=!!(readProgressKey(LEGACY_BACKUP_KEY)||readProgressKey(GUEST_KEY));
    el.innerHTML=`<div class="sync-card"><label>☁️ Tu cuenta de Bruno</label><div class="statrow"><span>${safeText(ACCOUNT.email)}</span><b>Sesión iniciada</b></div><div class="sync-actions"><button class="btn btn-mint" onclick="syncProfileNow()">Sincronizar</button><button class="btn btn-coral" onclick="go('scr-home')">Ir a práctica</button><button class="btn btn-ghost" onclick="clearAccount()">Cerrar sesión</button></div><p class="sync-note">${safeText(syncStatus)}</p>${hasLocal?'<button class="btn btn-ghost" onclick="importLocalProgress()">Importar mi avance de este navegador</button><p class="sync-note">Importa solo si ese avance te pertenece. Los perfiles antiguos no se asignan por coincidencia de correo.</p>':''}<p class="sync-note">${safeText(accountNotice)}</p></div>`;
  }else{
    const signup=authMode==='signup';
    el.innerHTML=`<div class="sync-card"><label>☁️ ${signup?'Crear cuenta':'Iniciar sesión'}</label><p class="sync-note">Guarda tu avance y continúa en otro dispositivo. También puedes practicar sin cuenta.</p><form id="profile-auth-form" onsubmit="event.preventDefault();connectProfile()"><input class="sync-input" id="profile-email-input" type="email" placeholder="Correo electrónico" autocomplete="username" maxlength="254" required><input class="sync-input" id="profile-password-input" type="password" placeholder="${signup?'Contraseña: mínimo 10 caracteres':'Contraseña'}" autocomplete="${signup?'new-password':'current-password'}" minlength="${signup?'10':'1'}" maxlength="128" required><div class="sync-actions"><button class="btn btn-mint" type="submit" ${authBusy?'disabled':''}>${signup?'Crear cuenta':'Iniciar sesión'}</button><button class="btn btn-ghost" type="button" onclick="switchAuthMode('${signup?'login':'signup'}')">${signup?'Ya tengo cuenta':'Crear cuenta nueva'}</button></div></form><button class="btn btn-ghost" onclick="go('scr-home')">Practicar sin cuenta</button><p class="sync-note" role="status">${safeText(accountNotice)}</p><p class="sync-note">El avance de los perfiles anteriores se conserva. Si sigue en este navegador, puedes importarlo después de iniciar sesión. Nunca compartas tu contraseña.</p></div>`;
  }
  renderHomeAccountBox();
}
function renderHomeAccountBox(){
  const el=document.getElementById('home-account');if(!el)return;
  el.innerHTML=ACCOUNT?`<div class="sync-card"><label>☁️ Avance en tu cuenta</label><p class="sync-note">${safeText(ACCOUNT.email)} · ${safeText(syncStatus)}</p><button class="btn btn-mint" onclick="go('scr-profile')">Ver cuenta</button></div>`:`<div class="sync-card"><label>Practica a tu ritmo</label><p class="sync-note">Sin cuenta, tu avance queda solo en este navegador. Con correo y contraseña puedes guardarlo en la nube.</p><div class="sync-actions"><button class="btn btn-mint" onclick="go('scr-profile')">Guardar mi avance</button><button class="btn btn-ghost" onclick="go('scr-world')">Practicar sin cuenta</button></div></div>`;
}
async function initializeSecureAccount(){
  preserveLegacyProgress();
  if(!window.supabase){accountNotice='No se pudo cargar el acceso a cuentas. Puedes practicar sin cuenta.';paintAccount();return;}
  authClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'wordyssey_secure_session_v1'}});
  const {data,error}=await authClient.auth.getSession();
  if(!error && data.session)await acceptAuthSession(data.session);
  authClient.auth.onAuthStateChange((event,session)=>{
    // Do not await Auth calls inside the SDK callback.
    if(event==='SIGNED_OUT')setTimeout(()=>acceptAuthSession(null),0);
    else if(event==='SIGNED_IN' && !authBusy)setTimeout(()=>acceptAuthSession(session),0);
  });
  paintAccount();
}
