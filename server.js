const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

const app = express();

// Configure CORS to allow multiple origins
const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:5500'];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());

// Configure session middleware
app.use(session({
    store: new SQLiteStore({
        db: 'eventmaster.db',
        dir: path.join(__dirname, 'db'),
        table: 'Sessions'
    }),
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Connect to the database
const dbPath = path.join(__dirname, 'db', 'eventmaster.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err.message);
    } else {
        console.log('Подключено к базе данных SQLite');
    }
});

// Create tables and check structure
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS Sessions (
            sid TEXT PRIMARY KEY,
            expires INTEGER,
            data TEXT
        )
    `, (err) => {
        if (err) {
            console.error('Ошибка при создании таблицы Sessions:', err.message);
        }
    });

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

    db.run(`
        CREATE TABLE IF NOT EXISTS Notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            is_read INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES Users(id)
        )
    `, (err) => {
        if (err) {
            console.error('Ошибка при создании таблицы Notifications:', err.message);
        }
    });
});

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next();
    }
    res.status(401).json({ error: 'Не авторизован' });
}

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
                    req.session.userId = this.lastID;
                    req.session.login = login;
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
            req.session.userId = row.id;
            req.session.login = row.login;
            res.json({ success: true, userId: row.id, login: row.login });
        } else {
            res.status(401).json({ error: 'Неверный логин/почта или пароль' });
        }
    });
});

// API для выхода пользователя
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            res.status(500).json({ error: 'Ошибка при выходе' });
        } else {
            res.json({ success: true });
        }
    });
});

// API для проверки сессии
app.get('/api/check-session', (req, res) => {
    if (req.session.userId) {
        res.json({ success: true, userId: req.session.userId, login: req.session.login });
    } else {
        res.status(401).json({ error: 'Сессия не найдена' });
    }
});

// API для получения данных пользователя
app.get('/api/user/:id', isAuthenticated, (req, res) => {
    const userId = req.params.id;
    if (parseInt(userId) !== req.session.userId) {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
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
app.get('/api/check-user-login/:login', isAuthenticated, (req, res) => {
    const login = req.params.login;
    db.get(`
        SELECT * FROM Users
        WHERE login = ?
    `, [login], (err, row) => {
        if (err) {
            console.error('Ошибка при проверке логина:', err.message);
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
app.put('/api/user/:id', isAuthenticated, (req, res) => {
    const userId = req.params.id;
    if (parseInt(userId) !== req.session.userId) {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
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
app.post('/api/events', isAuthenticated, (req, res) => {
    const { title, description, date, time, creator, participants, route_data, distance } = req.body;
    const user_id = req.session.userId;

    if (!user_id || !title || !date) {
        return res.status(400).json({ success: false, error: 'Отсутствуют обязательные поля' });
    }

    console.log('Participants received:', participants);

    const insertEventQuery = `
        INSERT INTO Events (user_id, title, description, date, time, creator, participants, route_data, distance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const participantsArray = Array.isArray(participants) ? participants.filter(p => p && typeof p === 'string') : [];
    const participantsJson = JSON.stringify(participantsArray);
    const routeDataJson = route_data ? JSON.stringify(route_data) : null;

    console.log('Participants array after processing:', participantsArray);

    db.run(insertEventQuery, [user_id, title, description || null, date, time || null, creator, participantsJson, routeDataJson, distance || null], function (err) {
        if (err) {
            console.error('Ошибка при создании мероприятия:', err);
            return res.status(500).json({ success: false, error: 'Ошибка сервера при создании мероприятия' });
        }

        const eventId = this.lastID;
        console.log(`Event created with ID: ${eventId}`);

        if (participantsArray.length === 0) {
            console.log('No valid participants provided, skipping notification creation.');
            return res.json({ success: true, eventId });
        }

        const notificationPromises = participantsArray.map(login => {
            return new Promise((resolve, reject) => {
                console.log(`Looking up user with login: ${login}`);
                db.get('SELECT id FROM Users WHERE login = ?', [login], (err, user) => {
                    if (err) {
                        console.error(`Database error looking up user ${login}:`, err);
                        return reject(new Error(`Database error for user ${login}: ${err.message}`));
                    }
                    if (!user) {
                        console.warn(`User ${login} not found in database, skipping notification.`);
                        return resolve(); // Resolve even if user not found to allow partial success
                    }

                    console.log(`Found user ${login} with ID: ${user.id}`);
                    const message = `Вы были добавлены в мероприятие "${title}", запланированное на ${date}${time ? ' в ' + time : ''}.`;
                    db.run(
                        'INSERT INTO Notifications (user_id, message, is_read, created_at) VALUES (?, ?, 0, ?)',
                        [user.id, message, new Date().toISOString()],
                        function (err) {
                            if (err) {
                                console.error(`Failed to create notification for user ${login}:`, err);
                                return reject(new Error(`Notification creation failed for ${login}: ${err.message}`));
                            }
                            const notificationId = this.lastID;
                            console.log(`Successfully created notification for user ${login} (ID: ${user.id}) with notification ID: ${notificationId}`);

                            // Verify the notification was actually inserted
                            db.get('SELECT * FROM Notifications WHERE id = ?', [notificationId], (err, row) => {
                                if (err) {
                                    console.error(`Error verifying notification ${notificationId}:`, err);
                                    return reject(new Error(`Verification failed for notification ${notificationId}: ${err.message}`));
                                }
                                if (!row) {
                                    console.error(`Notification ${notificationId} was not found in the database after insertion`);
                                    return reject(new Error(`Notification ${notificationId} was not persisted in the database`));
                                }
                                console.log(`Verified notification ${notificationId} exists in the database`);
                                resolve();
                            });
                        }
                    );
                });
            });
        });

        Promise.allSettled(notificationPromises).then(results => {
            const successful = results.filter(result => result.status === 'fulfilled').length;
            const failed = results.filter(result => result.status === 'rejected').length;
            const errors = results
                .filter(result => result.status === 'rejected')
                .map(result => result.reason.message);

            console.log(`Notification results: ${successful} successful, ${failed} failed`);
            if (errors.length > 0) {
                console.error('Notification errors:', errors);
                return res.status(500).json({
                    success: false,
                    error: 'Мероприятие создано, но уведомления не отправлены для некоторых участников',
                    eventId,
                    details: errors
                });
            }

            console.log('All notifications processed successfully.');
            res.json({ success: true, eventId });
        }).catch(err => {
            console.error('Unexpected error in notification processing:', err);
            res.status(500).json({
                success: false,
                error: 'Мероприятие создано, но уведомления не отправлены',
                eventId,
                details: [err.message]
            });
        });
    });
});

