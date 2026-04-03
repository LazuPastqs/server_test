const express = require("express");
const app = express();

// Увеличиваем лимит, так как Base64 строка картинки весит больше обычного текста
app.use(express.raw({
    type: "application/octet-stream",
    limit: "10mb"
}));

const SECRET_KEY = process.env.SECRET_KEY;

// СОСТОЯНИЕ
let lastFrame = null;        // Последний полученный кадр (Base64)
let isSleeping = false;      // Состояние сна
let pendingCommand = null;   // Команда, которую телефон еще не забрал

// Функция проверки ключа
function checkKey(req) {
    const key = req.query.key || req.headers["x-api-key"];
    return key && key === SECRET_KEY;
}

// 1. ИНТЕРФЕЙС УПРАВЛЕНИЯ
app.get("/", (req, res) => {
    if (!checkKey(req)) return res.status(403).send("Forbidden: Invalid Key");

    res.send(`
        <html>
        <head>
            <title>Remote Camera Control</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="margin:0; background:black; color:white; text-align:center; font-family:sans-serif;">
            <h2>Live Stream</h2>
            
            <!-- Картинка обновляется сама каждые 500мс -->
            <div style="width:100%; min-height:300px; background:#111; display:flex; align-items:center; justify-content:center;">
                <img id="stream" src="/video?key=${SECRET_KEY}" style="width:100%; max-width:600px;" />
            </div>

            <br>
            <div style="padding:20px;">
                <button style="padding:15px; margin:5px;" onclick="sendCmd('switch')">Переключить камеру</button>
                <button style="padding:15px; margin:5px; background:red; color:white;" onclick="sendCmd('sleep')">В СОН</button>
                <button style="padding:15px; margin:5px; background:green; color:white;" onclick="sendCmd('wake')">ПРОБУДИТЬ</button>
            </div>

            <script>
                // Обновление кадра
                setInterval(() => {
                    const img = document.getElementById('stream');
                    img.src = "/video?key=${SECRET_KEY}&t=" + Date.now();
                }, 500);

                // Отправка команд на сервер
                function sendCmd(name) {
                    fetch('/' + name + '?key=${SECRET_KEY}')
                        .then(r => r.text())
                        .then(t => alert('Статус: ' + t));
                }
            </script>
        </body>
        </html>
    `);
});

// 2. ПРИЕМ КАДРА (От телефона)
app.post("/frame", (req, res) => {
    if (!checkKey(req)) return res.status(403).send("Forbidden");

    if (isSleeping) return res.sendStatus(204);

    if (!req.body || req.body.length === 0) {
        return res.status(400).send("No frame data");
    }

    // 👉 теперь это БИНАРНЫЙ JPEG (Buffer)
    lastFrame = req.body;

    res.sendStatus(200);
});

// 3. ОТДАЧА КАДРА (В браузер)
app.get("/video", (req, res) => {
    if (!checkKey(req)) return res.status(403).send("Forbidden");
    if (!lastFrame) return res.status(404).send("No frame yet");

    res.writeHead(200, {
        "Content-Type": "image/jpeg",
        "Cache-Control": "no-cache"
    });

    res.end(lastFrame);
});

// 4. ОПРОС КОМАНД (Телефон заходит сюда раз в 2 секунды)
app.get("/get-command", (req, res) => {
    if (!checkKey(req)) return res.status(403).send("Forbidden");
    
    // Отдаем команду и тут же стираем её из памяти сервера
    res.send(pendingCommand || "none");
    pendingCommand = null; 
});

// --- РУЧКИ ДЛЯ КНОПОК ---

app.get("/switch", (req, res) => {
    if (!checkKey(req)) return res.status(403).send("Forbidden");
    pendingCommand = "switch";
    res.send("Команда на переключение отправлена");
});

app.get("/sleep", (req, res) => {
    if (!checkKey(req)) return res.status(403).send("Forbidden");
    isSleeping = true;
    pendingCommand = "sleep";
    res.send("Режим сна активирован");
});

app.get("/wake", (req, res) => {
    if (!checkKey(req)) return res.status(403).send("Forbidden");
    isSleeping = false;
    pendingCommand = "wake";
    res.send("Пробуждение отправлено");
});

// ЗАПУСК
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log("Server started on port " + PORT);
});
