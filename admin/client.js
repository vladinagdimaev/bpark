import {createAuthClient} from '@neon/auth';
const $=s=>document.querySelector(s);let auth,current=null,version=0,dirty=false;const names=['מתקני הכושר','בין צמרות','משחק לפעוטות','מצללת מטפסים','רחבת נורדאו','המעיין הפועם','אזור נדנדות','דק הפרלמנט','שביל נגיש','פרגולות הזית והחורשה','חצר כלבים'];
const note=s=>{$('#message').textContent=s};
async function api(path,options={}){const jwt=await auth.token();if(jwt.error||!jwt.data?.token)throw new Error('ההתחברות פגה. התחברו מחדש.');const headers={...options.headers,Authorization:'Bearer '+jwt.data.token};const res=await fetch('/api/'+path,{...options,headers});const data=await res.json();if(!res.ok)throw new Error(data.error||'הפעולה נכשלה');return data}
const value=n=>{const field=document.querySelector(`[name="${n}"]`);if(!field)throw new Error('הטופס לא נטען במלואו. יש לשמור את המידע במקום אחר ולרענן את הדף.');return field.value};
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function fields(){ $('#areas').innerHTML=names.map((name,i)=>`<fieldset><legend>${i+1}. ${name}</legend><label>מצב<select name="area_${i+1}_status"><option value="not_checked">לא נבדק</option><option value="not_started">טרם החלו</option><option value="in_progress">בתהליך</option><option value="completed">הושלם</option><option value="other">אחר</option></select></label><label>מה השתנה מהביקור הקודם?<textarea name="area_${i+1}_change"></textarea></label><label>מה ראינו? (עובדה)<textarea name="area_${i+1}_observation"></textarea></label><label>התרשמות<textarea name="area_${i+1}_interpretation"></textarea></label><label>שאלה להמשך בירור<textarea name="area_${i+1}_question"></textarea></label><label>צילום מהשטח<input type="file" name="area_${i+1}_photo" accept="image/jpeg,image/png,image/webp"></label><label>תיאור הצילום<input name="area_${i+1}_caption" maxlength="500"></label><label>מועד הצילום<input type="datetime-local" name="area_${i+1}_photo_date"></label><button type="button" data-area="${i+1}">העלאת צילום לאזור</button><div id="photos_${i+1}" class="photos"></div></fieldset>`).join('')}
async function list(){const reports=await api('reports');$('#list').innerHTML=reports.length?reports.map(r=>`<button type="button" class="report-link" data-id="${r.id}">${escape(r.title)} · ${escape(new Date(r.visit_at).toLocaleDateString('he-IL'))} · ${escape(({draft:'טיוטה',in_review:'ממתין לאישור',approved:'אושר',published:'פורסם'})[r.status]||r.status)}</button>`).join(''):'אין עדיין דו״חות.'}
async function load(id){const d=await api('reports/'+id);current=id;version=d.report.version;$('#report-state').textContent='מצב: '+({draft:'טיוטה',in_review:'ממתין לאישור',approved:'אושר',published:'פורסם'}[d.report.status]||d.report.status);$('#submit-review').hidden=d.report.status!=='draft';$('#approve').hidden=d.report.status!=='in_review';const publish = $('#publish');
const approved = d.report.status === 'approved';
publish.disabled = !approved;
$('#publish-help').textContent = approved ? 'רכז יכול לפרסם את הדו״ח המאושר.' : d.report.status === 'published' ? 'הדו״ח כבר פורסם.' : 'הפרסום זמין לרכז אחרי שני אישורים, שאחד מהם של רכז.';$('#return-draft').hidden=!(['in_review','approved'].includes(d.report.status)&&!d.report.publication_requested_at);$('#editor').hidden=false;$('#list-area').hidden=true;$('#title').value=d.report.title;$('#visit_at').value=new Date(new Date(d.report.visit_at).getTime()-new Date(d.report.visit_at).getTimezoneOffset()*60000).toISOString().slice(0,16);$('#participants').value=d.report.participants;$('#summary').value=d.report.summary;$('#next_visit_focus').value=d.report.next_visit_focus;fields();for(const a of d.areas){for(const [name,val] of Object.entries({status:a.work_status,change:a.change_since_previous,observation:a.observation,interpretation:a.interpretation,question:a.question}))document.querySelector(`[name="area_${a.area_id}_${name}"]`).value=val||''}for(const n of d.notes){const el=document.querySelector(`[name="notes_${n.topic}"]`);if(el)el.value=n.content}for(const p of d.photos){const target=$(`#photos_${p.area_id}`);if(target){const l=document.createElement('p');l.textContent='צילום שמור: '+(p.caption||'ללא תיאור');target.append(l);try{const t=await auth.token();const response=await fetch(`/api/reports/${id}/photos/${p.id}`,{headers:{Authorization:'Bearer '+t.data.token}});if(response.ok){const img=document.createElement('img');img.src=URL.createObjectURL(await response.blob());img.alt=p.caption||'צילום שמור';img.style.cssText='max-width:180px;max-height:140px;display:block';target.append(img)}}catch{}}}const editable=d.report.status==='draft';document.querySelectorAll('#report-form input,#report-form textarea,#report-form select,#report-form button,button[form=report-form]').forEach(el=>{el.disabled=!editable});dirty=false;note(editable?'טיוטה נטענה. יש לשמור שינויים לפני שליחה לאישור.':'הדו״ח נעול לעריכה במצבו הנוכחי.');}
$('#login-form').addEventListener('submit',async e=>{e.preventDefault();note('מתחברים…');try{const {error}=await auth.signIn.email({email:value('email'),password:value('password')});if(error)throw new Error(error.message||'ההתחברות נכשלה');const me=await api('me');$('#login').hidden=true;$('#list-area').hidden=false;$('#who').textContent=me.display_name;await list();note('התחברתם בהצלחה.')}catch(err){note(err.message)}});
$('#register').onclick=async()=>{try{const email=value('email'),password=value('password');if(!email||!password)throw new Error('הזינו דוא״ל וסיסמה.');const {error}=await auth.signUp.email({email,password,name:email.split('@')[0]});if(error)throw new Error(error.message||'יצירת החשבון נכשלה');$('#verify-form').hidden=false;note('נשלח קוד אימות לדוא״ל. לאחר האימות יש לבקש מרכז המערכת להפעיל את החשבון.')}catch(e){note(e.message)}};
$('#resend-verification').onclick=async()=>{const button=$('#resend-verification');try{const emailField=document.querySelector('[name="email"]');const email=emailField.value.trim();if(!email||!emailField.validity.valid){emailField.focus();throw new Error('יש להזין כתובת דוא״ל תקינה.')}button.disabled=true;note('שולחים קוד אימות…');const {error}=await auth.emailOtp.sendVerificationOtp({email,type:'email-verification'});if(error)throw new Error('לא ניתן לשלוח קוד כעת. בדקו את הכתובת ונסו שוב מאוחר יותר.');$('#verify-form').hidden=false;note('אם הכתובת ממתינה לאימות, יישלח אליה קוד. הזינו את הקוד בטופס שמתחת.')}catch(e){note(e.message)}finally{button.disabled=false}};
$('#verify-form').onsubmit=async e=>{e.preventDefault();try{const {error}=await auth.emailOtp.verifyEmail({email:value('email'),otp:value('otp')});if(error)throw new Error(error.message||'אימות הדוא״ל נכשל.');$('#verify-form').hidden=true;note('הדוא״ל אומת. יש לבקש מרכז המערכת להפעיל את החשבון.')}catch(err){note(err.message)}};
$('#create').onclick=async()=>{try{const date=new Date();const r=await api('reports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'דו״ח סיור חדש',visit_at:date.toISOString()})});await load(r.id)}catch(e){note(e.message)}};
$('#list').onclick=async e=>{const id=e.target.dataset.id;if(id)try{await load(id)}catch(err){note(err.message)}};
$('#report-form').addEventListener('input',()=>{dirty=true});
$('#submit-review').onclick=async()=>{try{if(dirty)throw new Error('יש לשמור את כל השינויים לפני שליחה לאישור.');await api('reports/'+current+'/submit',{method:'POST'});await load(current);note('הדו״ח נשלח לאישור. עריכה נוספת אינה זמינה בשלב זה.')}catch(e){note(e.message)}};
$('#approve').onclick=async()=>{try{const r=await api('reports/'+current+'/approve',{method:'POST'});await load(current);note(`נרשם אישור. מספר מאשרים: ${r.volunteers+r.coordinators}/2; מהם רכזים: ${r.coordinators}.`)}catch(e){note(e.message)}};
$('#return-draft').onclick=async()=>{if(!confirm('להחזיר את הדו״ח לעריכה? האישורים הקיימים יתבטלו.'))return;try{await api('reports/'+current+'/return-to-draft',{method:'POST'});await load(current);note('הדו״ח הוחזר לעריכה והאישורים בוטלו.')}catch(e){note(e.message)}};
$('#publish').onclick=async()=>{try{const result=await api('reports/'+current+'/publish',{method:'POST'});note(result.message)}catch(e){note(e.message)}};
$('#back').onclick=async()=>{if(dirty&&!confirm('יש שינויים שלא נשמרו. לחזור לרשימה?'))return;$('#editor').hidden=true;$('#list-area').hidden=false;await list();note('')};
$('#report-form').onsubmit=async e=>{e.preventDefault();try{note('שומרים…');const areas=names.map((_,i)=>({area_id:i+1,work_status:value(`area_${i+1}_status`),change:value(`area_${i+1}_change`),observation:value(`area_${i+1}_observation`),interpretation:value(`area_${i+1}_interpretation`),question:value(`area_${i+1}_question`)}));const notes={};for(const k of ['entrances','accessibility_transport','infrastructure','summary'])notes[k]=value('notes_'+k);const result=await api('reports/'+current,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({version,title:value('title'),visit_at:new Date(value('visit_at')).toISOString(),participants:value('participants'),summary:value('summary'),next_visit_focus:value('next_visit_focus'),areas,notes})});version=result.version;dirty=false;note('הטיוטה נשמרה.')}catch(err){note(err.message)}};
$('#areas').onclick=async e=>{const area=e.target.dataset.area;if(!area)return;const f=document.querySelector(`[name="area_${area}_photo"]`).files[0];if(!f){note('בחרו תמונה תחילה.');return}try{note('מעלים תמונה…');const body=new FormData();body.set('photo',f);body.set('caption',value(`area_${area}_caption`));const date=value(`area_${area}_photo_date`);if(date)body.set('photographed_at',new Date(date).toISOString());const res=await api(`reports/${current}/photos?area=${area}`,{method:'POST',body});const p=document.createElement('p');p.textContent='צילום נשמר';$(`#photos_${area}`).append(p);note('התמונה נשמרה.')}catch(err){note(err.message)}};
$('#logout').onclick=async()=>{await auth.signOut();location.reload()};
(async()=>{try{const c=await(await fetch('/config')).json();auth=createAuthClient(c.authUrl);const me=await api('me');$('#login').hidden=true;$('#list-area').hidden=false;$('#who').textContent=me.display_name;await list()}catch{note('יש להתחבר עם חשבון מורשה.')}})();


let resetEmail;
$('#request-reset').onclick = async event => {
  const email = document.querySelector('[name=email]');
  if (!email.reportValidity()) return;
  const button = event.currentTarget;
  button.disabled = true;
  try {
    const address = email.value.trim();
    const {error} = await auth.emailOtp.sendVerificationOtp({email:address,type:'forget-password'});
    if (error) throw error;
    resetEmail = address;
    $('#reset-form').reset();
    $('#reset-form').hidden = false;
    $('#reset-form [name=reset-code]').focus();
    note('אם קיים חשבון בכתובת הזו, יישלח אליו קוד לאיפוס הסיסמה.');
  } catch {
    note('לא ניתן לשלוח קוד איפוס כרגע. נסו שוב בעוד כמה דקות.');
  } finally { button.disabled = false; }
};
$('#reset-form').onsubmit = async event => {
  event.preventDefault();
  if (!resetEmail) return;
  const form = event.currentTarget;
  const button = form.querySelector('button');
  button.disabled = true;
  try {
    const {error} = await auth.emailOtp.resetPassword({email:resetEmail,otp:value('reset-code').trim(),password:value('new-password')});
    if (error) throw error;
    form.reset();
    form.hidden = true;
    resetEmail = undefined;
    document.querySelector('[name=password]').value = '';
    document.querySelector('[name=password]').focus();
    note('הסיסמה עודכנה. אפשר להתחבר עם הסיסמה החדשה.');
  } catch {
    note('האיפוס לא הושלם. בדקו את הקוד והסיסמה, או בקשו קוד חדש.');
  } finally { button.disabled = false; }
};