// API для обновления мероприятия
app.put('/api/events/:id', isAuthenticated, (req, res) => {
    const eventId = req.params.id;
    const user_id = req.session.userId;
    const { title, description, date, time, creator, participants, route_data, distance } = req.body;

    console.log(`Received participants in request: ${JSON.stringify(participants)}`);

    db.get(`SELECT id, user_id, participants FROM Events WHERE id = ? AND user_id = ?`, [eventId, user_id], (err, row) => {
        if (err) {
            console.error('Ошибка при проверке мероприятия:', err.message);
            res.status(500).json({ error: 'Ошибка при проверке мероприятия' });
            return;
        }
        if (!row) {
            console.warn(`Попытка редактирования мероприятия ${eventId} пользователем ${user_id}, не являющимся создателем`);
            res.status(403).json({ error: 'Только создатель мероприятия может его редактировать' });
            return;
        }

        let currentParticipants = [];
        try {
            currentParticipants = row.participants ? JSON.parse(row.participants) : [];
            if (!Array.isArray(currentParticipants)) {
                currentParticipants = [];
            }
        } catch (e) {
            console.error(`Ошибка парсинга currentParticipants для события ${eventId}:`, e.message);
            currentParticipants = [];
        }
        console.log(`Current participants from database: ${JSON.stringify(currentParticipants)}`);

        const newParticipants = Array.isArray(participants) ? participants.filter(p => p && typeof p === 'string') : [];
        console.log(`New participants after processing: ${JSON.stringify(newParticipants)}`);

        const addedParticipants = newParticipants.filter(p => !currentParticipants.includes(p));
        console.log(`Added participants: ${JSON.stringify(addedParticipants)}`);

        const newParticipantsJson = JSON.stringify(newParticipants);
        const routeDataJson = route_data ? JSON.stringify(route_data) : null;

        const stmt = db.prepare(`
            UPDATE Events
            SET title = ?, description = ?, date = ?, time = ?, creator = ?,
                participants = ?, route_data = ?, distance = ?
            WHERE id = ?
        `);
        stmt.run(
            title,
            description || null,
            date,
            time || null,
            creator,
            newParticipantsJson,
            routeDataJson,
            distance || null,
            eventId,
            function (err) {
                if (err) {
                    console.error('Ошибка при обновлении мероприятия:', err.message);
                    res.status(500).json({ error: 'Ошибка при обновлении мероприятия' });
                } else {
                    if (addedParticipants.length > 0) {
                        const notificationPromises = addedParticipants.map(login => {
                            return new Promise((resolve, reject) => {
                                console.log(`Looking up user with login: ${login} for notification`);
                                db.get('SELECT id FROM Users WHERE login = ?', [login], (err, user) => {
                                    if (err) {
                                        console.error(`Database error looking up user ${login}:`, err);
                                        return reject(new Error(`Database error for user ${login}: ${err.message}`));
                                    }
                                    if (!user) {
                                        console.warn(`User ${login} not found in database, skipping notification.`);
                                        return resolve();
                                    }

                                    console.log(`Found user ${login} with ID: ${user.id}`);
                                    const message = `Вы были добавлены в мероприятие "${title}", запланированное на ${date}${time ? ' в ' + time : ''}.`;
                                    db.run(
                                        'INSERT INTO Notifications (user_id, message, is_read, created_at) VALUES (?, ?, 0, ?)',
                                        [user.id, message, new Date().toISOString()],
                                        function (err) {
                                            if (err) {
                                                console.error(`Failed to create notification for user ${login}:`, err);
                                                return reject(new Error(`Notification creation failed for ${login}: ${err.message}`));
                                            }
                                            const notificationId = this.lastID;
                                            console.log(`Successfully created notification for user ${login} (ID: ${user.id}) with notification ID: ${notificationId}`);
                                            // Verify the notification was actually inserted
                                            db.get('SELECT * FROM Notifications WHERE id = ?', [notificationId], (err, row) => {
                                                if (err) {
                                                    console.error(`Error verifying notification ${notificationId}:`, err);
                                                    return reject(new Error(`Verification failed for notification ${notificationId}: ${err.message}`));
                                                }
                                                if (!row) {
                                                    console.error(`Notification ${notificationId} was not found in the database after insertion`);
                                                    return reject(new Error(`Notification ${notificationId} was not persisted in the database`));
                                                }
                                                console.log(`Verified notification ${notificationId} exists in the database`);
                                                resolve();
                                            });
                                        }
                                    );
                                });
                            });
                        });

                        Promise.allSettled(notificationPromises).then(results => {
                            const successful = results.filter(result => result.status === 'fulfilled').length;
                            const failed = results.filter(result => result.status === 'rejected').length;
                            const errors = results
                                .filter(result => result.status === 'rejected')
                                .map(result => result.reason.message);

                            if (errors.length > 0) {
                                console.error('Notification errors:', errors);
                            }
                            console.log(`Notification results: ${successful} successful, ${failed} failed`);
                        }).catch(err => {
                            console.error('Unexpected error in notification processing:', err);
                        });
                    } else {
                        console.log('No new participants added, skipping notification creation.');
                    }
                    res.json({ success: true });
                }
            }
        );
        stmt.finalize();
    });
});

