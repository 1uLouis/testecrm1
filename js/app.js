/* ---------------- Navigation ---------------- */
function goToPage(page){
  state.page = page;
  document.querySelectorAll('.navitem[data-page]').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + page));
  const [title, crumb] = pageTitles[page];
  document.getElementById('page-title').textContent = title;
  document.getElementById('page-crumb').textContent = crumb;
}
document.querySelectorAll('.navitem[data-page]').forEach(btn=>{
  btn.addEventListener('click', ()=> goToPage(btn.dataset.page));
});

/* ---------------- Logout ---------------- */
document.getElementById('btn-logout')?.addEventListener('click', () => {
  if (typeof logout === 'function') logout();
});

/* ---------------- Dashboard ---------------- */
function renderDashboard(){
  const totalReceita = state.closers.reduce((s,c)=>s+c.sales,0);
  const numVendas = state.sales.length || 1;
  const ticketMedio = totalReceita>0 ? totalReceita/numVendas : 0;
  const caixaLiquido = totalReceita*0.965;
  const totalLeads = Object.values(state.leads).reduce((s,arr)=>s+arr.length,0);
  const conv = totalLeads>0 ? Math.round((numVendas/(totalLeads+numVendas))*100) : 0;

  document.getElementById('m-receita').textContent = fmtBRL(totalReceita);
  document.getElementById('m-receita-hint').textContent = `${state.sales.length} venda${state.sales.length===1?'':'s'} no período`;
  document.getElementById('m-ticket').textContent = fmtBRL(ticketMedio);
  document.getElementById('m-caixa').textContent = fmtBRL(caixaLiquido);
  document.getElementById('m-leads').textContent = totalLeads;
  document.getElementById('m-conv').textContent = conv + '%';

  const recentes = [...state.sales].slice(-5).reverse();
  document.getElementById('vendas-recentes').innerHTML = recentes.length ? recentes.map(v=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 11px;border:1px solid var(--line);border-radius:8px;">
      <div>
        <div style="font-weight:700;font-size:12.5px;">${v.cliente}</div>
        <div style="font-size:11px;color:var(--slate);">${v.closer_name} · ${v.forma} · ${v.data}</div>
      </div>
      <span class="pill pill-moss">${fmtBRL(v.valor)}</span>
    </div>`).join('') : '<div class="empty">Nenhuma venda lançada ainda</div>';

  const maxCloser = Math.max(...state.closers.map(c=>c.sales), 1);
  document.getElementById('chart-closer').innerHTML = state.closers.map(c=>`
    <div class="barrow">
      <div class="barlabel">${c.name}</div>
      <div class="bartrack"><div class="barfill" style="width:${(c.sales/maxCloser*100).toFixed(0)}%"></div></div>
      <div class="barval">${fmtBRL(c.sales)}</div>
    </div>`).join('');

  document.getElementById('chart-sdr').innerHTML = state.sdrs.map(s=>{
    const comm = s.sales * (s.commission/100);
    return `<div class="barrow">
      <div class="barlabel">${s.name}</div>
      <div class="bartrack"><div class="barfill" style="width:${Math.min(comm/300*100,100).toFixed(0)}%;background:var(--moss);"></div></div>
      <div class="barval">${fmtBRL(comm)}</div>
    </div>`;
  }).join('');

  const totalLeadsForStatus = Object.values(state.leads).reduce((s,a)=>s+a.length,0) || 1;
  document.getElementById('chart-status').innerHTML = colDefs.map(c=>{
    const n = state.leads[c.key]?.length || 0;
    return `<div class="barrow">
      <div class="barlabel">${c.title}</div>
      <div class="bartrack"><div class="barfill" style="width:${(n/totalLeadsForStatus*100).toFixed(0)}%;background:var(--amber-flag);"></div></div>
      <div class="barval">${n} leads</div>
    </div>`;
  }).join('');
}

/* ---------------- Kanban ---------------- */
let dragCtx = null;
function renderKanban(){
  const board = document.getElementById('kanban-board');
  const isAdmin = window._userRole === 'admin';
  board.innerHTML = colDefs.map(col=>`
    <div class="kcol" data-col="${col.key}">
      <div class="kcol-head"><span class="t">${col.title}</span><span class="n">${state.leads[col.key]?.length || 0}</span></div>
      <div class="kcards"></div>
      <button class="kaddbtn" data-addcol="${col.key}">＋ Novo lead</button>
    </div>
  `).join('');

  // Oculta o btn-nova-coluna do header do quadro se não for admin
  if (!isAdmin) {
    const btnNovaColuna = document.getElementById('btn-nova-coluna');
    if (btnNovaColuna) btnNovaColuna.style.display = 'none';
  }

  colDefs.forEach(col=>{
    const colEl = board.querySelector(`.kcol[data-col="${col.key}"]`);
    const cardsWrap = colEl.querySelector('.kcards');
    (state.leads[col.key] || []).forEach((lead, idx)=>{
      const el = document.createElement('div');
      el.className = 'kcard';
      el.draggable = true;
      el.dataset.id = lead.id;
      el.innerHTML = `
        <div class="ktag">${lead.tag}</div>
        <div class="kname">${lead.name}</div>
        <div class="kmeta">${lead.meta}</div>
        <div class="ktags">
          ${lead.sdr_name ? `<span class="kbadge sdr">SDR: ${lead.sdr_name}</span>` : ''}
          ${lead.closer_name ? `<span class="kbadge closer">Closer: ${lead.closer_name}</span>` : ''}
        </div>
        ${lead.description ? `<div class="kdesc">${lead.description}</div>` : ''}
      `;
      el.addEventListener('dragstart', ()=>{ dragCtx = { col: col.key, idx, id: lead.id }; el.classList.add('dragging'); });
      el.addEventListener('dragend', ()=> el.classList.remove('dragging'));
      el.addEventListener('click', (e)=>{ if(e.target.tagName!=='INPUT') openLeadModal(col.key, idx); });
      cardsWrap.appendChild(el);
    });

    colEl.addEventListener('dragover', e=>{ e.preventDefault(); colEl.classList.add('dragover'); });
    colEl.addEventListener('dragleave', ()=> colEl.classList.remove('dragover'));
    colEl.addEventListener('drop', async e=>{
      e.preventDefault();
      colEl.classList.remove('dragover');
      if(!dragCtx) return;
      const [lead] = state.leads[dragCtx.col].splice(dragCtx.idx,1);
      if(!state.leads[col.key]) state.leads[col.key] = [];
      state.leads[col.key].push(lead);
      // Persiste no banco
      await updateLeadStatus(dragCtx.id, col.key);
      dragCtx = null;
      renderKanban();
      renderGestaoLeads();
      renderDashboard();
    });
  });

  board.querySelectorAll('[data-addcol]').forEach(btn=>{
    btn.addEventListener('click', ()=> openLeadModal(btn.dataset.addcol, null));
  });
}

/* ---------------- Nova Coluna do Kanban ---------------- */
function openAddColumnModal(){
  const root = document.getElementById('modals-root');
  root.innerHTML = `
    <div class="overlay show" id="col-overlay">
      <div class="modal">
        <div class="modal-head">
          <h3>Nova Coluna (Etapa)</h3>
          <p>Adicione uma nova etapa ao seu quadro de leads</p>
        </div>
        <div class="modal-body">
          <div class="field"><label>Nome da Coluna</label><input id="col-name" placeholder="Ex: Em negociação"></div>
        </div>
        <div class="modal-foot">
          <button class="btn" id="col-cancel">Cancelar</button>
          <button class="btn btn-primary" id="col-save">Adicionar Coluna</button>
        </div>
      </div>
    </div>
  `;
  
  const $ = id => document.getElementById(id);
  $('col-cancel').addEventListener('click', closeAddColumnModal);
  $('col-overlay').addEventListener('click', e=>{ if(e.target.id==='col-overlay') closeAddColumnModal(); });
  $('col-save').addEventListener('click', async ()=>{
    const title = $('col-name').value.trim();
    if(!title){ $('col-name').focus(); return; }
    
    const key = title.toLowerCase().replace(/[^a-z0-9]/g, '') + Date.now().toString().slice(-4);
    const position = colDefs.length;
    colDefs.push({ key, title });
    state.leads[key] = [];
    // Persiste no banco
    await insertColumn(key, title, position);
    
    closeAddColumnModal();
    renderKanban();
    renderGestaoLeads();
    renderDashboard();
  });
}
function closeAddColumnModal(){ document.getElementById('modals-root').innerHTML = ''; }
document.getElementById('btn-nova-coluna')?.addEventListener('click', openAddColumnModal);

/* ---------------- Modal: Novo Lead / Editar Lead ---------------- */
function openLeadModal(colKey, idx){
  const isEdit = idx !== null && idx !== undefined;
  const lead = isEdit
    ? state.leads[colKey][idx]
    : { name:'', instagram:'', phone:'', origin:'Instagram', description:'', sdr_name:'', closer_name:'', tag:'Novo lead' };
  const teamOptions = (arr, selected) => arr.map(p=>`<option value="${p.name}" ${p.name===selected?'selected':''}>${p.name}</option>`).join('');
  const root = document.getElementById('modals-root');
  root.innerHTML = `
    <div class="overlay show" id="lead-overlay">
      <div class="modal">
        <div class="modal-head">
          <h3>${isEdit ? 'Editar Lead' : 'Novo Lead'}</h3>
          <p>Coluna: ${colDefs.find(c=>c.key===colKey).title}</p>
        </div>
        <div class="modal-body">
          <div class="field"><label>Nome do Lead</label><input id="ld-name" placeholder="Nome completo" value="${lead.name}"></div>
          <div class="row2">
            <div class="field"><label>Instagram</label><input id="ld-instagram" placeholder="@usuario" value="${lead.instagram}"></div>
            <div class="field"><label>Telefone</label><input id="ld-phone" placeholder="(11) 90000-0000" value="${lead.phone}"></div>
          </div>
          <div class="field">
            <label>Rede social / Origem do lead</label>
            <select id="ld-origin">
              ${['Instagram','WhatsApp','Telefone','Indicação','Outro'].map(o=>`<option ${o===lead.origin?'selected':''}>${o}</option>`).join('')}
            </select>
          </div>
          <div class="row2">
            <div class="field">
              <label>SDR (primeiro contato)</label>
              <select id="ld-sdr"><option value="">Nenhum</option>${teamOptions(state.sdrs, lead.sdr_name)}</select>
            </div>
            <div class="field">
              <label>Closer (fechamento)</label>
              <select id="ld-closer"><option value="">Nenhum</option>${teamOptions(state.closers, lead.closer_name)}</select>
            </div>
          </div>
          <div class="field"><label>Descrição breve do lead</label><input id="ld-desc" placeholder="Ex: interessado no plano X, pediu retorno à tarde" value="${lead.description}"></div>
        </div>
        <div class="modal-foot" style="justify-content:${isEdit ? 'space-between' : 'flex-end'};">
          ${isEdit ? `<button class="icon-btn" id="ld-delete" style="width:auto;padding:0 12px;">Excluir</button>` : ''}
          <div style="display:flex;gap:10px;">
            <button class="btn" id="ld-cancel">Cancelar</button>
            <button class="btn btn-primary" id="ld-save">${isEdit ? 'Salvar' : 'Adicionar Lead'}</button>
          </div>
        </div>
      </div>
    </div>
  `;
  const $ = id => document.getElementById(id);
  $('ld-cancel').addEventListener('click', closeLeadModal);
  $('lead-overlay').addEventListener('click', e=>{ if(e.target.id==='lead-overlay') closeLeadModal(); });
  if(isEdit){
    $('ld-delete').addEventListener('click', async ()=>{
      await deleteLead(lead.id);
      state.leads[colKey].splice(idx,1);
      closeLeadModal(); renderKanban(); renderGestaoLeads(); renderDashboard();
    });
  }
  $('ld-save').addEventListener('click', async ()=>{
    const name = $('ld-name').value.trim();
    if(!name){ $('ld-name').focus(); return; }
    const payload = {
      name,
      instagram:   $('ld-instagram').value.trim(),
      phone:       $('ld-phone').value.trim(),
      origin:      $('ld-origin').value,
      sdr_name:    $('ld-sdr').value,
      closer_name: $('ld-closer').value,
      description: $('ld-desc').value.trim(),
      tag:         lead.tag || 'Novo lead',
      meta:        `${$('ld-origin').value} · ${isEdit ? 'atualizado agora' : 'adicionado agora'}`,
      status:      colKey,
    };
    if(!state.leads[colKey]) state.leads[colKey] = [];
    if(isEdit){
      await updateLead(lead.id, payload);
      state.leads[colKey][idx] = { ...lead, ...payload };
    } else {
      const saved = await insertLead(payload);
      state.leads[colKey].push(saved || payload);
    }
    closeLeadModal(); renderKanban(); renderGestaoLeads(); renderDashboard();
  });
}
function closeLeadModal(){ document.getElementById('modals-root').innerHTML=''; }

/* ---------------- Gestão de Leads ---------------- */
function renderGestaoLeads(){
  const rows = [];
  colDefs.forEach(col=>{
    (state.leads[col.key] || []).forEach(lead=>{
      rows.push(`<tr>
        <td><div class="name-cell"><span class="dot" style="background:var(--ember)"></span>${lead.name}</div></td>
        <td>${lead.origin || lead.meta.split('·')[0].trim()}</td>
        <td><span class="pill pill-ember">${col.title}</span></td>
        <td>${lead.sdr_name || '—'}</td>
        <td>${lead.closer_name || '—'}</td>
        <td>${lead.phone || lead.instagram || '—'}</td>
      </tr>`);
    });
  });
  document.getElementById('tbl-leads').innerHTML = rows.join('');
}

/* ---------------- Tarefas ---------------- */
function renderTarefas(){
  document.getElementById('tbl-tarefas').innerHTML = state.tasks.map((t,i)=>`
    <tr>
      <td><input type="checkbox" ${t.done?'checked':''} data-taskid="${t.id}" data-taskidx="${i}"></td>
      <td style="${t.done?'text-decoration:line-through;color:var(--slate);':''}">${t.title}</td>
      <td>${t.owner}</td>
      <td>${t.due}</td>
    </tr>
  `).join('');
  document.querySelectorAll('[data-taskid]').forEach(cb=>{
    cb.addEventListener('change', async ()=>{
      const idx = +cb.dataset.taskidx;
      state.tasks[idx].done = cb.checked;
      await updateTask(cb.dataset.taskid, { done: cb.checked });
      renderTarefas();
    });
  });
}

/* ---------------- Calendário ---------------- */
const CAL_START = 7;
const CAL_END = 20;
const CAL_ROWH = 48;
const DAY_NAMES = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
let calWeekOffset = 0;

function getWeekDates(){
  const today = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay() + calWeekOffset*7);
  return Array.from({length:7}, (_,i)=>{
    const d = new Date(sunday);
    d.setDate(sunday.getDate()+i);
    return d;
  });
}

function layoutDayEvents(events){
  const sorted = [...events].sort((a,b)=>a.start_time-b.start_time);
  const lanesEnd = [];
  sorted.forEach(ev=>{
    let lane = lanesEnd.findIndex(end => end <= ev.start_time);
    if(lane === -1){ lane = lanesEnd.length; lanesEnd.push(ev.end_time); }
    else { lanesEnd[lane] = ev.end_time; }
    ev._lane = lane;
  });
  const maxLanes = lanesEnd.length || 1;
  sorted.forEach(ev=> ev._lanes = maxLanes);
  return sorted;
}

function renderCalendario(){
  const dates = getWeekDates();
  const todayStr = new Date().toDateString();
  document.getElementById('cal-range').textContent =
    `${dates[0].getDate()} ${dates[0].toLocaleString('pt-BR',{month:'short'})} — ${dates[6].getDate()} ${dates[6].toLocaleString('pt-BR',{month:'short'})}`;

  const grid = document.getElementById('cal-grid');
  const totalHours = CAL_END - CAL_START;
  let html = `<div class="cal-corner"></div>`;
  dates.forEach((d,i)=>{
    const isToday = d.toDateString()===todayStr;
    html += `<div class="cal-head ${isToday?'today':''}">${DAY_NAMES[i]}<span class="d">${d.getDate()}</span></div>`;
  });
  html += `<div>`;
  for(let h=CAL_START; h<CAL_END; h++){
    html += `<div class="cal-time" style="height:${CAL_ROWH}px;">${String(h).padStart(2,'0')}:00</div>`;
  }
  html += `</div>`;
  dates.forEach((d,dayIdx)=>{
    html += `<div class="cal-daycol" data-day="${dayIdx}" style="height:${totalHours*CAL_ROWH}px;"></div>`;
  });
  grid.style.gridTemplateRows = `auto repeat(1,1fr)`;
  grid.innerHTML = html;

  dates.forEach((d,dayIdx)=>{
    const col = grid.querySelector(`.cal-daycol[data-day="${dayIdx}"]`);
    const dayEvents = layoutDayEvents(state.events.filter(e=>e.day===dayIdx));
    dayEvents.forEach(ev=>{
      const top = (ev.start_time-CAL_START)*CAL_ROWH;
      const height = Math.max((ev.end_time-ev.start_time)*CAL_ROWH - 3, 20);
      const widthPct = 100/ev._lanes;
      const el = document.createElement('div');
      el.className = 'cal-event' + (ev._lane%2? ' moss':'');
      el.style.top = top+'px';
      el.style.height = height+'px';
      el.style.left = `calc(${ev._lane*widthPct}% + 2px)`;
      el.style.width = `calc(${widthPct}% - 4px)`;
      const h1=Math.floor(ev.start_time), m1=Math.round((ev.start_time%1)*60);
      const h2=Math.floor(ev.end_time),   m2=Math.round((ev.end_time%1)*60);
      el.innerHTML = `<div class="et">${ev.title}</div><div class="em">${String(h1).padStart(2,'0')}:${String(m1).padStart(2,'0')}–${String(h2).padStart(2,'0')}:${String(m2).padStart(2,'0')}${ev.people.length?' · '+ev.people.join(', '):''}</div>`;
      el.addEventListener('click', e=>{ e.stopPropagation(); openEventModal(dayIdx, ev.id); });
      col.appendChild(el);
    });
    col.addEventListener('click', ()=> openEventModal(dayIdx, null));
  });
}
document.getElementById('cal-prev').addEventListener('click', ()=>{ calWeekOffset--; renderCalendario(); });
document.getElementById('cal-next').addEventListener('click', ()=>{ calWeekOffset++; renderCalendario(); });

function openEventModal(dayIdx, eventId){
  const isEdit = eventId !== null && eventId !== undefined;
  const ev = isEdit
    ? state.events.find(e=>e.id===eventId)
    : { title:'', day:dayIdx, start_time:9, end_time:10, people:[], lead_name:'', notes:'' };
  const hFmt = h => `${String(Math.floor(h)).padStart(2,'0')}:${String(Math.round((h%1)*60)).padStart(2,'0')}`;
  const allPeople = [...state.sdrs.map(p=>({name:p.name,role:'SDR'})), ...state.closers.map(p=>({name:p.name,role:'Closer'}))];
  const root = document.getElementById('modals-root');
  root.innerHTML = `
    <div class="overlay show" id="ev-overlay">
      <div class="modal">
        <div class="modal-head">
          <h3>${isEdit ? 'Editar Evento' : 'Novo Evento'}</h3>
          <p>Escolha o dia e o horário — dá para reorganizar depois só editando aqui</p>
        </div>
        <div class="modal-body">
          <div class="field"><label>Título</label><input id="ev-title" placeholder="Ex: Chamada com lead" value="${ev.title}"></div>
          <div class="row2">
            <div class="field">
              <label>Dia</label>
              <select id="ev-day">${DAY_NAMES.map((d,i)=>`<option value="${i}" ${i===ev.day?'selected':''}>${d}</option>`).join('')}</select>
            </div>
            <div class="field"><label>Lead relacionado (opcional)</label><input id="ev-lead" placeholder="Nome do lead" value="${ev.lead_name}"></div>
          </div>
          <div class="row2">
            <div class="field"><label>Hora início</label><input id="ev-start" type="time" value="${hFmt(ev.start_time)}"></div>
            <div class="field"><label>Hora fim</label><input id="ev-end" type="time" value="${hFmt(ev.end_time)}"></div>
          </div>
          <div class="field">
            <label>Participantes</label>
            <div class="chk-group">
              ${allPeople.map(p=>`<label class="chk-item"><input type="checkbox" value="${p.name}" ${ev.people.includes(p.name)?'checked':''}> ${p.name} <span style="color:var(--slate);">(${p.role})</span></label>`).join('') || '<span style="color:var(--slate);font-size:12.5px;">Nenhum SDR/Closer cadastrado ainda</span>'}
            </div>
          </div>
          <div class="field"><label>Observações / qualquer informação</label><input id="ev-notes" placeholder="Qualquer detalhe que quiser guardar sobre esse evento" value="${ev.notes}"></div>
        </div>
        <div class="modal-foot" style="justify-content:${isEdit ? 'space-between' : 'flex-end'};">
          ${isEdit ? `<button class="icon-btn" id="ev-delete" style="width:auto;padding:0 12px;">Excluir</button>` : ''}
          <div style="display:flex;gap:10px;">
            <button class="btn" id="ev-cancel">Cancelar</button>
            <button class="btn btn-primary" id="ev-save">${isEdit ? 'Salvar' : 'Agendar'}</button>
          </div>
        </div>
      </div>
    </div>
  `;
  const $ = id => document.getElementById(id);
  $('ev-cancel').addEventListener('click', closeEventModal);
  $('ev-overlay').addEventListener('click', e=>{ if(e.target.id==='ev-overlay') closeEventModal(); });
  if(isEdit){
    $('ev-delete').addEventListener('click', async ()=>{
      await deleteEvent(ev.id);
      state.events = state.events.filter(e=>e.id!==eventId);
      closeEventModal(); renderCalendario();
    });
  }
  $('ev-save').addEventListener('click', async ()=>{
    const title = $('ev-title').value.trim();
    if(!title){ $('ev-title').focus(); return; }
    const [sh,sm] = $('ev-start').value.split(':').map(Number);
    const [eh,em] = $('ev-end').value.split(':').map(Number);
    const start_time = sh + sm/60, end_time = eh + em/60;
    if(end_time <= start_time){ alert('A hora de fim precisa ser depois da hora de início.'); return; }
    const people = Array.from(document.querySelectorAll('.chk-item input:checked')).map(c=>c.value);
    const payload = {
      title,
      day: +$('ev-day').value,
      start_time,
      end_time,
      people,
      lead_name: $('ev-lead').value.trim(),
      notes: $('ev-notes').value.trim(),
    };
    if(isEdit){
      await updateEvent(ev.id, payload);
      Object.assign(ev, payload);
    } else {
      const saved = await insertEvent(payload);
      state.events.push(saved || payload);
    }
    closeEventModal(); renderCalendario();
  });
}
function closeEventModal(){ document.getElementById('modals-root').innerHTML=''; }

/* ---------------- Time ---------------- */
// Debounce para não disparar update a cada tecla
function debounce(fn, delay){
  let t;
  return (...args)=>{ clearTimeout(t); t = setTimeout(()=>fn(...args), delay); };
}

function renderTeamTable(list, tbodyId){
  document.getElementById(tbodyId).innerHTML = list.map((p,i)=>{
    const comm = p.sales * (p.commission/100);
    return `<tr>
      <td><div class="name-cell"><span class="dot" style="background:var(--moss)"></span>${p.name}</div></td>
      <td style="color:var(--slate);">${p.email}</td>
      <td><input class="commission-input" type="number" min="0" max="100" step="0.5" value="${p.commission}" data-role="${tbodyId}" data-field="commission" data-id="${p.id}" data-idx="${i}"> %</td>
      <td><input class="sales-input" type="number" min="0" step="50" value="${p.sales}" data-role="${tbodyId}" data-field="sales" data-id="${p.id}" data-idx="${i}"></td>
      <td><span class="pill pill-moss">${fmtBRL(comm)}</span></td>
      <td><button class="icon-btn" data-remove="${tbodyId}" data-id="${p.id}" data-idx="${i}">✕</button></td>
    </tr>`;
  }).join('');

  const debouncedUpdate = debounce(async (id, field, value, isSdr) => {
    if(isSdr) await updateSDR(id, { [field]: value });
    else       await updateCloser(id, { [field]: value });
  }, 600);

  document.querySelectorAll(`#${tbodyId} input[data-role="${tbodyId}"]`).forEach(inp=>{
    inp.addEventListener('input', ()=>{
      const idx = +inp.dataset.idx;
      const field = inp.dataset.field;
      const arr = tbodyId === 'tbl-sdr' ? state.sdrs : state.closers;
      arr[idx][field] = parseFloat(inp.value) || 0;
      debouncedUpdate(inp.dataset.id, field, arr[idx][field], tbodyId === 'tbl-sdr');
      renderTeamTable(arr, tbodyId);
      renderDashboard();
    });
  });
  document.querySelectorAll(`#${tbodyId} [data-remove="${tbodyId}"]`).forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const isSdr = tbodyId === 'tbl-sdr';
      if(isSdr) await deleteSDR(btn.dataset.id);
      else       await deleteCloser(btn.dataset.id);
      const arr = isSdr ? state.sdrs : state.closers;
      arr.splice(+btn.dataset.idx,1);
      renderTeamTable(arr, tbodyId);
      renderDashboard();
    });
  });
}
function renderTeam(){
  renderTeamTable(state.sdrs, 'tbl-sdr');
  renderTeamTable(state.closers, 'tbl-closer');
}
document.querySelectorAll('.tab').forEach(tab=>{
  tab.addEventListener('click', ()=>{
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    const which = tab.dataset.tab;
    document.getElementById('tab-sdr').style.display    = which==='sdr'    ? 'block':'none';
    document.getElementById('tab-closer').style.display = which==='closer' ? 'block':'none';
  });
});

