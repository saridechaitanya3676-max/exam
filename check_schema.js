const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('quiz.db');

db.all("PRAGMA table_info(questions)", (err, rows) => {
    if (err) {
        console.error(err.message);
    }
    console.log(rows);
    db.close();
});