// API for joining or leaving an event
app.post('/api/events/:id/:action', isAuthenticated, (req, res) => {
    const eventId = req.params.id;
    const action = req.params.action;
    const login = req.session.login;
    console.log(`Received request: eventId=${eventId}, action=${action}, login=${login}`);

    db.get(`SELECT participants, user_id, title FROM Events WHERE id = ?`, [eventId], (err, row) => {
        if (err) {
            console.error('Database error:', err.message);
            res.status(500).json({ error: 'Ошибка при проверке мероприятия' });
            return;
        }
        if (!row) {
            console.error('Event not found:', eventId);
            res.status(404).json({ error: 'Мероприятие не найдено' });
            return;
        }

        let participants = [];
        try {
            participants = row.participants ? JSON.parse(row.participants) : [];
            if (!Array.isArray(participants)) {
                console.warn(`Invalid participants format for event ${eventId}:`, row.participants);
                participants = [];
            }
        } catch (e) {
            console.error(`Parsing error for participants in event ${eventId}:`, e.message);
            participants = [];
        }
        console.log('Current participants:', participants);

        if (action === 'join') {
            if (participants.includes(login)) {
                console.log('User already participating:', login);
                res.status(400).json({ error: 'Вы уже участвуете в этом мероприятию' });
                return;
            }
            participants.push(login);
        } else if (action === 'leave') {
            const index = participants.indexOf(login);
            console.log('Checking if user is in participants:', { login, index, participants });
            if (index === -1) {
                console.log('User not found in participants:', login);
                res.status(400).json({ error: 'Вы не участвуете в этом мероприятию' });
                return;
            }
            participants.splice(index, 1);
        } else {
            res.status(400).json({ error: 'Недопустимое действие' });
            return;
        }

        const stmt = db.prepare(`UPDATE Events SET participants = ? WHERE id = ?`);
        stmt.run(JSON.stringify(participants), eventId, function (err) {
            if (err) {
                console.error('Update error:', err.message);
                res.status(500).json({ error: 'Ошибка при обновлении мероприятия' });
                return;
            }

            if (action === 'join') {
                const creatorId = row.user_id;
                const message = `${login} присоединился к вашему мероприятию "${row.title}"`;
                const createdAt = new Date().toISOString();
                const notificationStmt = db.prepare(`
                    INSERT INTO Notifications (user_id, message, created_at)
                    VALUES (?, ?, ?)
                `);
                notificationStmt.run(creatorId, message, createdAt, (err) => {
                    if (err) {
                        console.error('Notification error:', err.message);
                    }
                });
                notificationStmt.finalize();
            }

            console.log('Update successful, new participants:', participants);
            res.json({ success: true, participants });
        });
        stmt.finalize();
    });
});