/* ---------------- Projetos ---------------- */
function renderProjects(){
  document.getElementById('proj-grid').innerHTML = state.projects.map(p=>`
    <div class="proj-card">
      <h4>${p.name}</h4>
      <div class="owner">Dono: ${p.owner}</div>
      <button class="btn" style="width:100%;justify-content:center;">Mudar para este Projeto</button>
    </div>
  `).join('');
}
document.getElementById('btn-criar-projeto').addEventListener('click', async ()=>{
  const nameInput = document.getElementById('new-proj-name');
  if(!nameInput.value.trim()) return;
  const saved = await insertProject(nameInput.value.trim(), 'Você');
  state.projects.unshift(saved || { name: nameInput.value.trim(), owner: 'Você' });
  nameInput.value = '';
  renderProjects();
});

/* ---------------- Modal genérico: Adicionar SDR / Closer ---------------- */
function openTeamModal(role){
  const isSdr = role === 'sdr';
  const defaultComm = isSdr ? state.defaultSdrCommission : state.defaultCloserCommission;
  const root = document.getElementById('modals-root');
  root.innerHTML = `
    <div class="overlay show" id="team-overlay">
      <div class="modal">
        <div class="modal-head">
          <h3>Adicionar Novo ${isSdr ? 'SDR' : 'Closer'}</h3>
          <p>Defina a comissão dessa pessoa — ela será calculada automaticamente sobre o valor das vendas geradas.</p>
        </div>
        <div class="modal-body">
          <div class="field"><label>Nome</label><input id="tm-name" placeholder="Nome completo"></div>
          <div class="field"><label>Email</label><input id="tm-email" type="email" placeholder="email@exemplo.com"></div>
          <div class="row2">
            <div class="field">
              <label>Comissão (%)</label>
              <input id="tm-commission" type="number" min="0" max="100" step="0.5" value="${defaultComm}">
              <div class="helper">% aplicado sobre o valor de cada venda gerada por essa pessoa</div>
            </div>
            <div class="field">
              <label>Vendas geradas (R$)</label>
              <input id="tm-sales" type="number" min="0" step="50" placeholder="ex: 1000">
              <div class="helper">Use para simular o cálculo agora — pode editar depois</div>
            </div>
          </div>
          <div class="calc-box">
            <span class="l">Comissão calculada</span>
            <span class="v" id="tm-calc">R$ 0,00</span>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn" id="tm-cancel">Cancelar</button>
          <button class="btn btn-primary" id="tm-save">Adicionar ${isSdr ? 'SDR' : 'Closer'}</button>
        </div>
      </div>
    </div>
  `;
  const $ = id => document.getElementById(id);
  const recalc = ()=>{
    const c = parseFloat($('tm-commission').value) || 0;
    const s = parseFloat($('tm-sales').value) || 0;
    $('tm-calc').textContent = fmtBRL(s * (c/100));
  };
  $('tm-commission').addEventListener('input', recalc);
  $('tm-sales').addEventListener('input', recalc);
  $('tm-cancel').addEventListener('click', closeTeamModal);
  $('team-overlay').addEventListener('click', e=>{ if(e.target.id==='team-overlay') closeTeamModal(); });
  $('tm-save').addEventListener('click', async ()=>{
    const name = $('tm-name').value.trim();
    if(!name){ $('tm-name').focus(); return; }
    const entry = {
      name,
      email:      $('tm-email').value.trim() || '—',
      commission: parseFloat($('tm-commission').value) || 0,
      sales:      parseFloat($('tm-sales').value) || 0,
    };
    let saved;
    if(isSdr){
      saved = await insertSDR(entry);
      state.sdrs.push(saved || entry);
    } else {
      saved = await insertCloser(entry);
      state.closers.push(saved || entry);
    }
    closeTeamModal();
    renderTeam();
    renderDashboard();
  });
}
function closeTeamModal(){ document.getElementById('modals-root').innerHTML=''; }
document.getElementById('btn-add-sdr').addEventListener('click', ()=> openTeamModal('sdr'));
document.getElementById('btn-add-closer').addEventListener('click', ()=> openTeamModal('closer'));

