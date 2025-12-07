import { api, renderQuestions } from './utils.js';

const subjectEl = document.getElementById('subject');
const countEl = document.getElementById('count');
const genBtn = document.getElementById('gen');
const statusEl = document.getElementById('status');
const listEl = document.getElementById('list');

genBtn.addEventListener('click', async () => {
    const subject = subjectEl.value;
    const count = Math.max(1, parseInt(countEl.value || '20', 10));
    statusEl.textContent = 'Loading…';
    try {
        // Pass subject + count to backend
        const url = api.buildQuery('/api/mcqs/random', { subject, count });
        const { items, totalAvailable } = await api.fetchJSON(url);

        // More descriptive status line
        let subjectLabel = subject === 'both' ? 'all subjects' : subject;
        statusEl.textContent = `Showing ${items.length} from ${totalAvailable} total (${subjectLabel}).`;

        renderQuestions(listEl, items);
    } catch (e) {
        statusEl.textContent = `Error: ${e.message}`;
    }
});
