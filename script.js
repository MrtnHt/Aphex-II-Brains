document.addEventListener('DOMContentLoaded', function () {
  var modal = document.getElementById('settingsModal');
  var openBtn = document.querySelector('.open-settings');
  var closeBtn = document.querySelector('.close-modal');
  var saveBtn = document.querySelector('.btn-save');
  var resetBtn = document.querySelector('.btn-reset');
  var apiInput = document.getElementById('apiKeyInput');
  var tokenInput = document.getElementById('tokenInput');

  function openSettings() {
    apiInput.value = localStorage.getItem('apiKey') || '';
    tokenInput.value = localStorage.getItem('token') || '';
    modal.style.display = 'flex';
    apiInput.focus();
  }

  function closeSettings() {
    modal.style.display = 'none';
  }

  function saveSettings() {
    var apiKey = apiInput.value;
    var token = tokenInput.value;
    localStorage.setItem('apiKey', apiKey);
    localStorage.setItem('token', token);
    closeSettings();
    location.reload();
  }

  function resetApp() {
    localStorage.clear();
    alert('Systeem gewist. Pagina herlaadt.');
    location.reload();
  }

  // Expose functies indien nodig elders
  window.saveSettings = saveSettings;
  window.resetApp = resetApp;

  // Events koppelen
  if (openBtn) openBtn.addEventListener('click', openSettings);
  if (closeBtn) closeBtn.addEventListener('click', closeSettings);
  if (saveBtn) saveBtn.addEventListener('click', saveSettings);
  if (resetBtn) resetBtn.addEventListener('click', resetApp);

  // Klik op overlay sluit modal
  modal.addEventListener('click', function (e) {
    if (e.target === modal) {
      closeSettings();
    }
  });

  // Escape sluit modal
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.style.display === 'flex') {
      closeSettings();
    }
  });
});