/* ---------------- Modal: Nova Tarefa ---------------- */
function openTaskModal(){
  const allPeople = [...state.sdrs.map(p=>p.name), ...state.closers.map(p=>p.name)];
  const root = document.getElementById('modals-root');
  root.innerHTML = `
    <div class="overlay show" id="task-overlay">
      <div class="modal">
        <div class="modal-head"><h3>Criar Tarefa</h3><p>Defina o que precisa ser feito e quem é o responsável</p></div>
        <div class="modal-body">
          <div class="field"><label>Tarefa</label><input id="tk-title" placeholder="Ex: Ligar para o lead João Pedro"></div>
          <div class="row2">
            <div class="field">
              <label>Responsável</label>
              <select id="tk-owner">
                <option value="Você">Você</option>
                ${allPeople.map(n=>`<option value="${n}">${n}</option>`).join('')}
              </select>
            </div>
            <div class="field"><label>Prazo</label><input id="tk-due" type="date"></div>
          </div>
          <div class="field"><label>Lead relacionado (opcional)</label><input id="tk-lead" placeholder="Nome do lead"></div>
        </div>
        <div class="modal-foot">
          <button class="btn" id="tk-cancel">Cancelar</button>
          <button class="btn btn-primary" id="tk-save">Criar Tarefa</button>
        </div>
      </div>
    </div>
  `;
  const $ = id => document.getElementById(id);
  $('tk-cancel').addEventListener('click', closeTaskModal);
  $('task-overlay').addEventListener('click', e=>{ if(e.target.id==='task-overlay') closeTaskModal(); });
  $('tk-save').addEventListener('click', async ()=>{
    const title = $('tk-title').value.trim();
    if(!title){ $('tk-title').focus(); return; }
    const lead  = $('tk-lead').value.trim();
    const entry = {
      done:  false,
      title: lead ? `${title} — ${lead}` : title,
      owner: $('tk-owner').value,
      due:   $('tk-due').value ? new Date($('tk-due').value+'T00:00').toLocaleDateString('pt-BR') : 'Sem prazo',
    };
    const saved = await insertTask(entry);
    state.tasks.unshift(saved || entry);
    closeTaskModal();
    renderTarefas();
    goToPage('tarefas');
  });
}
function closeTaskModal(){ document.getElementById('modals-root').innerHTML=''; }

