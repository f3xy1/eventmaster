const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Статические файлы (HTML, CSS, JS)

// Подключаемся к базе данных в папке /db
const dbPath = path.join(__dirname, 'db', 'eventmaster.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err.message);
    } else {
        console.log('Подключено к базе данных SQLite');
    }
});

// Создаем таблицу Users, если она не существует
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS Users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            login TEXT NOT NULL,
            password TEXT NOT NULL,
            email TEXT NOT NULL,
            name TEXT,
            secondname TEXT
        )
    `);
});

// API для регистрации пользователя
app.post('/api/register', (req, res) => {
    const { login, password, email, name, secondname } = req.body;
    const stmt = db.prepare(`
        INSERT INTO Users (login, password, email, name, secondname)
        VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(login, password, email, name || null, secondname || null, function (err) {
        if (err) {
            res.status(500).json({ error: 'Ошибка при регистрации пользователя' });
        } else {
            res.json({ success: true });
        }
    });
    stmt.finalize();
});

// API для входа пользователя
app.post('/api/login', (req, res) => {
    const { loginOrEmail, password } = req.body;
    db.get(`
        SELECT * FROM Users
        WHERE (login = ? OR email = ?) AND password = ?
    `, [loginOrEmail, loginOrEmail, password], (err, row) => {
        if (err) {
            res.status(500).json({ error: 'Ошибка при проверке пользователя' });
        } else if (row) {
            res.json({ success: true });
        } else {
            res.status(401).json({ error: 'Неверный логин/почта или пароль' });
        }
    });
});

// Запускаем сервер
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});