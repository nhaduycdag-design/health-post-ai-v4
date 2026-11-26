'use strict';
// V4 experimental: isolated localStorage key, no V3 Firebase or Calendar credentials.
const $=id=>document.getElementById(id), KEY='health-post-ai-v4-experiment-topics',MAX=1000;
const labels={pending:'Chờ duyệt',approved:'Đã duyệt',posted:'Đã đăng',rejected:'Từ chối'};
let multi=false, picked=new Set(), busy=false, activeTab='home';
let topics=load(),selected=null,weekStart=startWeek(new Date());
const firebaseConfig=window.HEALTH_POST_V4_FIREBASE_CONFIG;
const calendarClientId=window.HEALTH_POST_V4_CALENDAR_CLIENT_ID||'';
let cloud=null,authUser=null,unsub=null,calendarToken='',calendarExpiry=0;
let mode='local',writing=false,cloudReady=false;
function cloudEnabled(){return mode==='cloud'&&!!authUser&&!!cloudReady}
function syncLabel(s){$('syncState').textContent=s}

function load(){try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v.filter(valid).slice(0,MAX):[]}catch{return []}}
function valid(t){return t&&typeof t.id==='string'&&typeof t.title==='string'&&t.title.length<=160&&t.fb&&t.tt&&typeof t.fb.body==='string'&&typeof t.tt.body==='string'}
function persist(){
 if(mode==='cloud'){
  if(!cloudEnabled()){toast('Đăng nhập Google V4 trước khi lưu');return Promise.resolve(false)}
  // Save is serialized in the cloud. Avoid overwriting concurrent updates to other topics.
  return Promise.all(topics.filter(t=>t._dirty).map(async t=>{const clean={...t};delete clean._dirty;await cloud.setDoc(cloud.doc(cloud.db,'v4_users',authUser.uid,'topics',t.id),clean);delete t._dirty})).then(()=>{render();return true});
 }
 localStorage.setItem(KEY,JSON.stringify(topics));render();return Promise.resolve(true)
}
function toast(s){const x=$('toast');x.textContent=s;x.style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>x.style.display='none',4500)}
function pad(n){return String(n).padStart(2,'0')}
function dateStr(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function dateTime(d){return dateStr(d)+'T'+pad(d.getHours())+':'+pad(d.getMinutes())}
function plusDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function startWeek(d){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-(x.getDay()+6)%7);return x}
function emptyPlatform(){return {title:'',body:'',at:'',status:'pending',calendarId:''}}
function newTopic(){return {id:crypto.randomUUID(),title:'',category:'Dinh dưỡng',facts:'',sources:'',checkedAt:'',fb:emptyPlatform(),tt:emptyPlatform(),updatedAt:new Date().toISOString()}}
function platformFromForm(prefix){const p={title:$(prefix+'Title').value.trim(),body:$(prefix+'Body').value.trim(),at:$(prefix+'At').value,status:$(prefix+'Status').value,calendarId:topics.find(t=>t.id===selected)?.[prefix]?.calendarId||''};return p}
function fillPlatform(prefix,p){for(const [suffix,val] of [['Title',p.title],['Body',p.body],['At',p.at],['Status',p.status]])$(prefix+suffix).value=val??''}
function collect(){const old=topics.find(t=>t.id===selected);return {id:old?.id||crypto.randomUUID(),title:$('topicTitle').value.trim(),category:$('category').value,facts:$('facts').value.trim(),sources:$('sources').value.trim(),checkedAt:$('checkedAt').value,fb:platformFromForm('fb'),tt:platformFromForm('tt'),updatedAt:new Date().toISOString()}}
function reset(){selected=null;$('draftBtn').hidden=false;$('topicForm').reset();$('checkedAt').value=dateStr(new Date());fillPlatform('fb',emptyPlatform());fillPlatform('tt',emptyPlatform());$('editorHeading').textContent='Tạo chủ đề sức khỏe';renderList()}
function choose(id){showTab('editor');const t=topics.find(x=>x.id===id);if(!t)return;selected=id;$('draftBtn').hidden=true;$('topicTitle').value=t.title;$('category').value=t.category;$('facts').value=t.facts||'';$('sources').value=t.sources||'';$('checkedAt').value=t.checkedAt||'';fillPlatform('fb',t.fb);fillPlatform('tt',t.tt);$('editorHeading').textContent='Chỉnh sửa chủ đề';renderList();window.scrollTo({top:0,behavior:'smooth'})}
async function save(){if(mode==='cloud'&&!cloudEnabled())return toast('Đăng nhập Google V4 để lưu');const t=collect();if(!t.title){toast('Hãy nhập tên chủ đề');$('topicTitle').focus();return false}if(!t.fb.body.trim()&&!t.tt.body.trim()){toast('Hãy nhập ít nhất một nội dung');return false}if((t.fb.status==='approved'||t.tt.status==='approved')&&(!t.sources||!t.checkedAt)){toast('Trước khi duyệt, hãy nhập nguồn tham khảo và ngày kiểm chứng');return false}for(const p of [t.fb,t.tt]){if(p.status==='approved'&&!p.body){toast('Không thể duyệt bài chưa có nội dung');return false}if(p.status==='posted'&&!p.body){toast('Bài đã đăng phải có nội dung');return false}if(p.at&&!Number.isFinite(new Date(p.at).getTime())){toast('Giờ đăng không hợp lệ');return false}}const i=topics.findIndex(x=>x.id===t.id);if(i<0){if(topics.length>=MAX){toast('Đã đạt giới hạn chủ đề');return false}topics.push(t)}else topics[i]=t;selected=t.id;$('draftBtn').hidden=true;t._dirty=true;try{await persist();toast(mode==='cloud'?'Đã lưu lên Firebase V4':'Đã lưu V4 trên thiết bị này');return true}catch(e){toast('Lỗi lưu: '+e.message);return false}}
function render(){const platforms=topics.flatMap(t=>[t.fb,t.tt]);$('stats').replaceChildren();for(const [name,n] of [['Chủ đề',topics.length],['Bài chờ duyệt',platforms.filter(p=>p.body&&p.status==='pending').length],['Bài đã duyệt',platforms.filter(p=>p.body&&p.status==='approved').length],['Bài đã đăng',platforms.filter(p=>p.body&&p.status==='posted').length]]){const d=document.createElement('div');d.className='stat';const s=document.createElement('strong');s.textContent=n;const l=document.createElement('small');l.textContent=name;d.append(s,l);$('stats').append(d)}renderList();renderWeek();renderDue()}
function earliest(t){return [t.fb.at,t.tt.at].filter(Boolean).sort()[0]||'9999'}
function visibleTopics(){const q=$('search').value.trim().toLocaleLowerCase('vi'), f=$('statusFilter').value;return topics.filter(t=>t.title.toLocaleLowerCase('vi').includes(q)&&(!f||[t.fb,t.tt].some(p=>p.status===f))).sort((a,b)=>earliest(a).localeCompare(earliest(b))||a.title.localeCompare(b.title,'vi'))}
function button(text,fn,cls='secondary'){const b=document.createElement('button');b.type='button';b.textContent=text;b.className=cls;b.onclick=fn;return b}
function renderList(){const a=visibleTopics(),el=$('topicList');$('topicCount').textContent=a.length+' chủ đề';el.replaceChildren();$('bulkBar').hidden=!multi;$('multiBtn').textContent=multi?'Hủy chọn':'Chọn nhiều';$('selectAll').checked=!!a.length&&a.every(t=>picked.has(t.id));$('bulkDelete').textContent='Xóa '+picked.size+' chủ đề';$('bulkDelete').disabled=!picked.size||busy;for(const t of a){const box=document.createElement('div');box.className='topicentry';if(multi){const c=document.createElement('input');c.type='checkbox';c.checked=picked.has(t.id);c.setAttribute('aria-label','Chọn '+t.title);c.onchange=()=>{c.checked?picked.add(t.id):picked.delete(t.id);renderList()};box.append(c)}const title=button(t.title,()=>choose(t.id));title.className='topicTitle';box.append(title);for(const k of ['fb','tt']){const p=t[k],r=document.createElement('div');r.className='quickrow';const m=document.createElement('small');m.textContent=(k==='fb'?'Facebook':'TikTok')+' · '+(p.at||'Chưa đặt lịch').replace('T',' ')+' · '+labels[p.status];r.append(m);if(!multi&&p.status==='pending')r.append(button('Duyệt',()=>approve(t.id,[k])));box.append(r)}if(!multi&&[t.fb,t.tt].some(p=>p.status==='pending'))box.append(button('Duyệt cả hai',()=>approve(t.id,['fb','tt'])));el.append(box)}if(!a.length)el.textContent='Chưa có chủ đề phù hợp'}
async function approve(id,keys){if(busy||mode==='cloud'&&!cloudEnabled())return;const t=topics.find(x=>x.id===id);if(!t)return;keys=keys.filter(k=>t[k].status==='pending');if(!keys.length)return;if(!t.sources?.trim()||!t.checkedAt||keys.some(k=>!t[k].body.trim())){toast('Cần nội dung, nguồn và ngày kiểm chứng trước khi duyệt');choose(id);return}if(!confirm('Xác nhận đã kiểm tra nội dung và duyệt bài?'))return;busy=true;try{for(const k of keys)t[k].status='approved';t._dirty=true;await persist();if(selected===id)choose(id);toast('Đã duyệt. Mở chủ đề để đồng bộ Google Calendar.')}catch(e){toast('Lỗi lưu: '+e.message)}finally{busy=false;render()}}
function renderDue(){const el=$('dueList');el.replaceChildren();const now=Date.now(),end=new Date();end.setHours(23,59,59,999);const rows=topics.flatMap(t=>['fb','tt'].map(k=>({t,k,p:t[k]}))).filter(x=>x.p.at&&x.p.body&&['pending','approved'].includes(x.p.status)).sort((a,b)=>a.p.at.localeCompare(b.p.at));const due=rows.filter(x=>new Date(x.p.at)<=end);for(const {t,k,p} of (due.length?due:rows.slice(0,2))){const d=document.createElement('div');d.className='topicentry';const delta=new Date(p.at)-now;const h=document.createElement('strong');h.textContent=(delta<0?'Quá hạn':delta<=3600000?'Sắp đến hạn': 'Lịch tới')+' · '+p.at.replace('T',' ')+' · '+(k==='fb'?'Facebook':'TikTok')+' · '+t.title;d.append(h);const r=document.createElement('div');r.className='actions';r.append(button('Xem bài',()=>choose(t.id)));if(p.status==='approved'){r.append(button('Sao chép',async()=>{try{await navigator.clipboard.writeText(p.body);toast('Đã sao chép')}catch{prompt('Sao chép:',p.body)}}),button('Mở '+(k==='fb'?'Facebook':'TikTok'),()=>window.open(k==='fb'?'https://www.facebook.com/':'https://www.tiktok.com/','_blank','noopener,noreferrer')),button('Đã đăng',async()=>{if(busy||!confirm('Đã đăng bài này?'))return;const current=topics.find(x=>x.id===t.id);if(!current)return;current[k].status='posted';current._dirty=true;try{await persist()}catch(e){toast(e.message)}}))}else r.append(button('Duyệt',()=>approve(t.id,[k])));d.append(r);el.append(d)}if(!rows.length)el.textContent='Không có bài cần đăng'}
function showTab(tab){activeTab=tab;document.body.dataset.tab=tab;$('editorPanel').hidden=tab!=='editor';document.querySelectorAll('#mobileNav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));window.scrollTo(0,0)}
async function deleteMany(ids){if(busy||!ids.length||mode==='cloud'&&!cloudEnabled())return;if(!confirm('Xóa '+ids.length+' chủ đề và hai phiên bản? Nên sao lưu JSON trước.'))return;busy=true;const account=authUser?.uid, isCloud=cloudEnabled();let done=0;try{const targets=topics.filter(t=>ids.includes(t.id));const events=targets.flatMap(t=>[t.fb.calendarId,t.tt.calendarId]).filter(Boolean);let token='';if(events.length){try{token=await calendarAccess()}catch(e){toast('Chưa cấp quyền Calendar; chưa xóa dữ liệu.');return}}for(const t of targets){if(isCloud&&authUser?.uid!==account)throw Error('Tài khoản đã thay đổi');for(const id of [t.fb.calendarId,t.tt.calendarId].filter(Boolean)){try{await calendarApi('DELETE','/'+encodeURIComponent(id),token)}catch(e){if(!/HTTP (404|410)\b/.test(e.message))throw e}}if(isCloud)await cloud.deleteDoc(cloud.doc(cloud.db,'v4_users',account,'topics',t.id));topics=topics.filter(x=>x.id!==t.id);picked.delete(t.id);if(!isCloud)await persist();done++}if(ids.includes(selected)){reset();showTab('list')}toast('Đã xóa '+done+' chủ đề')}catch(e){toast('Đã xóa '+done+' chủ đề; dừng vì '+e.message)}finally{busy=false;render()}}
function renderWeek(){const end=plusDays(weekStart,6);$('weekLabel').textContent=dateStr(weekStart)+' đến '+dateStr(end);const el=$('week');el.replaceChildren();for(let i=0;i<7;i++){const d=plusDays(weekStart,i),key=dateStr(d),box=document.createElement('div');box.className='day';const h=document.createElement('strong');h.textContent=d.toLocaleDateString('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit'});box.append(h);for(const t of topics){for(const [pname,p] of [['Facebook',t.fb],['TikTok',t.tt]]){if(!p.at||p.at.slice(0,10)!==key)continue;const b=document.createElement('button');b.className='event'+(pname==='TikTok'?' tt':'');b.textContent=p.at.slice(11)+' · '+pname+' · '+t.title+' ('+labels[p.status]+')';b.onclick=()=>choose(t.id);box.append(b)}}el.append(box)}}
function download(name,text){const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000)}
async function copyPlatform(prefix){const body=$(prefix+'Body').value;if(!body)return toast('Chưa có nội dung');try{await navigator.clipboard.writeText(body);toast('Đã sao chép nội dung '+(prefix==='fb'?'Facebook':'TikTok'))}catch{window.prompt('Sao chép nội dung:',body)}}
function makeOutline(){if(selected!==null)return toast('Khung mẫu chỉ dùng khi tạo chủ đề mới');if(!$('topicTitle').value.trim())return toast('Nhập tên chủ đề trước');const title=$('topicTitle').value.trim();if($('fbBody').value||$('ttBody').value){if(!confirm('Thay nội dung đang soạn bằng khung mẫu?'))return} $('fbBody').value=`${title}\n\n[Mở đầu gần gũi]\n\n[Giải thích thông tin đã được kiểm chứng, có lưu ý về giới hạn áp dụng]\n\n[Gợi ý thực hành an toàn, không đưa lời khuyên điều trị cá nhân]\n\n[Nguồn tham khảo]\n\nBạn có thắc mắc gì về chủ đề này?`;$('ttBody').value=`${title.toLocaleUpperCase('vi')}\n\n[Ý chính 1 - ngắn gọn]\n[Ý chính 2 - dễ hiểu]\n[Lưu ý quan trọng]\n\nBạn đã biết điều này chưa?`;toast('Đã tạo khung để bạn tự biên tập và kiểm chứng')}
// CSV created by ChatGPT: V4 paired columns or legacy V3 publish_at/topic/title/body.
function parseCSV(text){text=text.replace(/^\uFEFF/,'');let rows=[],row=[],field='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++}else if(c==='"')quoted=false;else field+=c}else if(c==='"')quoted=true;else if(c===','){row.push(field);field=''}else if(c==='\n'){row.push(field);rows.push(row);row=[];field=''}else if(c!=='\r')field+=c}if(quoted)throw Error('CSV có dấu nháy chưa đóng');if(field||row.length){row.push(field);rows.push(row)}return rows}
function csvQuote(x){return '"'+String(x??'').replaceAll('"','""')+'"'}
function csvDownload(){const cols=['topic_title','category','facts','sources','checked_at','fb_title','fb_body','fb_publish_at','tt_title','tt_body','tt_publish_at'];const rows=[cols,['Uống nước trước khi ngủ','Giấc ngủ','Ví dụ minh họa, cần kiểm chứng trước khi duyệt','Nguồn tham khảo cần bổ sung',dateStr(new Date()),'Uống nước trước khi ngủ','[Bài Facebook do ChatGPT soạn]','2026-12-01 07:00','Uống nước trước khi ngủ','[Bài TikTok do ChatGPT soạn]','2026-12-01 19:00']];const blob=new Blob(['\uFEFF'+rows.map(r=>r.map(csvQuote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='health_post_ai_v4_mau_chatgpt.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000)}
function csvDate(raw){const v=String(raw||'').trim().replace(' ','T');if(!v)return '';if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v))throw Error('Ngày giờ sai định dạng: '+raw);const d=new Date(v);if(!Number.isFinite(d.getTime())||dateTime(d)!==v)throw Error('Ngày giờ không hợp lệ: '+raw);return v}
function fromCSVRow(r,legacy){const t=newTopic();if(legacy){t.title=r.title||'';t.category=['Dinh dưỡng','Thói quen sống khỏe','Giấc ngủ','Vận động','Khác'].includes(r.topic)?r.topic:'Khác';t.fb.title=r.title||'';t.fb.body=r.body||'';t.fb.at=csvDate(r.publish_at)}else{t.title=r.topic_title||'';t.category=['Dinh dưỡng','Thói quen sống khỏe','Giấc ngủ','Vận động','Khác'].includes(r.category)?r.category:'Khác';t.facts=r.facts||'';t.sources=r.sources||'';t.checkedAt=r.checked_at||'';t.fb.title=r.fb_title||t.title;t.fb.body=r.fb_body||'';t.fb.at=csvDate(r.fb_publish_at);t.tt.title=r.tt_title||t.title;t.tt.body=r.tt_body||'';t.tt.at=csvDate(r.tt_publish_at)}if(!t.title.trim()||(!t.fb.body.trim()&&!t.tt.body.trim()))throw Error('Thiếu chủ đề hoặc nội dung');if(t.title.length>160||t.fb.body.length>12000||t.tt.body.length>12000)throw Error('Nội dung vượt giới hạn');if(t.checkedAt&&!/^\d{4}-\d{2}-\d{2}$/.test(t.checkedAt))throw Error('Ngày kiểm chứng sai định dạng');return t}
async function importCSV(file){if(file.size>2e6)throw Error('CSV quá 2MB');const rows=parseCSV(await file.text());if(!rows.length)throw Error('CSV trống');const head=rows.shift().map(x=>x.trim().toLowerCase());const legacy=['publish_at','topic','title','body'].every(x=>head.includes(x));const modern=['topic_title','fb_body','tt_body'].every(x=>head.includes(x));if(!legacy&&!modern)throw Error('CSV thiếu cột. Hãy tải file CSV mẫu V4 hoặc dùng CSV V3');let added=[],skipped=0,issues=[];const signatures=new Set(topics.map(t=>[t.title.trim().toLocaleLowerCase('vi'),t.fb.body.trim(),t.tt.body.trim()].join('|')));for(let i=0;i<rows.length;i++){if(!rows[i].some(x=>x.trim()))continue;if(topics.length+added.length>=MAX){skipped++;issues.push('Đã đạt giới hạn 1000 chủ đề');continue}try{const r=Object.fromEntries(head.map((h,j)=>[h,(rows[i][j]||'').trim()]));const t=fromCSVRow(r,legacy);const sig=[t.title.trim().toLocaleLowerCase('vi'),t.fb.body.trim(),t.tt.body.trim()].join('|');if(signatures.has(sig)){skipped++;continue}signatures.add(sig);added.push(t)}catch(e){skipped++;if(issues.length<3)issues.push('Dòng '+(i+2)+': '+e.message)}}if(!added.length){toast('Không có bài mới. Bỏ qua '+skipped+' dòng. '+issues.join('; '));return}if(!confirm('Nhập '+added.length+' chủ đề ('+(legacy?'CSV V3 – chỉ có Facebook':'CSV V4 – Facebook và TikTok')+')? Tất cả bài mới ở trạng thái Chờ duyệt.'))return;topics.push(...added.map(t=>({...t,_dirty:true})));try{await persist();toast('Đã nhập '+added.length+' chủ đề, bỏ qua '+skipped+' dòng. '+issues.join('; '))}catch(e){toast('Lỗi lưu CSV: '+e.message)}}
$('csvSampleBtn').onclick=csvDownload;$('csvImportBtn').onclick=()=>$('csvImportFile').click();$('csvImportFile').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{await importCSV(file)}catch(err){toast('Lỗi nhập CSV: '+err.message)}};
$('topicForm').addEventListener('submit',e=>{e.preventDefault();save().catch(err=>toast(err.message))});$('saveAllBtn').onclick=()=>save().catch(err=>toast(err.message));$('newBtn').onclick=()=>{reset();showTab('editor')};$('draftBtn').onclick=makeOutline;$('search').oninput=renderList;$('fbCopy').onclick=()=>copyPlatform('fb');$('ttCopy').onclick=()=>copyPlatform('tt');$('fbOpen').onclick=()=>window.open('https://www.facebook.com/','_blank','noopener,noreferrer');$('ttOpen').onclick=()=>window.open('https://www.tiktok.com/','_blank','noopener,noreferrer');$('prevWeek').onclick=()=>{weekStart=plusDays(weekStart,-7);renderWeek()};$('nextWeek').onclick=()=>{weekStart=plusDays(weekStart,7);renderWeek()};$('deleteBtn').onclick=async()=>{if(mode==='cloud'&&!cloudEnabled())return toast('Hãy đăng nhập');if(!selected)return toast('Chưa chọn chủ đề');if(!confirm('Xóa chủ đề và cả hai phiên bản?'))return;const id=selected;try{if(cloudEnabled())await cloud.deleteDoc(cloud.doc(cloud.db,'v4_users',authUser.uid,'topics',id));topics=topics.filter(t=>t.id!==id);reset();if(mode==='local')persist();else render();toast('Đã xóa chủ đề V4. Lưu ý: sự kiện Calendar đã tạo cần xóa trong Google Calendar nếu không còn dùng.')}catch(e){toast('Không xóa được: '+e.message)}};$('backupBtn').onclick=()=>download('health-post-ai-v4-backup-'+dateStr(new Date())+'.json',JSON.stringify({version:4,exportedAt:new Date().toISOString(),topics},null,2));$('importBtn').onclick=()=>$('importFile').click();$('importFile').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;if(file.size>3e6)return toast('File quá lớn');try{const data=JSON.parse(await file.text());if(data.version!==4||!Array.isArray(data.topics)||data.topics.length>MAX||!data.topics.every(valid))throw Error('File sao lưu V4 không hợp lệ');if(!confirm('Nhập dữ liệu V4? Dữ liệu V4 hiện tại sẽ bị thay thế.'))return;if(mode==='cloud'){toast('Chỉ nhập JSON khi đang ở chế độ thiết bị; hãy đăng xuất V4 trước.');return}topics=data.topics;selected=null;reset();persist();toast('Đã nhập bản sao lưu V4')}catch(err){toast(err.message)}};reset();render();initFirebase();


// ---------- V4 FIREBASE: isolated project and per-user collection ----------
async function initFirebase(){
 if(!firebaseConfig?.apiKey||!firebaseConfig?.projectId||!firebaseConfig?.authDomain){syncLabel('Thiết bị · Chưa cấu hình Firebase V4');return}
 try{
  const [appM,authM,dbM]=await Promise.all([
   import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
   import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js'),
   import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js')]);
  const app=appM.initializeApp(firebaseConfig,'health-post-v4');
  const auth=authM.getAuth(app),db=dbM.getFirestore(app);
  cloud={auth,db,...authM,...dbM};
  $('loginBtn').hidden=false;
  $('loginBtn').onclick=async()=>{try{await authM.signInWithPopup(auth,new authM.GoogleAuthProvider())}catch(e){toast('Đăng nhập thất bại: '+e.message)}};
  $('logoutBtn').onclick=()=>authM.signOut(auth);
  $('migrateBtn').onclick=async()=>{
   if(!cloudEnabled())return toast('Hãy đăng nhập V4');
   const local=load();if(!local.length)return toast('Không có dữ liệu thiết bị để chép');
   if(!confirm('Chép '+local.length+' chủ đề từ thiết bị lên Firebase V4? Bài trùng ID sẽ bị ghi đè.'))return;
   try{for(const t of local){const clean={...t};delete clean._dirty;await cloud.setDoc(cloud.doc(cloud.db,'v4_users',authUser.uid,'topics',t.id),clean)}toast('Đã chép '+local.length+' chủ đề lên Firebase V4')}catch(e){toast('Lỗi chuyển dữ liệu: '+e.message)}
  };
  authM.onAuthStateChanged(auth,u=>{
   if(unsub){unsub();unsub=null}
   authUser=u;cloudReady=false;selected=null;reset();
   $('loginBtn').hidden=!!u;$('logoutBtn').hidden=!u;$('migrateBtn').hidden=!u;
   if(!u){mode='local';topics=load();syncLabel('Thiết bị · Đã đăng xuất Firebase V4');render();return}
   mode='cloud';topics=[];syncLabel('Đang tải dữ liệu Firebase V4…');render();
   unsub=dbM.onSnapshot(dbM.collection(db,'v4_users',u.uid,'topics'),snap=>{
    const dirty=topics.filter(t=>t._dirty);
    topics=snap.docs.map(d=>d.data()).filter(valid);
    for(const t of dirty)if(!topics.some(x=>x.id===t.id))topics.push(t);
    cloudReady=true;syncLabel('Firebase V4 · '+(u.email||'Đã đăng nhập'));render();
   },err=>{syncLabel('Lỗi Firestore V4');toast('Firestore: '+err.message)})
  });
 }catch(e){syncLabel('Firebase V4 chưa kết nối');toast('Lỗi cấu hình Firebase: '+e.message)}
}

// ---------- GOOGLE CALENDAR: separate OAuth client, manual synchronization ----------
async function calendarAccess(){
 if(!calendarClientId.endsWith('.apps.googleusercontent.com'))throw Error('Chưa cấu hình OAuth Client ID V4');
 if(calendarToken&&Date.now()<calendarExpiry-60000)return calendarToken;
 if(!window.google?.accounts?.oauth2){
  await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.onload=resolve;s.onerror=()=>reject(Error('Không tải được Google Identity Services'));document.head.append(s)})
 }
 return await new Promise((resolve,reject)=>{
  const client=google.accounts.oauth2.initTokenClient({client_id:calendarClientId,scope:'https://www.googleapis.com/auth/calendar.events',
   callback:r=>{if(r.error||!r.access_token)return reject(Error(r.error_description||r.error||'Không nhận được access token'));calendarToken=r.access_token;calendarExpiry=Date.now()+(Number(r.expires_in)||3500)*1000;resolve(calendarToken)},
   error_callback:e=>reject(Error('Cấp quyền Calendar không thành công: '+(e.type||'popup')))});
  client.requestAccessToken({prompt:'consent'});
 });
}
async function calendarApi(method,path,token,data){
 const r=await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events'+path,{method,
  headers:{Authorization:'Bearer '+token,...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});
 if(!r.ok){let msg='';try{const j=await r.json();msg=j.error?.message||''}catch{}throw Error('Google Calendar HTTP '+r.status+(msg?': '+msg:''))}
 if(r.status===204)return {};return r.json();
}
async function syncOne(t,which,token){
 const p=t[which];if(p.status!=='approved'||!p.body.trim()||!p.at)return {skipped:true};
 if(!t.sources?.trim()||!t.checkedAt)throw Error('Thiếu nguồn hoặc ngày kiểm chứng: '+t.title);
 const start=new Date(p.at);if(!Number.isFinite(start.getTime()))throw Error('Giờ đăng không hợp lệ: '+t.title);
 const zone=Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Ho_Chi_Minh';
 const body={summary:(which==='fb'?'Facebook':'TikTok')+' · '+(p.title||t.title),description:'Health Post AI V4 · '+t.title+'\nMở ứng dụng: '+location.href,
  start:{dateTime:start.toISOString(),timeZone:zone},end:{dateTime:new Date(start.getTime()+10*60000).toISOString(),timeZone:zone},
  reminders:{useDefault:false,overrides:[{method:'popup',minutes:2}]}};
 let result;
 if(p.calendarId){
  const r=await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events/'+encodeURIComponent(p.calendarId),{headers:{Authorization:'Bearer '+token}});
  if(r.status===404){p.calendarId=''}else if(!r.ok)throw Error('Không kiểm tra được sự kiện cũ (HTTP '+r.status+')');
 }
 if(p.calendarId)result=await calendarApi('PATCH','/'+encodeURIComponent(p.calendarId),token,body);
 else result=await calendarApi('POST','',token,body);
 p.calendarId=result.id;
 return {skipped:false};
}
$('calendarSyncBtn').onclick=async()=>{
 if(!selected)return toast('Hãy chọn một chủ đề đã lưu');
 const t=topics.find(x=>x.id===selected);if(!t)return toast('Không tìm thấy chủ đề');
 if(mode==='cloud'&&!cloudEnabled())return toast('Firebase V4 chưa sẵn sàng');
 if($('topicTitle').value.trim()!==t.title||$('fbBody').value.trim()!==t.fb.body||$('ttBody').value.trim()!==t.tt.body||$('fbAt').value!==t.fb.at||$('ttAt').value!==t.tt.at||$('fbStatus').value!==t.fb.status||$('ttStatus').value!==t.tt.status)return toast('Hãy lưu thay đổi trước khi đồng bộ lịch');
 if(![t.fb,t.tt].some(p=>p.status==='approved'&&p.body&&p.at))return toast('Cần ít nhất một bài đã duyệt và có giờ đăng');
 const btn=$('calendarSyncBtn');btn.disabled=true;
 try{
  const token=await calendarAccess();let n=0;
  for(const k of ['fb','tt']){
   try{const res=await syncOne(t,k,token);if(!res.skipped){n++;t._dirty=true;await persist()}}
   catch(e){toast('Lỗi '+(k==='fb'?'Facebook':'TikTok')+': '+e.message);throw e}
  }
  toast('Đã đồng bộ '+n+' sự kiện Google Calendar · Nhắc trước 2 phút');
 }catch(e){toast('Chưa đồng bộ hết: '+e.message)}finally{btn.disabled=false}
};

$('multiBtn').onclick=()=>{multi=!multi;picked.clear();renderList()};$('selectAll').onchange=e=>{for(const t of visibleTopics())e.target.checked?picked.add(t.id):picked.delete(t.id);renderList()};$('bulkDelete').onclick=()=>deleteMany([...picked]);$('statusFilter').onchange=()=>{picked.clear();renderList()};$('search').oninput=()=>{picked.clear();renderList()};$('deleteBtn').onclick=()=>deleteMany(selected?[selected]:[]);$('desktopNew').onclick=()=>{reset();showTab('editor')};document.querySelectorAll('#mobileNav button').forEach(b=>b.onclick=()=>{if(b.dataset.tab==='editor')reset();showTab(b.dataset.tab)});showTab('home');setInterval(renderDue,60000);
