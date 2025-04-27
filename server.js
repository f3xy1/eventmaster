const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Подключаемся к базе данных в папке /db
const dbPath = path.join(__dirname, 'db', 'eventmaster.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err.message);
    } else {
        console.log('Подключено к базе данных SQLite');
    }
});

// Создаем таблицы и проверяем структуру
db.serialize(() => {
    // Создаем таблицу Users, если она не существует
    db.run(`
        CREATE TABLE IF NOT EXISTS Users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            login TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            name TEXT,
            secondname TEXT
        )
    `, (err) => {
        if (err) {
            console.error('Ошибка при создании таблицы Users:', err.message);
        }
    });

    // Проверяем, есть ли столбцы name и secondname, и добавляем их, если отсутствуют
    db.all("PRAGMA table_info(Users)", (err, columns) => {
        if (err) {
            console.error('Ошибка при проверке структуры таблицы Users:', err.message);
            return;
        }

        const columnNames = columns.map(col => col.name);
        if (!columnNames.includes('name')) {
            db.run(`ALTER TABLE Users ADD COLUMN name TEXT`, (err) => {
                if (err) {
                    console.error('Ошибка при добавлении столбца name:', err.message);
                }
            });
        }
        if (!columnNames.includes('secondname')) {
            db.run(`ALTER TABLE Users ADD COLUMN secondname TEXT`, (err) => {
                if (err) {
                    console.error('Ошибка при добавлении столбца secondname:', err.message);
                }
            });
        }
    });

    // Создаем таблицу Events, если она не существует
    db.run(`
        CREATE TABLE IF NOT EXISTS Events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            date TEXT NOT NULL,
            time TEXT,
            creator TEXT NOT NULL,
            participants TEXT,
            route_data TEXT,
            distance REAL,
            FOREIGN KEY (user_id) REFERENCES Users(id)
        )
    `, (err) => {
        if (err) {
            console.error('Ошибка при создании таблицы Events:', err.message);
        }
    });
});

// API для регистрации пользователя
app.post('/api/register', (req, res) => {
    const { login, password, email, name, secondname } = req.body;

    db.get(
        `SELECT * FROM Users WHERE login = ? OR email = ?`,
        [login, email],
        (err, row) => {
            if (err) {
                res.status(500).json({ error: 'Ошибка при проверке пользователя' });
                return;
            }
            if (row) {
                if (row.login === login) {
                    res.status(400).json({ error: 'Пользователь с таким логином уже существует' });
                } else {
                    res.status(400).json({ error: 'Пользователь с такой почтой уже существует' });
                }
                return;
            }

            const stmt = db.prepare(`
                INSERT INTO Users (login, password, email, name, secondname)
                VALUES (?, ?, ?, ?, ?)
            `);
            stmt.run(login, password, email, name || null, secondname || null, function (err) {
                if (err) {
                    res.status(500).json({ error: 'Ошибка при регистрации пользователя' });
                } else {
                    res.json({ success: true, userId: this.lastID });
                }
            });
            stmt.finalize();
        }
    );
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
            res.json({ success: true, userId: row.id });
        } else {
            res.status(401).json({ error: 'Неверный логин/почта или пароль' });
        }
    });
});

// API для получения данных пользователя
app.get('/api/user/:id', (req, res) => {
    const userId = req.params.id;
    db.get(`
        SELECT * FROM Users
        WHERE id = ?
    `, [userId], (err, row) => {
        if (err) {
            res.status(500).json({ error: 'Ошибка при получении данных пользователя' });
        } else if (row) {
            res.json({
                success: true,
                user: {
                    name: row.name,
                    secondname: row.secondname,
                    email: row.email,
                    login: row.login
                }
            });
        } else {
            res.status(404).json({ error: 'Пользователь не найден' });
        }
    });
});

// API для проверки существования пользователя по логину
app.get('/api/check-user-login/:login', (req, res) => {
    const login = req.params.login;
    db.get(`
        SELECT * FROM Users
        WHERE login = ?
    `, [login], (err, row) => {
        if (err) {
            res.status(500).json({ error: 'Ошибка при проверке логина' });
        } else if (row) {
            res.json({
                success: true,
                user: {
                    name: row.name,
                    secondname: row.secondname,
                    login: row.login
                }
            });
        } else {
            res.status(404).json({ error: 'Пользователь с таким логином не найден' });
        }
    });
});

// API для обновления профиля пользователя
app.put('/api/user/:id', (req, res) => {
    const userId = req.params.id;
    const { name, secondname, email } = req.body;

    db.get(
        `SELECT * FROM Users WHERE email = ? AND id != ?`,
        [email, userId],
        (err, row) => {
            if (err) {
                res.status(500).json({ error: 'Ошибка при проверке почты' });
                return;
            }
            if (row) {
                res.status(400).json({ error: 'Эта почта уже используется другим пользователем' });
                return;
            }

            const stmt = db.prepare(`
                UPDATE Users
                SET name = ?, secondname = ?, email = ?
                WHERE id = ?
            `);
            stmt.run(name || null, secondname || null, email, userId, function (err) {
                if (err) {
                    res.status(500).json({ error: 'Ошибка при обновлении профиля' });
                } else {
                    res.json({ success: true });
                }
            });
            stmt.finalize();
        }
    );
});