/* ---------------- Modal: Lançar Venda ---------------- */
function openSaleModal(){
  const root = document.getElementById('modals-root');
  root.innerHTML = `
    <div class="overlay show" id="sale-overlay">
      <div class="modal">
        <div class="modal-head"><h3>Lançar Venda</h3><p>O valor entra na receita e soma nas vendas do closer (e do SDR, se marcado)</p></div>
        <div class="modal-body">
          <div class="field"><label>Cliente / Lead</label><input id="sl-cliente" placeholder="Nome do cliente"></div>
          <div class="row2">
            <div class="field"><label>Valor da venda (R$)</label><input id="sl-valor" type="number" min="0" step="50" placeholder="ex: 1000"></div>
            <div class="field">
              <label>Forma de pagamento</label>
              <select id="sl-forma"><option>Cartão</option><option>Boleto</option><option>Pix</option></select>
            </div>
          </div>
          <div class="row2">
            <div class="field">
              <label>Closer responsável</label>
              <select id="sl-closer"><option value="">Selecione</option>${state.closers.map(c=>`<option value="${c.name}">${c.name}</option>`).join('')}</select>
            </div>
            <div class="field">
              <label>SDR responsável (opcional)</label>
              <select id="sl-sdr"><option value="">Nenhum</option>${state.sdrs.map(s=>`<option value="${s.name}">${s.name}</option>`).join('')}</select>
            </div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn" id="sl-cancel">Cancelar</button>
          <button class="btn btn-primary" id="sl-save">Lançar Venda</button>
        </div>
      </div>
    </div>
  `;
  const $ = id => document.getElementById(id);
  $('sl-cancel').addEventListener('click', closeSaleModal);
  $('sale-overlay').addEventListener('click', e=>{ if(e.target.id==='sale-overlay') closeSaleModal(); });
  $('sl-save').addEventListener('click', async ()=>{
    const cliente     = $('sl-cliente').value.trim();
    const valor       = parseFloat($('sl-valor').value) || 0;
    const closerName  = $('sl-closer').value;
    if(!cliente || !valor || !closerName){ return; }

    // Atualiza closers.sales em memória + banco
    const closer = state.closers.find(c=>c.name===closerName);
    if(closer){
      closer.sales += valor;
      await updateCloser(closer.id, { sales: closer.sales });
    }
    // Atualiza sdr.sales em memória + banco
    const sdrName = $('sl-sdr').value;
    if(sdrName){
      const sdr = state.sdrs.find(s=>s.name===sdrName);
      if(sdr){
        sdr.sales += valor;
        await updateSDR(sdr.id, { sales: sdr.sales });
      }
    }
    const saleEntry = {
      cliente,
      valor,
      forma:       $('sl-forma').value,
      closer_name: closerName,
      sdr_name:    sdrName || '—',
      data:        new Date().toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'}),
    };
    const saved = await insertSale(saleEntry);
    state.sales.push(saved || saleEntry);
    closeSaleModal();
    renderDashboard();
    renderTeam();
  });
}
function closeSaleModal(){ document.getElementById('modals-root').innerHTML=''; }

