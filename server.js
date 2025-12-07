const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Recursive loader for subjects/lessons
function loadMCQs(baseDir) {
    let db = {};

    function walk(dir, subject = null) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                // recurse into subfolder
                walk(fullPath, file);
            } else if (file.endsWith('.json')) {
                const lessonName = path.basename(file, '.json');
                const key = subject ? `${subject}-${lessonName}` : lessonName;
                try {
                    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
                    if(Array.isArray(data)) {
                        // plain array of questions
                        db[key] = { questions: data, title: key };
                    } else if (data && typeof data === 'object' && Array.isArray(data.questions)) {
                        // object with title + questions
                        db[key] = { questions: data.questions, title: data.title || key };
                    } else {
                        db[key] = { questions: [], title: key };
                    }

                } catch (err) {
                    console.error(`Failed to parse JSON file ${fullPath}:`, err.message);
                    db[key] = [];
                }
            }
        });
    }

    walk(baseDir);
    return db;
}

// Load all MCQs from nested folders
const db = loadMCQs(path.join(__dirname, 'data', 'mcqs'));

// Helper to shuffle
const shuffle = arr => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

// Utility: get all questions for a subject prefix
function getSubjectPool(subject) {
    return Object.entries(db)
        .filter(([key]) => key.startsWith(subject + '-'))
        .flatMap(([_, obj]) => obj.questions);
}

// Utility: parse trailing lesson number, return NaN if none
function extractLessonNumber(key) {
    // matches "lesson12", "lesson-12", or trailing digits
    const m = key.match(/(?:lesson[-_]?)?(\d+)$/i);
    return m ? Number(m[1]) : NaN;
}

// Utility: list lessons optionally filtered by subject prefix, sorted naturally by lesson number
function listLessons(subjectPrefix = null) {
    return Object.entries(db)
        .filter(([key]) => !subjectPrefix || key.startsWith(subjectPrefix + '-'))
        .map(([key, obj]) => ({
            key,
            title: obj.title || key,
            count: Array.isArray(obj.questions) ? obj.questions.length : 0,
            _num: extractLessonNumber(key)
        }))
        .sort((a, b) => {
            const aNum = Number.isFinite(a._num) ? a._num : Infinity;
            const bNum = Number.isFinite(b._num) ? b._num : Infinity;
            if (aNum !== bNum) return aNum - bNum;
            return a.key.localeCompare(b.key, undefined, { numeric: true, sensitivity: 'base' });
        })
        .map(({ _num, ...rest }) => rest);
}

// API: Lesson-based OR subject-based with pagination and total
app.get('/api/mcqs', (req, res) => {
    const { lesson, subject } = req.query;
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const pageSize = Math.max(1, parseInt(req.query.pageSize || '10'));
    const countParam = req.query.count; // legacy: if provided, used as pageSize override

    // backward compatibility: if count provided and pageSize not explicitly set, use count
    const effectivePageSize = (req.query.pageSize ? pageSize : (countParam ? Math.max(1, parseInt(countParam)) : pageSize));

    let pool = [];

    if (lesson) {
        if (!db[lesson]) return res.status(400).json({ error: 'Invalid lesson key' });
        pool = db[lesson].questions;
    } else if (subject) {
        pool = getSubjectPool(subject);
        if (pool.length === 0) return res.status(400).json({ error: `No questions found for subject ${subject}` });
    } else {
        return res.status(400).json({ error: 'Must provide lesson or subject' });
    }

    const total = pool.length;
    const start = (page - 1) * effectivePageSize;
    // shuffle only the slice selection to keep randomness but avoid shuffling the original pool
    const shuffled = shuffle(pool);
    const paged = shuffled.slice(start, start + effectivePageSize);

    res.json({
        items: paged,
        total,
        page,
        pageSize: effectivePageSize,
        totalPages: Math.ceil(total / effectivePageSize)
    });
});

// API: Random across selected subjects (returns total and requested)
app.get('/api/mcqs/random', (req, res) => {
    const count = Math.max(1, parseInt(req.query.count || '10'));
    const subject = req.query.subject; // "pharmacology", "pathology", or "both"

    let pool = [];

    if (subject === 'pharmacology') {
        pool = getSubjectPool('pharmacology');
    } else if (subject === 'pathology') {
        pool = getSubjectPool('pathology');
    } else if (subject === 'both') {
        pool = getSubjectPool('pharmacology').concat(getSubjectPool('pathology'));
    } else {
        pool = Object.values(db).flat();
    }

    if (pool.length === 0) {
        return res.status(400).json({ error: `No questions found for subject ${subject}` });
    }

    const shuffled = shuffle(pool);
    const items = shuffled.slice(0, Math.min(count, shuffled.length));

    res.json({ items, total: pool.length, requested: count, delivered: items.length });
});

// API: Finals with fixed ratio (example: pharmacology 50%, pathology 50%)
const FINALS_RATIO = { pharmacology: 0.5, pathology: 0.5 };

app.get('/api/mcqs/finals', (req, res) => {
    const count = Math.max(1, parseInt(req.query.count || '50'));
    let result = [];

    Object.entries(FINALS_RATIO).forEach(([subject, ratio]) => {
        const pool = shuffle(getSubjectPool(subject));
        const n = Math.floor(count * ratio);
        result = result.concat(pool.slice(0, n));
    });

    // If rounding caused fewer items than requested, try to fill from combined pool
    if (result.length < count) {
        const combined = shuffle(Object.values(db).flat());
        const needed = count - result.length;
        const filler = combined.filter(q => !result.includes(q)).slice(0, needed);
        result = result.concat(filler);
    }

    res.json({ items: result, requested: count, delivered: result.length, ratio: FINALS_RATIO });
});

// API: list lessons with counts and optional subject prefix filter and pagination
app.get('/api/lessons', (req, res) => {
    const subjectPrefix = req.query.subject || null; // e.g., "pharmacology"
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const pageSize = Math.max(1, parseInt(req.query.pageSize || '1000')); // default large so clients get full list
    const allLessons = listLessons(subjectPrefix);

    const totalLessons = allLessons.length;
    const start = (page - 1) * pageSize;
    const paged = allLessons.slice(start, start + pageSize);

    res.json({
        lessons: paged,
        totalLessons,
        page,
        pageSize,
        totalPages: Math.ceil(totalLessons / pageSize)
    });
});

// Diagnostics
console.log("Available lessons:", Object.keys(db));
Object.entries(db).forEach(([key, obj]) => {
    console.log(`${key}: ${obj.questions.length} questions`);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running at http://0.0.0.0:${PORT}`));