// API для создания мероприятия
app.post('/api/events', (req, res) => {
    const { user_id, title, description, date, time, creator, participants, route_data, distance } = req.body;

    // Проверяем, существует ли пользователь
    db.get(`SELECT id FROM Users WHERE id = ?`, [user_id], (err, row) => {
        if (err) {
            res.status(500).json({ error: 'Ошибка при проверке пользователя' });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Пользователь не найден' });
            return;
        }

        const stmt = db.prepare(`
            INSERT INTO Events (user_id, title, description, date, time, creator, participants, route_data, distance)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
            user_id,
            title,
            description || null,
            date,
            time || null,
            creator,
            JSON.stringify(participants || []),
            route_data ? JSON.stringify(route_data) : null,
            distance || null,
            function (err) {
                if (err) {
                    res.status(500).json({ error: 'Ошибка при создании мероприятия' });
                } else {
                    res.json({ success: true, eventId: this.lastID });
                }
            }
        );
        stmt.finalize();
    });
});

// API для получения всех мероприятий пользователя
app.get('/api/events/:user_id', (req, res) => {
    const userId = req.params.user_id;
    console.log(`Запрос на получение мероприятий для userId: ${userId}`); // Логируем запрос
    db.all(`
        SELECT * FROM Events
        WHERE user_id = ?
    `, [userId], (err, rows) => {
        if (err) {
            console.error('Ошибка SQL-запроса:', err.message);
            res.status(500).json({ error: 'Ошибка при получении мероприятий' });
            return;
        }
        console.log(`Найдено мероприятий: ${rows.length}`); // Логируем количество найденных записей
        // Парсим JSON-поля с обработкой ошибок
        const events = rows.map(row => {
            let parsedParticipants = [];
            let parsedRouteData = null;

            try {
                parsedParticipants = row.participants ? JSON.parse(row.participants) : [];
                if (!Array.isArray(parsedParticipants)) {
                    console.warn(`Некорректный формат participants для события ${row.id}:`, row.participants);
                    parsedParticipants = [];
                }
            } catch (e) {
                console.error(`Ошибка парсинга participants для события ${row.id}:`, e.message);
                parsedParticipants = [];
            }

            try {
                parsedRouteData = row.route_data ? JSON.parse(row.route_data) : null;
            } catch (e) {
                console.error(`Ошибка парсинга route_data для события ${row.id}:`, e.message);
                parsedRouteData = null;
            }

            return {
                ...row,
                participants: parsedParticipants,
                route_data: parsedRouteData
            };
        });

        console.log('Отправляем ответ:', { success: true, events }); // Логируем ответ
        res.json({ success: true, events });
    });
});

// API для получения всех мероприятий
app.get('/api/all-events', (req, res) => {
    db.all(`
        SELECT * FROM Events
        ORDER BY date ASC
    `, [], (err, rows) => {
        if (err) {
            console.error('Ошибка SQL-запроса:', err.message);
            res.status(500).json({ error: 'Ошибка при получении мероприятий' });
            return;
        }
        // Парсим JSON-поля с обработкой ошибок
        const events = rows.map(row => {
            let parsedParticipants = [];
            let parsedRouteData = null;

            try {
                parsedParticipants = row.participants ? JSON.parse(row.participants) : [];
                if (!Array.isArray(parsedParticipants)) {
                    console.warn(`Некорректный формат participants для события ${row.id}:`, row.participants);
                    parsedParticipants = [];
                }
            } catch (e) {
                console.error(`Ошибка парсинга participants для события ${row.id}:`, e.message);
                parsedParticipants = [];
            }

            try {
                parsedRouteData = row.route_data ? JSON.parse(row.route_data) : null;
            } catch (e) {
                console.error(`Ошибка парсинга route_data для события ${row.id}:`, e.message);
                parsedRouteData = null;
            }

            return {
                ...row,
                participants: parsedParticipants,
                route_data: parsedRouteData
            };
        });

        res.json({ success: true, events });
    });
});

// Статические файлы (перемещено после API-маршрутов)
app.use(express.static(__dirname));

// Обработчик для несуществующих маршрутов
app.use((req, res) => {
    res.status(404).json({ error: 'Маршрут не найден' });
});

// Запускаем сервер
const PORT = 3000;
const server = app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Завершение работы сервера...');
    db.close((err) => {
        if (err) {
            console.error('Ошибка при закрытии базы данных:', err.message);
        } else {
            console.log('База данных закрыта');
        }
        server.close(() => {
            console.log('Сервер остановлен');
            process.exit(0);
        });
    });
});