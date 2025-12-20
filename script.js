(function(){
  const LS = {
    theme: 'apx_theme',
    apiKey: 'apx_apiKey',
    ghToken: 'apx_ghToken',
    modelSelected: 'apx_modelSelected',
    customModel: 'apx_customModel',
    sys: 'apx_systemInstructions',
    history: 'apx_history'
  };

  // Elements
  const body = document.body;
  const chatWindow = document.getElementById('chatWindow');
  const composer = document.getElementById('composer');
  const input = document.getElementById('input');
  const sendBtn = document.getElementById('sendBtn');
  const toggleThemeBtn = document.getElementById('toggleTheme');
  const clearBtn = document.getElementById('clearChat');
  const openSettingsBtn = document.getElementById('openSettings');

  const modal = document.getElementById('settingsModal');
  const modalBackdrop = modal.querySelector('.modal-backdrop');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');

  const apiKeyEl = document.getElementById('apiKey');
  const ghTokenEl = document.getElementById('ghToken');
  const modelEl = document.getElementById('modelSelect');
  const customModelWrap = document.getElementById('customModelWrap');
  const customModelEl = document.getElementById('customModel');
  const sysEl = document.getElementById('systemInstructions');

  // State
  let history = [];

  // Init
  primeTheme();
  loadSettingsIntoUI();
  loadHistory();
  renderHistory();
  autoScroll();

  // Event bindings
  toggleThemeBtn.addEventListener('click', toggleTheme);
  clearBtn.addEventListener('click', clearChat);
  openSettingsBtn.addEventListener('click', openSettings);
  modalBackdrop.addEventListener('click', closeSettings);
  saveSettingsBtn.addEventListener('click', (e)=>{ e.preventDefault(); saveSettings(); });
  modelEl.addEventListener('change', handleModelChange);

  composer.addEventListener('submit', (e)=>{ e.preventDefault(); handleSend(); });
  input.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter' && !e.shiftKey){
      e.preventDefault();
      handleSend();
    }
  });
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape') closeSettings();
  });

  function primeTheme(){
    const t = localStorage.getItem(LS.theme) || 'glass';
    body.classList.toggle('theme-glass', t === 'glass');
    body.classList.toggle('theme-matrix', t === 'matrix');
  }

  function toggleTheme(){
    const newTheme = body.classList.contains('theme-glass') ? 'matrix' : 'glass';
    localStorage.setItem(LS.theme, newTheme);
    body.classList.toggle('theme-glass', newTheme === 'glass');
    body.classList.toggle('theme-matrix', newTheme === 'matrix');
  }

  function getSettings(){
    return {
      apiKey: localStorage.getItem(LS.apiKey) || '',
      ghToken: localStorage.getItem(LS.ghToken) || '',
      modelSelected: localStorage.getItem(LS.modelSelected) || 'gpt-4o',
      customModel: localStorage.getItem(LS.customModel) || '',
      system: localStorage.getItem(LS.sys) || ''
    };
  }

  function loadSettingsIntoUI(){
    const s = getSettings();
    apiKeyEl.value = s.apiKey;
    ghTokenEl.value = s.ghToken;
    modelEl.value = ['gpt-4o','gpt-4o-mini','gpt-5','custom'].includes(s.modelSelected) ? s.modelSelected : 'gpt-4o';
    customModelEl.value = s.customModel;
    sysEl.value = s.system;
    customModelWrap.style.display = modelEl.value === 'custom' ? 'grid' : 'none';
  }

  function handleModelChange(){
    customModelWrap.style.display = modelEl.value === 'custom' ? 'grid' : 'none';
  }

  function openSettings(){ modal.classList.remove('hidden'); }
  function closeSettings(){ modal.classList.add('hidden'); }

  function saveSettings(){
    // GEEN validatie/test, gewoon opslaan en reloaden
    localStorage.setItem(LS.apiKey, apiKeyEl.value || '');
    localStorage.setItem(LS.ghToken, ghTokenEl.value || '');
    localStorage.setItem(LS.modelSelected, modelEl.value || 'gpt-4o');
    localStorage.setItem(LS.customModel, (customModelEl.value || ''));
    localStorage.setItem(LS.sys, sysEl.value || '');
    location.reload();
  }

  function loadHistory(){
    try {
      const raw = localStorage.getItem(LS.history);
      history = raw ? JSON.parse(raw) : [];
    } catch(e){ history = []; }
    if(history.length === 0){
      const s = getSettings();
      const theme = (localStorage.getItem(LS.theme) || 'glass');
      history = [
        { role: 'assistant', content: 
          'Welkom bij Master Build (Matrix/Glass).\n\n' +
          '- Huidig thema: ' + theme + '\n' +
          '- Model: ' + resolveModelName(s) + '\n' +
          (s.system ? ('- System Instructions: ingesteld (' + s.system.length + ' chars)\n') : '- System Instructions: (leeg)\n') +
          '\nTip: Open ⚙️ om instellingen op te slaan. Gebruik 👁️‍🗨️ om van thema te wisselen.',
          ts: Date.now() }
      ];
      persistHistory();
    }
  }

  function renderHistory(){
    chatWindow.innerHTML = '';
    for(const msg of history){
      chatWindow.appendChild(renderMessage(msg));
    }
  }

  function renderMessage(m){
    const wrap = document.createElement('div');
    wrap.className = 'msg ' + (m.role === 'user' ? 'user' : 'assistant');

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = m.content;
    wrap.appendChild(bubble);

    return wrap;
  }

  function autoScroll(){
    requestAnimationFrame(()=>{ chatWindow.scrollTop = chatWindow.scrollHeight; });
  }

  function persistHistory(){
    try { localStorage.setItem(LS.history, JSON.stringify(history)); } catch(e){}
  }

  function resolveModelName(settings){
    if(settings.modelSelected === 'custom'){
      return settings.customModel || 'custom';
    }
    return settings.modelSelected || 'gpt-4o';
  }

  function handleSend(){
    const text = (input.value || '').trim();
    if(!text) return;

    const s = getSettings();
    const model = resolveModelName(s);

    // push user message
    const userMsg = { role: 'user', content: text, ts: Date.now() };
    history.push(userMsg);
    chatWindow.appendChild(renderMessage(userMsg));
    input.value = '';
    persistHistory();
    autoScroll();

    // Build payload (System Instructions worden meegestuurd)
    const payload = {
      model,
      messages: [
        ...(s.system ? [{ role: 'system', content: s.system }] : []),
        ...history.map(h => ({ role: h.role, content: h.content }))
      ],
      // keys kunnen worden gebruikt door een toekomstige connector; niet gevalideerd
      apiKey: s.apiKey || undefined,
      ghToken: s.ghToken || undefined
    };

    // Simuleer antwoord (geen API-call). Snel en niet-blokkerend.
    simulateAssistant(payload);
  }

  function simulateAssistant(payload){
    const info = [];
    info.push('Model: ' + (payload.model || 'onbekend'));
    info.push('System Instructions: ' + (payload.messages[0]?.role === 'system' ? 'JA' : 'NEE'));

    const reply = [
      'Simulatie-antwoord. (Geen externe call uitgevoerd)',
      info.join(' | ')
    ].join('\n');

    const assistantMsg = { role: 'assistant', content: reply, ts: Date.now() };
    history.push(assistantMsg);
    chatWindow.appendChild(renderMessage(assistantMsg));
    persistHistory();
    autoScroll();
  }

  function clearChat(){
    // Leeg zonder confirm om vastlopers te voorkomen
    history = [];
    persistHistory();
    renderHistory();
  }
})();
