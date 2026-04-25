const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('quiz.db');

db.get("SELECT * FROM teachers WHERE username = 'admin'", (err, row) => {
    if (err) {
        console.error(err.message);
    }
    console.log(row ? row : "No admin user found");
    db.close();
});