/* ---------------- Botões do topo e das páginas ---------------- */
document.getElementById('btn-criar-tarefa').addEventListener('click', openTaskModal);
document.getElementById('btn-nova-tarefa-quadro').addEventListener('click', openTaskModal);
document.getElementById('btn-lancar-venda').addEventListener('click', openSaleModal);
document.getElementById('btn-agendar').addEventListener('click', ()=> openEventModal(new Date().getDay(), null));
document.getElementById('btn-novo-evento').addEventListener('click', ()=> openEventModal(new Date().getDay(), null));

/* ---------------- Init (async) --------------------------------
   Carrega todos os dados do Supabase antes de renderizar.
   ------------------------------------------------------------ */
async function init(){
  // Exibe loading visual enquanto carrega
  document.body.style.opacity = '0.6';
  document.body.style.pointerEvents = 'none';

  try {
    // 1. Projeto
    const project = await loadProject();
    if(!project){
      console.warn('[Fera CRM] Nenhum projeto encontrado no banco. Execute o schema.sql primeiro.');
      document.body.style.opacity = '1';
      document.body.style.pointerEvents = '';
      // Renderiza com estado vazio para a UI não travar
      renderDashboard(); renderKanban(); renderGestaoLeads();
      renderTarefas();   renderCalendario(); renderTeam(); renderProjects();
      return;
    }

    // 2. Settings
    const settings = await loadSettings();
    if(settings){
      state.defaultSdrCommission    = settings.default_sdr_commission;
      state.defaultCloserCommission = settings.default_closer_commission;
    }

    // 3. Colunas Kanban
    const cols = await loadColumns();
    if(cols && cols.length > 0){
      colDefs = cols.map(c=>({ key: c.key, title: c.title }));
    }

    // 4. Dados em paralelo
    const [sdrs, closers, leadsGrouped, tasks, events, sales, projects] = await Promise.all([
      loadSDRs(),
      loadClosers(),
      loadLeads(),
      loadTasks(),
      loadEvents(),
      loadSales(),
      loadAllProjects(),
    ]);

    state.sdrs     = sdrs;
    state.closers  = closers;
    state.tasks    = tasks;
    state.events   = events;
    state.sales    = sales;
    state.projects = projects;

    // Garante que todas as colunas conhecidas existam no objeto leads
    colDefs.forEach(c=>{ state.leads[c.key] = leadsGrouped[c.key] || []; });

  } catch(err) {
    console.error('[Fera CRM] Erro ao carregar dados:', err);
  }

  document.body.style.opacity = '1';
  document.body.style.pointerEvents = '';

  // Renderiza tudo
  renderDashboard();
  renderKanban();
  renderGestaoLeads();
  renderTarefas();
  renderCalendario();
  renderTeam();
  renderProjects();
  // renderUsers() é chamado pelo auth.js após init(), somente para admins
}

