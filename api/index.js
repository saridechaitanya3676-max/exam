const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const IS_POSTGRES = !!process.env.DATABASE_URL;
let db;
let pgPool;

(async () => {
    try {
        if (IS_POSTGRES) {
            console.log('Connecting to PostgreSQL...');
            pgPool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false }
            });
            
            // Helper to run queries on either DB
            db = {
                run: async (sql, params = []) => {
                    let pgSql = sql;
                    // Handle SQLite specific "INSERT OR IGNORE"
                    if (sql.includes('INSERT OR IGNORE')) {
                        pgSql = sql.replace('INSERT OR IGNORE INTO', 'INSERT INTO') + ' ON CONFLICT DO NOTHING';
                    }
                    
                    // For INSERT, get the ID back
                    if (pgSql.trim().toUpperCase().startsWith('INSERT')) {
                        pgSql += ' RETURNING id';
                    }

                    let paramIndex = 1;
                    const convertedSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);
                    
                    // Wrap params in array if single value
                    const normalizedParams = Array.isArray(params) ? params : [params];
                    const res = await pgPool.query(convertedSql, normalizedParams);
                    return { lastID: res.rows[0]?.id };
                },
                get: async (sql, params = []) => {
                    let paramIndex = 1;
                    const convertedSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
                    const normalizedParams = Array.isArray(params) ? params : [params];
                    const res = await pgPool.query(convertedSql, normalizedParams);
                    return res.rows[0];
                },
                all: async (sql, params = []) => {
                    let paramIndex = 1;
                    const convertedSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
                    const normalizedParams = Array.isArray(params) ? params : [params];
                    const res = await pgPool.query(convertedSql, normalizedParams);
                    return res.rows;
                },
                exec: async (sql) => pgPool.query(sql)
            };
        } else {
            console.log('Connecting to SQLite...');
            const { open } = require('sqlite');
            const sqlite3 = require('sqlite3');
            const sqliteDb = await open({
                filename: path.join(__dirname, 'quiz.db'),
                driver: sqlite3.Database
            });
            db = sqliteDb;
        }
    } catch (err) {
        console.error('Database Connection Error:', err);
    }

    // Initialize tables
    const schema = `
        CREATE TABLE IF NOT EXISTS questions (
            id SERIAL PRIMARY KEY,
            text TEXT,
            options TEXT,
            correct_index INTEGER,
            timer_seconds INTEGER DEFAULT 30,
            teacher_id INTEGER,
            test_name TEXT DEFAULT 'Default'
        );
        CREATE TABLE IF NOT EXISTS admin_settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );
        CREATE TABLE IF NOT EXISTS submissions (
            id SERIAL PRIMARY KEY,
            student_name TEXT,
            roll_no TEXT,
            score INTEGER,
            total_questions INTEGER,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            teacher_id INTEGER,
            test_name TEXT,
            tab_switches INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS teachers (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE,
            password TEXT,
            security_question TEXT,
            security_answer TEXT,
            exam_status TEXT DEFAULT 'waiting',
            current_test_name TEXT DEFAULT 'General Quiz',
            show_results INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS waiting_room (
            id SERIAL PRIMARY KEY,
            student_name TEXT,
            roll_no TEXT,
            teacher_id INTEGER,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS tests (
            id SERIAL PRIMARY KEY,
            teacher_id INTEGER,
            name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(teacher_id, name)
        );
    `;

    // SQLite doesn't support SERIAL or TIMESTAMP exactly like this, so we tweak it for SQLite if needed
    if (!IS_POSTGRES) {
        await db.exec(schema.replace(/SERIAL PRIMARY KEY/g, 'INTEGER PRIMARY KEY AUTOINCREMENT').replace(/TIMESTAMP/g, 'DATETIME'));
        
        // Simple migration for SQLite (Postgres will have these from the start if new)
        const qCols = await db.all("PRAGMA table_info(questions)");
        if (!qCols.find(c => c.name === 'teacher_id')) {
            await db.run("ALTER TABLE questions ADD COLUMN teacher_id INTEGER");
            await db.run("ALTER TABLE questions ADD COLUMN test_name TEXT DEFAULT 'Default'");
        }
        if (!qCols.find(c => c.name === 'timer_seconds')) {
            await db.run("ALTER TABLE questions ADD COLUMN timer_seconds INTEGER DEFAULT 30");
        }
        
        const sCols = await db.all("PRAGMA table_info(submissions)");
        if (!sCols.find(c => c.name === 'teacher_id')) {
            await db.run("ALTER TABLE submissions ADD COLUMN teacher_id INTEGER");
            await db.run("ALTER TABLE submissions ADD COLUMN test_name TEXT");
            await db.run("ALTER TABLE submissions ADD COLUMN tab_switches INTEGER DEFAULT 0");
        }

        const tCols = await db.all("PRAGMA table_info(teachers)");
        if (!tCols.find(c => c.name === 'exam_status')) {
            await db.run("ALTER TABLE teachers ADD COLUMN exam_status TEXT DEFAULT 'waiting'");
            await db.run("ALTER TABLE teachers ADD COLUMN current_test_name TEXT DEFAULT 'General Quiz'");
            await db.run("ALTER TABLE teachers ADD COLUMN show_results INTEGER DEFAULT 0");
        }
    } else {
        await db.exec(schema);
    }

    console.log('Database tables verified/created.');
})();

