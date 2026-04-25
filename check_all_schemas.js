const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('quiz.db');

const tables = ['questions', 'submissions', 'teachers', 'waiting_room'];

tables.forEach(table => {
    db.all(`PRAGMA table_info(${table})`, (err, rows) => {
        if (err) {
            console.error(err.message);
        }
        console.log(`Table: ${table}`);
        console.log(rows);
    });
});
setTimeout(() => db.close(), 2000);
