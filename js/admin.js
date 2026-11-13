(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var currentData = null;
  function fmt(s) { if (!s) return '—'; var d = new Date(s); return isNaN(d) ? String(s) : d.toLocaleString('zh-TW'); }
  function cell(tr, value) { var td=document.createElement('td'); td.textContent=value==null?'':String(value); tr.appendChild(td); return td; }
  function setMsg(id, text) { $(id).textContent=text || ''; }
  function renderStats(t) {
    var wrap=$('stats'); wrap.textContent='';
    [['使用者',t.users],['PRO 使用者',t.pro],['登入次數',t.logins],['拍照次數',t.photos],['下載次數',t.downloads],['雲端同步',t.syncs]].forEach(function(p){
      var d=document.createElement('div'); d.className='admin-stat';
      var b=document.createElement('b'); b.textContent=p[1];
      var s=document.createElement('span'); s.textContent=p[0]; d.append(b,s); wrap.appendChild(d);
    });
  }
  function renderUsers(users) {
    var body=$('users'); body.textContent='';
    users.forEach(function(u){
      var tr=document.createElement('tr'); tr.style.cursor='pointer';
      [u.email,u.name,u.plan,({active:'正常',suspended:'暫停',terminated:'已終止'}[u.accountStatus]||'正常'),u.logins,u.photos,u.downloads,fmt(u.lastSeen)].forEach(function(v){cell(tr,v);});
      tr.addEventListener('click',function(){
        $('pfEmail').value=u.email; $('statusEmail').value=u.email;
        $('pfPlan').value=u.plan; $('accountStatus').value=u.accountStatus || 'active';
        $('viewTitle').textContent='使用者管理'; showView('users');
      }); body.appendChild(tr);
    });
  }
  function renderFeedback(items) {
    var wrap=$('feedback'); wrap.textContent='';
    if(!items.length){var empty=document.createElement('div');empty.className='admin-empty';empty.textContent='目前沒有問題回報';wrap.appendChild(empty);return;}
    items.forEach(function(f){
      var card=document.createElement('article');card.className='feedback-item';
      var head=document.createElement('div');head.className='feedback-head';
      var title=document.createElement('strong');title.textContent=(f.category||'其他')+' · '+(f.email||'未知帳號');
      var status=document.createElement('span');status.className='admin-status';status.textContent=({pending:'待處理',in_progress:'處理中',resolved:'已解決'}[f.status]||'待處理');
      head.append(title,status);
      var meta=document.createElement('div');meta.className='admin-muted';meta.textContent=fmt(f.time);
      var message=document.createElement('p');message.className='feedback-message';message.textContent=f.message||'';
      var actions=document.createElement('div');actions.className='feedback-actions';
      var reply=document.createElement('textarea');reply.className='reply-input';reply.rows=2;reply.placeholder='輸入回覆內容（送出後會通知使用者）';reply.value=f.adminReply||'';
      var statusSel=document.createElement('select');statusSel.className='reply-input';
      [['pending','待處理'],['in_progress','處理中'],['resolved','已解決']].forEach(function(o){var op=document.createElement('option');op.value=o[0];op.textContent=o[1];statusSel.appendChild(op);});
      statusSel.value=f.status||'pending';
      var send=document.createElement('button');send.className='admin-btn primary';send.type='button';send.textContent='儲存並通知';
      send.addEventListener('click',async function(){
        if(!reply.value.trim()){alert('請先輸入回覆內容。');return;}
        send.disabled=true;send.textContent='傳送中…';
        var result=await SpoolAuth.api('adminReplyFeedback',{id:f.id,reply:reply.value.trim(),status:statusSel.value});
        send.disabled=false;send.textContent='儲存並通知';
        if(result.ok){alert('回覆已儲存，應用程式內通知已建立。若已設定郵件擴充功能，也會寄出 Email。');load();}
        else alert('儲存失敗：'+result.error);
      });
      actions.append(reply,statusSel,send);card.append(head,meta,message,actions);wrap.appendChild(card);
    });
  }
  function renderEvents(items) {
    var body=$('events');body.textContent='';
    items.forEach(function(e){var tr=document.createElement('tr');[fmt(e.time),e.email,e.event,e.details].forEach(function(v){cell(tr,v);});body.appendChild(tr);});
  }
  function showView(name) {
    document.querySelectorAll('.admin-view').forEach(function(v){v.classList.toggle('active',v.dataset.panel===name);});
    document.querySelectorAll('[data-view]').forEach(function(b){b.classList.toggle('active',b.dataset.view===name);});
    var titles={overview:['使用統計','SpoolFilm 使用狀況與近期活動'],users:['使用者管理','方案、帳號狀態與使用權限'],feedback:['問題回報','檢視、回覆並通知回報者'],notices:['應用程式通知','向使用者發送重要更新與提醒'],events:['活動紀錄','最近 100 筆使用事件']};
    $('viewTitle').textContent=titles[name][0];$('viewSub').textContent=titles[name][1];
  }
  async function load() {
    $('denied').style.display='none';
    var d=await SpoolAuth.api('adminStats');
    if(!d.ok){$('content').style.display='none';$('denied').textContent=d.error==='forbidden'?'此帳號沒有管理員權限。':'讀取失敗：'+d.error;$('denied').style.display='';return;}
    currentData=d;$('content').style.display='';
    renderStats(d.totals);renderUsers(d.users||[]);renderFeedback(d.feedback||[]);renderEvents(d.recent||[]);
  }
  function onAuthChange(user) {
    $('setupWarn').style.display=SpoolAuth.configured()?'none':'';
    $('login').style.display=user?'none':'';
    $('panel').style.display=user?'':'none';
    if(user){$('who').textContent='登入：'+user.email;load();}
  }
  document.addEventListener('DOMContentLoaded',function(){
    document.querySelectorAll('[data-view]').forEach(function(b){b.addEventListener('click',function(){showView(b.dataset.view);});});
    $('reload').addEventListener('click',load);
    $('logout').addEventListener('click',function(){SpoolAuth.signOut();});
    $('planForm').addEventListener('submit',async function(e){
      e.preventDefault();setMsg('planMsg','儲存中…');
      var d=await SpoolAuth.api('adminSetPlan',{targetEmail:$('pfEmail').value.trim(),plan:$('pfPlan').value,proUntil:$('pfUntil').value});
      setMsg('planMsg',d.ok?'方案已更新。':'儲存失敗：'+d.error);if(d.ok)load();
    });
    $('statusForm').addEventListener('submit',async function(e){
      e.preventDefault();var status=$('accountStatus').value;
      if(status!=='active'&&!confirm(status==='terminated'?'確定要終止此帳號的 SpoolFilm 使用權限？':'確定要暫停此帳號的 SpoolFilm 使用權限？'))return;
      setMsg('statusMsg','更新中…');
      var d=await SpoolAuth.api('adminSetAccountStatus',{targetEmail:$('statusEmail').value.trim(),status:status});
      setMsg('statusMsg',d.ok?'權限狀態已更新，已建立應用程式內通知。':'更新失敗：'+d.error);if(d.ok)load();
    });
    $('noticeForm').addEventListener('submit',async function(e){
      e.preventDefault();setMsg('noticeMsg','發送中…');
      var d=await SpoolAuth.api('adminSendNotice',{targetEmail:$('noticeEmail').value.trim(),title:$('noticeTitle').value.trim(),message:$('noticeMessage').value.trim()});
      setMsg('noticeMsg',d.ok?'通知已送達通知中心。':'發送失敗：'+d.error);
      if(d.ok){$('noticeTitle').value='';$('noticeMessage').value='';}
    });
    SpoolAuth.onChange(onAuthChange);onAuthChange(null);SpoolAuth.start($('authMount'));
  });
})();