// --- Teacher Authentication & Setup ---
app.get('/api/teacher/setup-status', async (req, res) => {
    try {
        const adminTeacher = await db.get('SELECT * FROM teachers LIMIT 1');
        res.json({ is_setup: !!adminTeacher });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/teacher/register', async (req, res) => {
    const { username, password, security_question, security_answer } = req.body;
    try {
        // Check how many teachers exist limit to 15
        const countRes = await db.get('SELECT COUNT(*) as count FROM teachers');
        if (countRes.count >= 15) {
            return res.status(403).json({ error: 'Maximum of 15 teachers reached' });
        }
        await db.run(
            'INSERT INTO teachers (username, password, security_question, security_answer) VALUES (?, ?, ?, ?)',
            [username, password, security_question, security_answer]
        );
        res.json({ status: 'success', message: 'Teacher registered successfully' });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            res.status(400).json({ error: 'Username already exists' });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

app.post('/api/teacher/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const teacher = await db.get('SELECT * FROM teachers WHERE username = ?', [username]);
        
        if (!teacher) {
            return res.status(404).json({ detail: 'Teacher not found' });
        }
        
        if (teacher.password !== password) {
            return res.status(401).json({ detail: 'Incorrect password' });
        }
        
        res.json({ 
            status: 'success', 
            message: 'Logged in', 
            teacher_id: teacher.id, 
            username: teacher.username,
            exam_status: teacher.exam_status,
            show_results: teacher.show_results === 1
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/teacher/get-question', async (req, res) => {
    const { username } = req.body;
    try {
        const teacher = await db.get('SELECT security_question FROM teachers WHERE username = ?', [username]);
        if (!teacher) {
            return res.status(404).json({ detail: 'Username not found' });
        }
        res.json({ security_question: teacher.security_question });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/teacher/reset-password', async (req, res) => {
    const { username, security_answer, new_password } = req.body;
    try {
        const teacher = await db.get('SELECT security_answer FROM teachers WHERE username = ?', [username]);
        if (!teacher) {
            return res.status(404).json({ detail: 'Username not found' });
        }
        if (teacher.security_answer.toLowerCase().trim() !== security_answer.toLowerCase().trim()) {
            return res.status(401).json({ detail: 'Incorrect security answer' });
        }
        await db.run('UPDATE teachers SET password = ? WHERE username = ?', [new_password, username]);
        res.json({ status: 'success', message: 'Password reset successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Question Management (Teacher) ---
app.get('/api/questions', async (req, res) => {
    const { teacher_id, test_name } = req.query;
    try {
        let query = 'SELECT * FROM questions';
        let params = [];
        let conditions = [];
        
        if (teacher_id) {
            conditions.push('teacher_id = ?');
            params.push(teacher_id);
        }
        if (test_name) {
            conditions.push('test_name = ?');
            params.push(test_name);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        const questions = await db.all(query, params);
        // Parse options JSON
        const parsedQuestions = questions.map(q => ({
            ...q,
            options: JSON.parse(q.options)
        }));
        res.json(parsedQuestions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/questions', async (req, res) => {
    const { text, options, correct_index, timer_seconds, teacher_id, test_name } = req.body;
    try {
        const result = await db.run(
            'INSERT INTO questions (text, options, correct_index, timer_seconds, teacher_id, test_name) VALUES (?, ?, ?, ?, ?, ?)',
            [text, JSON.stringify(options), correct_index, timer_seconds, teacher_id, test_name]
        );
        res.status(201).json({ id: result.lastID, text, options, correct_index, timer_seconds, teacher_id, test_name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/questions/:id', async (req, res) => {
    const { id } = req.params;
    const { text, options, correct_index, timer_seconds, test_name } = req.body;
    try {
        await db.run(
            'UPDATE questions SET text = ?, options = ?, correct_index = ?, timer_seconds = ?, test_name = ? WHERE id = ?',
            [text, JSON.stringify(options), correct_index, timer_seconds, test_name, id]
        );
        res.json({ id, text, options, correct_index, timer_seconds, test_name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/questions/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.run('DELETE FROM questions WHERE id = ?', id);
        res.json({ message: 'Question deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Test Management (Previous Exams) ---
app.get('/api/teacher/tests', async (req, res) => {
    const { teacher_id } = req.query;
    try {
        const tests = await db.all('SELECT * FROM tests WHERE teacher_id = ? ORDER BY created_at DESC', [teacher_id]);
        res.json(tests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/teacher/tests', async (req, res) => {
    const { teacher_id, name } = req.body;
    try {
        // Insert or ignore if exists (unique constraint handles it)
        await db.run('INSERT OR IGNORE INTO tests (teacher_id, name) VALUES (?, ?)', [teacher_id, name]);
        res.status(201).json({ status: 'success' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/teacher/tests/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`Attempting to delete test record ID: ${id}`);
    try {
        await db.run('DELETE FROM tests WHERE id = ?', [parseInt(id)]);
        res.json({ status: 'success' });
    } catch (err) {
        console.error(`Error deleting test record ${id}:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/teacher/start-exam', async (req, res) => {
    const { teacher_id, test_name } = req.body;
    try {
        await db.run('UPDATE teachers SET exam_status = ?, current_test_name = ? WHERE id = ?', ['started', test_name, teacher_id]);
        res.json({ status: 'success', message: 'Exam started' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/teacher/end-exam', async (req, res) => {
    const { teacher_id } = req.body;
    try {
        await db.run('UPDATE teachers SET exam_status = ? WHERE id = ?', ['ended', teacher_id]);
        // Clear waiting room
        await db.run('DELETE FROM waiting_room WHERE teacher_id = ?', teacher_id);
        res.json({ status: 'success', message: 'Exam ended' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/teacher/toggle-results', async (req, res) => {
    const { teacher_id, show_results } = req.body;
    try {
        await db.run('UPDATE teachers SET show_results = ? WHERE id = ?', [show_results ? 1 : 0, teacher_id]);
        res.json({ status: 'success', message: 'Result visibility updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/teacher/settings/:teacher_id', async (req, res) => {
    const { teacher_id } = req.params;
    try {
        const teacher = await db.get('SELECT exam_status, show_results, current_test_name FROM teachers WHERE id = ?', [teacher_id]);
        if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
        res.json({
            exam_status: teacher.exam_status,
            show_results: teacher.show_results === 1,
            current_test_name: teacher.current_test_name
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/teacher/joined-students', async (req, res) => {
    const { teacher_id } = req.query;
    try {
        const students = await db.all('SELECT * FROM waiting_room WHERE teacher_id = ? ORDER BY timestamp DESC', [teacher_id]);
        res.json(students);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/exam-status/:username', async (req, res) => {
    const { username } = req.params;
    try {
        const teacher = await db.get('SELECT id, exam_status, current_test_name, show_results FROM teachers WHERE username = ?', [username]);
        if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
        res.json({ 
            teacher_id: teacher.id,
            status: teacher.exam_status, 
            test_name: teacher.current_test_name,
            show_results: !!teacher.show_results
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/student/join', async (req, res) => {
    const { student_name, roll_no, teacher_id } = req.body;
    try {
        // Check if already in waiting room
        const existing = await db.get('SELECT * FROM waiting_room WHERE roll_no = ? AND teacher_id = ?', [roll_no, teacher_id]);
        if (!existing) {
            await db.run('INSERT INTO waiting_room (student_name, roll_no, teacher_id) VALUES (?, ?, ?)', [student_name, roll_no, teacher_id]);
        }
        res.json({ status: 'success' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Student Submissions ---
app.post('/api/submissions', async (req, res) => {
    const { student_name, roll_no, score, total_questions, teacher_id, test_name, tab_switches } = req.body;
    const timestamp = new Date().toISOString();
    try {
        const result = await db.run(
            'INSERT INTO submissions (student_name, roll_no, score, total_questions, timestamp, teacher_id, test_name, tab_switches) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [student_name, roll_no, score, total_questions, timestamp, teacher_id, test_name, tab_switches || 0]
        );
        res.status(201).json({ id: result.lastID, student_name, roll_no, score, total_questions, timestamp });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/submissions', async (req, res) => {
    const { teacher_id } = req.query;
    try {
        let query = 'SELECT * FROM submissions';
        let params = [];
        if (teacher_id) {
            query += ' WHERE teacher_id = ?';
            params.push(teacher_id);
        }
        query += ' ORDER BY timestamp DESC';
        const submissions = await db.all(query, params);
        res.json(submissions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Vercel handles static files via vercel.json rewrites, so we don't need this in production
if (process.env.NODE_ENV !== 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/dist')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
    });
}

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

module.exports = app;