/* ============================================================
   GERENCIAMENTO DE USUÁRIOS (apenas admin)
   ============================================================ */

let _allUsers = [];

async function renderUsers() {
  const tbody = document.getElementById('tbl-usuarios');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--slate);padding:20px;">Carregando...</td></tr>`;

  _allUsers = await rpcListUsers();

  if (!_allUsers.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--slate);padding:20px;">Nenhum usuário encontrado.</td></tr>`;
    return;
  }

  const currentUserId = (await _sb.auth.getUser()).data?.user?.id;

  tbody.innerHTML = _allUsers.map(u => {
    const isMe = u.id === currentUserId;
    const badgeClass = u.role === 'admin' ? 'badge-admin' : 'badge-user';
    const badgeLabel = u.role === 'admin' ? 'Administrador' : 'Usuário';
    const initials = (u.name || u.email).trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const dt = new Date(u.created_at).toLocaleDateString('pt-BR');
    return `<tr>
      <td style="display:flex;align-items:center;gap:10px;">
        <div class="avatar" style="width:28px;height:28px;font-size:11px;flex-shrink:0;">${initials}</div>
        <span style="font-weight:600;">${u.name || '—'}${isMe ? ' <span style="font-size:11px;color:var(--slate)">(você)</span>' : ''}</span>
      </td>
      <td style="color:var(--slate);font-size:13px;">${u.email}</td>
      <td><span class="topbar-badge ${badgeClass}">${badgeLabel}</span></td>
      <td style="color:var(--slate);font-size:13px;">${dt}</td>
      <td style="text-align:right;white-space:nowrap;">
        ${!isMe ? `
          <button class="btn" style="padding:5px 10px;font-size:12px;" onclick="toggleUserRole('${u.id}','${u.role}')">
            ${u.role === 'admin' ? 'Rebaixar para Usuário' : 'Promover a Admin'}
          </button>
          <button class="btn" style="padding:5px 10px;font-size:12px;color:var(--danger);margin-left:6px;" onclick="confirmDeleteUser('${u.id}','${u.email}')">Excluir</button>
        ` : '<span style="font-size:12px;color:var(--slate);">—</span>'}
      </td>
    </tr>`;
  }).join('');
}

