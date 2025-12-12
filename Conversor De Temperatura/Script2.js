/* ==========================================================================
   script.js
   - Interações acessíveis: modal (popup) e sidepanel
   - Validação básica dos inputs
   - Conversões entre C/F/K e suporte à escala personalizada (X)
   - Prefers-reduced-motion respeitado
   - Comentários em Português
   ========================================================================== */

(function () {
  'use strict';

  /* -------------------
     Seletores principais
     ------------------- */
  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));

  const form = $('#converterForm');
  const inpValor = $('#valor');
  const selDe = $('#de');
  const selPara = $('#para');
  const nomeEscala = $('#nomeEscala');
  const siglaEscala = $('#siglaEscala');
  const fusao = $('#fusao');
  const ebulicao = $('#ebulicao');

  const btnConverter = $('#btnConverter');
  const popup = $('#popup');
  const popupBody = $('#resultado');
  const closePopup = $('#closePopup');

  const sidepanel = $('#sidepanel');
  const btnPanel = $('#btnPanel');
  const closeSide = $('#closeSide');

  const errValor = $('#err-valor');
  const errX = $('#err-x');

  let lastFocusedBeforeDialog = null;

  /* -------------------
     Prefers reduced motion
     ------------------- */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* -------------------
     Acessibilidade: trap de foco simples
     ------------------- */
  function trapFocus(container, e) {
    const focusables = $$('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])', container)
      .filter(el => el.offsetParent !== null);
    if (!focusables.length) return;

    const first = focusables[0], last = focusables[focusables.length - 1];

    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  /* -------------------
     Modal (popup) open/close
     ------------------- */
  function openPopup() {
    lastFocusedBeforeDialog = document.activeElement;
    popup.setAttribute('aria-hidden', 'false');
    popup.querySelector('.popup-frame')?.focus?.(); // foco no frame
    document.addEventListener('keydown', onPopupKeydown);
  }

  function closePopupFn() {
    popup.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', onPopupKeydown);
    lastFocusedBeforeDialog?.focus?.();
  }

  function onPopupKeydown(e) {
    if (e.key === 'Escape') closePopupFn();
    trapFocus(popup, e);
  }

  closePopup?.addEventListener('click', closePopupFn);

  popup?.addEventListener('click', (e) => {
    // clique no backdrop fecha
    if (e.target === popup) closePopupFn();
  });

  /* -------------------
     Sidepanel open/close (variante B)
     ------------------- */
  function openSidepanel() {
    btnPanel.setAttribute('aria-expanded', 'true');
    sidepanel.setAttribute('aria-hidden', 'false');
    lastFocusedBeforeDialog = document.activeElement;
    sidepanel.querySelector('[tabindex], button, input, select')?.focus?.();
    document.addEventListener('keydown', onSideKeydown);
  }
  function closeSidepanel() {
    btnPanel.setAttribute('aria-expanded', 'false');
    sidepanel.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', onSideKeydown);
    lastFocusedBeforeDialog?.focus?.();
  }
  function onSideKeydown(e) {
    if (e.key === 'Escape') closeSidepanel();
    trapFocus(sidepanel, e);
  }
  btnPanel?.addEventListener('click', () => {
    const hidden = sidepanel.getAttribute('aria-hidden') === 'true';
    if (hidden) openSidepanel(); else closeSidepanel();
  });
  closeSide?.addEventListener('click', closeSidepanel);

  /* -------------------
     Validação simples
     ------------------- */
  function clearErrors() {
    errValor.textContent = '';
    errX.textContent = '';
    inpValor.removeAttribute('aria-invalid');
    ebulicao && ebulicao.removeAttribute('aria-invalid');
  }

  function validate() {
    clearErrors();
    let ok = true;
    if (!inpValor.value || isNaN(Number(inpValor.value))) {
      errValor.textContent = 'Informe um valor numérico.';
      inpValor.setAttribute('aria-invalid', 'true');
      ok = false;
    }

    // se escala personalizada for usada, checar fusão/ebulicao
    const usingX = selDe.value === 'X' || selPara.value === 'X' || selPara.value === 'all';
    if (usingX) {
      const f = Number(fusao?.value || NaN);
      const e = Number(ebulicao?.value || NaN);
      if (!isFinite(f) || !isFinite(e) || e === f) {
        errX.textContent = 'Defina pontos de fusão/ebulição válidos e diferentes para escala X.';
        ebulicao?.setAttribute('aria-invalid', 'true');
        ok = false;
      }
    }
    return ok;
  }

  /* -------------------
     Conversões (base em Celsius como pivô)
     - toCelsius[from](value, fX, eX)
     - fromCelsius[to](celsius, fX, eX)
     ------------------- */
  const toC = {
    C: v => v,
    F: v => (v - 32) * (5 / 9),
    K: v => v - 273.15,
    X: (v, fX, eX) => 100 * (v - fX) / (eX - fX) // linear map: fX -> 0°C ; eX -> 100°C
  };
  const fromC = {
    C: v => v,
    F: v => (v * 9 / 5) + 32,
    K: v => v + 273.15,
    X: (v, fX, eX) => fX + (eX - fX) * (v / 100)
  };

  function format2(n) {
    return Number(n).toFixed(2);
  }

  function compute(value, from, to, fX=0, eX=100) {
    // retorna array de {scale, value}
    const results = [];
    const c = from === 'X' ? toC['X'](value, fX, eX) : toC[from](value);
    if (!isFinite(c)) return results;
    const targets = to === 'all' ? ['C','F','K','X'] : [to];
    for (const t of targets) {
      const val = (t === 'X') ? fromC['X'](c, fX, eX) : fromC[t](c);
      results.push({scale: t, value: format2(val)});
    }
    return results;
  }

  /* -------------------
     Render do resultado no popup (acessível)
     ------------------- */
  function renderResults(list, customName='Personalizada', customSigla='X') {
    if (!Array.isArray(list) || list.length === 0) {
      popupBody.textContent = 'Não foi possível converter com os valores fornecidos.';
      return;
    }
    const mapName = { C: 'Celsius', F: 'Fahrenheit', K: 'Kelvin', X: customName || 'Personalizada' };
    const mapSig = { C: '°C', F: '°F', K: 'K', X: `°${(customSigla||'X').toUpperCase()}` };
    popupBody.innerHTML = list.map(it => {
      return `<div class="res-row"><span class="res-scale">${mapName[it.scale]}</span><strong class="res-value" aria-label="valor convertido">${it.value} ${mapSig[it.scale]}</strong></div>`;
    }).join('');
  }

  /* -------------------
     Submit handler (conversão)
     ------------------- */
  form?.addEventListener('submit', function(e){
    e.preventDefault();
    if (!validate()) return;
    const val = Number(inpValor.value);
    const de = selDe.value;
    const para = selPara.value;
    const fX = Number(fusao?.value || 0);
    const eX = Number(ebulicao?.value || 100);
    const nome = (nomeEscala?.value || 'Personalizada');
    const sig = (siglaEscala?.value || 'X');

    // micro-interaction: pulse no botão
    btnConverter?.classList?.add('is-pulse');
    setTimeout(()=> btnConverter?.classList?.remove('is-pulse'), reduceMotion ? 10 : 700);

    const results = compute(val, de, para, fX, eX);
    renderResults(results, nome, sig);

    openPopup();
  });

  /* -------------------
     ESC global para fechar popup/painel
     ------------------- */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (popup.getAttribute('aria-hidden') === 'false') closePopupFn();
      if (sidepanel.getAttribute('aria-hidden') === 'false') closeSidepanel();
    }
  });

  /* -------------------
     Pequenas melhorias de UX
     - remover texto de erro ao editar
     ------------------- */
  inpValor?.addEventListener('input', () => { if (errValor.textContent) { errValor.textContent=''; inpValor.removeAttribute('aria-invalid'); } });
  ebulicao?.addEventListener('input', () => { if (errX.textContent) { errX.textContent=''; ebulicao.removeAttribute('aria-invalid'); } });

  // exibir histórico simples no sidepanel (opcional)
  function appendHistory(text){
    const sideBody = $('#sideBody');
    const item = document.createElement('div');
    item.className = 'hist-item';
    item.textContent = text;
    sideBody?.prepend(item);
  }

  // quando o popup fechar adiciona histórico resumido
  closePopup?.addEventListener('click', () => {
    const summary = popupBody.textContent.trim().slice(0, 80);
    if (summary) appendHistory(summary);
    closePopupFn();
  });

  // acessibilidade: foco inicial no campo valor
  window.addEventListener('load', () => { inpValor?.focus(); });

})();
