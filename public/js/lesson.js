import { api, renderQuestions } from './utils.js';

const subjectEl = document.getElementById('subject');
const lessonEl = document.getElementById('lesson');
const countEl = document.getElementById('count');
const genBtn = document.getElementById('gen');
const statusEl = document.getElementById('status');
const listEl = document.getElementById('list');

async function fetchLessonsFromServer(subject) {
    try {
        const url = `/api/lessons?subject=${encodeURIComponent(subject)}`;
        const json = await api.fetchJSON(url);
        return Array.isArray(json.lessons) ? json.lessons : [];
    } catch (err) {
        console.error('fetchLessonsFromServer error', err);
        return null;
    }
}

function clearSelect(sel) {
    sel.innerHTML = '';
}

function setStatus(text, isError = false) {
    statusEl.textContent = text || '';
    statusEl.style.color = isError ? 'crimson' : '';
}

async function updateLessons() {
    const subject = subjectEl.value;
    setStatus('Loading lessons...');
    const lessons = await fetchLessonsFromServer(subject);

    if (lessons === null) {
        clearSelect(lessonEl);
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Error loading lessons';
        lessonEl.appendChild(opt);
        setStatus('Failed to load lessons. Check server.', true);
        return;
    }

    clearSelect(lessonEl);

    if (lessons.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No lessons available';
        lessonEl.appendChild(opt);
        setStatus('No lessons found for subject.');
        countEl.max = 1;
        return;
    }

    lessons.forEach((ls, idx) => {
        const opt = document.createElement('option');
        opt.value = ls.key;
        opt.textContent = ls.title || `Lesson ${idx + 1}`;
        // store question count so we can clamp the MCQ count input
        opt.dataset.count = String(ls.count || 0);
        lessonEl.appendChild(opt);
    });

    lessonEl.selectedIndex = 0;
    updateCountMaxFromSelected();
    setStatus('');
}

function updateCountMaxFromSelected() {
    const opt = lessonEl.options[lessonEl.selectedIndex];
    const qCount = opt ? Number(opt.dataset.count || 0) : 0;
    if (qCount > 0) {
        countEl.max = qCount;
        if (Number(countEl.value) > qCount) countEl.value = qCount;
    } else {
        countEl.max = 200;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    updateLessons();
});

// React to subject changes
subjectEl.addEventListener('change', updateLessons);

// React to lesson selection changes
lessonEl.addEventListener('change', updateCountMaxFromSelected);

// Generate MCQs
genBtn.addEventListener('click', async () => {
    const lesson = lessonEl.value;
    if (!lesson) {
        setStatus('Please select a lesson first.', true);
        return;
    }

    const requestedCount = Math.max(1, parseInt(countEl.value || '10', 10));
    setStatus('Loading…');

    try {
        // Use pageSize for pagination-compatible request; keep count param for legacy servers
        const url = api.buildQuery('/api/mcqs', { lesson, page: 1, pageSize: requestedCount });
        const json = await api.fetchJSON(url);

        // Support both shapes: { items, total } and legacy { items, totalAvailable }
        const items = Array.isArray(json.items) ? json.items : [];
        const totalAvailable = json.total ?? json.totalAvailable ?? items.length;

        setStatus(`Showing ${items.length} of ${totalAvailable} available for ${lesson}.`);
        renderQuestions(listEl, items);
    } catch (e) {
        console.error('generate error', e);
        setStatus(`Error: ${e.message}`, true);
    }
});