// API для удаления мероприятия
app.delete('/api/events/:id', isAuthenticated, (req, res) => {
    const eventId = req.params.id;
    const userId = req.session.userId;

    db.get(`SELECT id, user_id FROM Events WHERE id = ? AND user_id = ?`, [eventId, userId], (err, row) => {
        if (err) {
            console.error('Ошибка при проверке мероприятия:', err.message);
            res.status(500).json({ error: 'Ошибка при проверке мероприятия' });
            return;
        }
        if (!row) {
            console.warn(`Попытка удаления мероприятия ${eventId} пользователем ${userId}, не являющимся создателем`);
            res.status(403).json({ error: 'Только создатель мероприятия может его удалить' });
            return;
        }

        const stmt = db.prepare(`DELETE FROM Events WHERE id = ?`);
        stmt.run(eventId, function (err) {
            if (err) {
                console.error('Ошибка при удалении мероприятия:', err.message);
                res.status(500).json({ error: 'Ошибка при удалении мероприятия' });
            } else {
                res.json({ success: true });
            }
        });
        stmt.finalize();
    });
});

// API для получения всех мероприятий пользователя
app.get('/api/events/:user_id', isAuthenticated, (req, res) => {
    const userId = req.params.user_id;
    if (parseInt(userId) !== req.session.userId) {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
    console.log(`Запрос на получение мероприятий для userId: ${userId}`);
    db.all(`
        SELECT * FROM Events
        WHERE user_id = ? OR participants LIKE ?
    `, [userId, `%${req.session.login}%`], (err, rows) => {
        if (err) {
            console.error('Ошибка SQL-запроса:', err.message);
            res.status(500).json({ error: 'Ошибка при получении мероприятий' });
            return;
        }
        console.log(`Найдено мероприятий: ${rows.length}`);
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

        console.log('Отправляем ответ:', { success: true, events });
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

// API для получения уведомлений пользователя
app.get('/api/notifications', isAuthenticated, (req, res) => {
    const userId = req.session.userId;
    db.all(`
        SELECT * FROM Notifications
        WHERE user_id = ?
        ORDER BY created_at DESC
    `, [userId], (err, rows) => {
        if (err) {
            console.error('Ошибка при получении уведомлений:', err.message);
            res.status(500).json({ error: 'Ошибка при получении уведомлений' });
            return;
        }
        res.json({ success: true, notifications: rows });
    });
});

// API для создания уведомления
app.post('/api/notifications', isAuthenticated, (req, res) => {
    const { user_id, message } = req.body;
    const createdAt = new Date().toISOString();
    const stmt = db.prepare(`
        INSERT INTO Notifications (user_id, message, created_at)
        VALUES (?, ?, ?)
    `);
    stmt.run(user_id, message, createdAt, function (err) {
        if (err) {
            console.error('Ошибка при создании уведомления:', err.message);
            res.status(500).json({ error: 'Ошибка при создании уведомления' });
        } else {
            res.json({ success: true, notificationId: this.lastID });
        }
    });
    stmt.finalize();
});

// API для удаления уведомления
app.delete('/api/notifications/:id', isAuthenticated, (req, res) => {
    const notificationId = req.params.id;
    const userId = req.session.userId;

    db.get(`SELECT user_id FROM Notifications WHERE id = ?`, [notificationId], (err, row) => {
        if (err) {
            console.error('Ошибка при проверке уведомления:', err.message);
            res.status(500).json({ error: 'Ошибка при проверке уведомления' });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Уведомление не найдено' });
            return;
        }
        if (row.user_id !== userId) {
            res.status(403).json({ error: 'Доступ запрещен' });
            return;
        }

        const stmt = db.prepare(`DELETE FROM Notifications WHERE id = ?`);
        stmt.run(notificationId, function (err) {
            if (err) {
                console.error('Ошибка при удалении уведомления:', err.message);
                res.status(500).json({ error: 'Ошибка при удалении уведомления' });
            } else {
                res.json({ success: true });
            }
        });
        stmt.finalize();
    });
});

// API для пометки уведомления как прочитанного
app.put('/api/notifications/:id/read', isAuthenticated, (req, res) => {
    const notificationId = req.params.id;
    const userId = req.session.userId;

    db.get(`SELECT user_id FROM Notifications WHERE id = ?`, [notificationId], (err, row) => {
        if (err) {
            console.error('Ошибка при проверке уведомления:', err.message);
            res.status(500).json({ error: 'Ошибка при проверке уведомления' });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Уведомление не найдено' });
            return;
        }
        if (row.user_id !== userId) {
            res.status(403).json({ error: 'Доступ запрещен' });
            return;
        }

        const stmt = db.prepare(`UPDATE Notifications SET is_read = 1 WHERE id = ?`);
        stmt.run(notificationId, function (err) {
            if (err) {
                console.error('Ошибка при обновлении уведомления:', err.message);
                res.status(500).json({ error: 'Ошибка при обновлении уведомления' });
            } else {
                res.json({ success: true });
            }
        });
        stmt.finalize();
    });
});

// Static files
app.use(express.static(__dirname));

// Handle non-existing routes
app.use((req, res) => {
    res.status(404).json({ error: 'Маршрут не найден' });
});

// Start the server
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