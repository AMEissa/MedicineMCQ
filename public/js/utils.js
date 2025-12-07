export const api = {
    async fetchJSON(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    },
    buildQuery(base, params) {
        const q = new URLSearchParams(params);
        return `${base}?${q.toString()}`;
    }
};

// Helper to shuffle arrays (for randomization)
function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function renderQuestions(container, items) {
    container.innerHTML = '';
    items.forEach(item => {
        const qEl = document.createElement('div');
        qEl.className = 'q';

        // Question text
        const title = document.createElement('h4');
        title.textContent = item.question;
        qEl.appendChild(title);

        // Options container
        const optionsEl = document.createElement('div');
        optionsEl.className = 'options';

        // Shuffle options for randomization
        const shuffledOptions = shuffle(item.options.map((opt, i) => ({ opt, i })));

        shuffledOptions.forEach(({ opt, i }) => {
            const btn = document.createElement('button');
            btn.className = 'option';
            btn.textContent = `${String.fromCharCode(65 + i)}. ${opt}`;
            btn.dataset.index = i;

            btn.addEventListener('click', () => {
                // Clear previous selection
                [...optionsEl.children].forEach(b => {
                    b.classList.remove('selected');
                    delete b.dataset.selected;
                });
                // Mark this one as selected
                btn.classList.add('selected');
                btn.dataset.selected = true;
            });

            optionsEl.appendChild(btn);
        });

        qEl.appendChild(optionsEl);

        // Meta info (lesson only, no answer shown)
        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.textContent = `Lesson: ${item.lesson}`;
        qEl.appendChild(meta);

        container.appendChild(qEl);
    });

    // Review button logic
    const reviewBtn = document.getElementById('review');
    if (reviewBtn) {
        reviewBtn.onclick = () => {
            items.forEach((item, idx) => {
                const optionsEl = container.children[idx].querySelector('.options');
                [...optionsEl.children].forEach(b => {
                    const index = parseInt(b.dataset.index, 10);
                    if (index === item.answerIndex) {
                        b.classList.add('correct');
                    } else if (b.dataset.selected) {
                        b.classList.add('wrong');
                    }
                    b.disabled = true; // lock after review
                });
            });
        };
    }
}
