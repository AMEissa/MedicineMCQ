import { api, renderQuestions } from './utils.js';

const countEl = document.getElementById('count');
const genBtn = document.getElementById('gen');
const statusEl = document.getElementById('status');
const listEl = document.getElementById('list');

genBtn.addEventListener('click', async () => {
  const count = Math.max(1, parseInt(countEl.value || '50', 10));
  statusEl.textContent = 'Generating…';
  try {
    const url = api.buildQuery('/api/mcqs/finals', { count });
    const { items, requested, delivered, ratio } = await api.fetchJSON(url);
    statusEl.textContent = `Requested ${requested}, delivered ${delivered}. Ratio: ${Object.entries(ratio).map(([k,v])=>`${k}: ${(v*100).toFixed(0)}%`).join(' • ')}`;
    renderQuestions(listEl, items);
  } catch (e) {
    statusEl.textContent = `Error: ${e.message}`;
  }
});