async function toggleUserRole(userId, currentRole) {
  const newRole = currentRole === 'admin' ? 'user' : 'admin';
  const label = newRole === 'admin' ? 'administrador' : 'usuário';
  if (!confirm(`Tem certeza que deseja alterar o nível de acesso para ${label}?`)) return;

  const result = await rpcUpdateUserRole(userId, newRole);
  if (result?.error) { alert('Erro: ' + result.error); return; }
  renderUsers();
}

async function confirmDeleteUser(userId, email) {
  if (!confirm(`Excluir o usuário "${email}"? Esta ação não pode ser desfeita.`)) return;

  const result = await rpcDeleteUser(userId);
  if (result?.error) { alert('Erro: ' + result.error); return; }
  renderUsers();
}

function openNovoUsuarioModal() {
  const modalsRoot = document.getElementById('modals-root');
  modalsRoot.innerHTML = `
    <div class="modal-backdrop" id="modal-usuario">
      <div class="modal" style="max-width:440px;">
        <div class="modal-head">
          <span class="modal-title">Novo Usuário</span>
          <button class="modal-close" onclick="document.getElementById('modal-usuario').remove()">✕</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>Nome completo</label>
            <input type="text" id="nu-name" placeholder="Ex: João Silva" />
          </div>
          <div class="field">
            <label>E-mail</label>
            <input type="email" id="nu-email" placeholder="joao@email.com" />
          </div>
          <div class="field">
            <label>Senha inicial</label>
            <input type="password" id="nu-password" placeholder="Mínimo 6 caracteres" />
          </div>
          <div class="field">
            <label>Nível de acesso</label>
            <select id="nu-role">
              <option value="user">Usuário — adiciona leads, agenda, tarefas</option>
              <option value="admin">Administrador — acesso total</option>
            </select>
          </div>
          <div id="nu-error" style="display:none;background:#FEF2F1;border:1px solid #F5C9C5;border-radius:8px;padding:10px 13px;font-size:12.5px;color:var(--danger);margin-top:4px;"></div>
        </div>
        <div class="modal-foot">
          <button class="btn" onclick="document.getElementById('modal-usuario').remove()">Cancelar</button>
          <button class="btn btn-primary" id="btn-salvar-usuario">Criar Usuário</button>
        </div>
      </div>
    </div>`;

  document.getElementById('btn-salvar-usuario').addEventListener('click', async () => {
    const name     = document.getElementById('nu-name').value.trim();
    const email    = document.getElementById('nu-email').value.trim();
    const password = document.getElementById('nu-password').value;
    const role     = document.getElementById('nu-role').value;
    const errEl    = document.getElementById('nu-error');

    errEl.style.display = 'none';

    if (!name)            { errEl.textContent = 'Informe o nome.'; errEl.style.display='block'; return; }
    if (!email)           { errEl.textContent = 'Informe o e-mail.'; errEl.style.display='block'; return; }
    if (password.length < 6) { errEl.textContent = 'A senha precisa ter pelo menos 6 caracteres.'; errEl.style.display='block'; return; }

    const btn = document.getElementById('btn-salvar-usuario');
    btn.disabled = true;
    btn.textContent = 'Criando...';

    const result = await rpcCreateUser(email, password, name, role);

    if (result?.error) {
      errEl.textContent = result.error;
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Criar Usuário';
      return;
    }

    document.getElementById('modal-usuario').remove();
    renderUsers();
  });
}

document.getElementById('btn-novo-usuario')?.addEventListener('click', openNovoUsuarioModal);

// A chamada de init() é feita pelo auth.js (bootApp) após verificar autenticação.
// Não remova esta linha — ela serve como documentação do ponto de entrada.
