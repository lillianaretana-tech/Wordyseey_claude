from pathlib import Path
import re,base64
p=Path(__file__).resolve().parent.parent
for file in ['index.html','app/index.html']:
 s=(p/file).read_text(encoding='utf-8-sig')
 m=re.search(r'var D="([^"]+)"',s)
 d=base64.b64decode(m.group(1)).decode('utf-8-sig')
 if 'const GUEST_KEY' in d:raise RuntimeError('Already patched')
 d=d.replace('let ACCOUNT = loadAccount();','let ACCOUNT = null;')
 # A signed-in account's previous state must never become the next visitor's guest state.
 d=d.replace("const raw = localStorage.getItem('wordyssey');","const raw = localStorage.getItem('wordyssey_guest_progress_v1') || (!localStorage.getItem('wordyssey_auth_migrated_v1') ? localStorage.getItem('wordyssey') : null);",1)
 d=d.replace("localStorage.setItem('wordyssey', JSON.stringify(S));","localStorage.setItem('wordyssey', JSON.stringify(S));\n  localStorage.setItem(accountStorageKey(), JSON.stringify(S));",1)
 # Keep the established merge rules, replace only account access and UI.
 start=d.index('function loadAccount(){');end=d.index('function mergeReviewStats(',start)
 merge_start=end;merge_end=d.index('async function cloudFetchProfile(',merge_start)
 merge=d[merge_start:merge_end]
 tail=d.index('function todayStr(',merge_end)
 if tail<0:raise RuntimeError('Cannot locate end of account functions')
 patch=(p/'security/account-auth.js').read_text()
 d=d[:start]+patch+'\n'+merge+d[tail:]
 d=d.replace('if(ACCOUNT) syncProfileNow();','initializeSecureAccount();')
 # SDK is loaded before the protected application script.
 s=s[:m.start(1)]+base64.b64encode(d.encode()).decode()+s[m.end(1):]
 marker='<script>\n/* Wordyssey'
 idx=s.find(marker)
 if idx<0:raise RuntimeError('Cannot locate script')
 s=s[:idx]+'<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.102.0/dist/umd/supabase.js"></script>\n'+s[idx:]
 s=s.replace('</title>','</title>\n<meta name="wordyssey-account-version" content="1.0.0">',1)
 # Discreet visible version in the profile screen, no redesign.
 s=s.replace('id="profile-account"></div>','id="profile-account"></div><small style="opacity:.5;font-size:.65rem">Acceso v1.0.0</small>',1)
 (p/file).write_text(s)
 (p/'security'/('check-'+file.replace('/','-')+'.js')).write_text(d)
 print('Patched',file)
