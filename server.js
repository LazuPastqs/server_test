require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Твой секретный ключ из переменной окружения
const SECRET_KEY = process.env.SECRET_KEY;

if (!SECRET_KEY) {
    console.error("ОШИБКА: Установите SECRET_KEY в .env или настройках сервера!");
    process.exit(1);
}

let latestFrame = null;

// Принимаем бинарный JPEG
app.use(bodyParser.raw({ type: 'image/jpeg', limit: '10mb' }));

// Middleware для проверки ключа (общий для всех путей)
const authMiddleware = (req, res, next) => {
    const userKey = req.query.key;
    if (userKey === SECRET_KEY) {
        next(); // Ключ верный, пропускаем дальше
    } else {
        console.log(`[Блокировка] Неверный ключ от: ${req.ip}`);
        res.status(403).send('Доступ запрещен: Неверный ключ');
    }
};

// 1. Прием кадров от Android (нужен ?key=...)
app.post('/frame', authMiddleware, (req, res) => {
    if (req.body && req.body.length > 0) {
        latestFrame = req.body;
        res.status(200).send('OK');
    } else {
        res.status(400).send('Empty body');
    }
});

// 2. Получение кадра для просмотра (нужен ?key=...)
app.get('/stream', authMiddleware, (req, res) => {
    if (!latestFrame) {
        return res.status(404).send('Стрим пока не запущен');
    }
    res.set('Content-Type', 'image/jpeg');
    res.send(latestFrame);
});

// 3. Веб-интерфейс (нужен ?key=...)
app.get('/', authMiddleware, (req, res) => {
    // Передаем ключ в JavaScript, чтобы он подставлял его в запросы к /stream
    res.send(`
        <html>
            <body style="background:#000; color:#fff; display:flex; flex-direction:column; align-items:center;">
                <h2>Private Stream Active</h2>
                <img id="monitor" src="/stream?key=${SECRET_KEY}" style="max-width:95%; border:2px solid red;" />
                <script>
                    const key = "${SECRET_KEY}";
                    setInterval(() => {
                        // Обновляем картинку, сохраняя ключ в параметрах
                        document.getElementById('monitor').src = "/stream?key=" + key + "&t=" + Date.now();
                    }, 150);
                </script>
            </body>
        </html>
    `);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Сервер запущен. Порт: ${PORT}`);
    console.log(`Доступ по ключу: ${SECRET_KEY}`);
});
