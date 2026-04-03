const express = require("express");
const app = express();

app.use(express.json());

// 🔐 ключ из переменной окружения
const SECRET_KEY = process.env.SECRET_KEY;

// 📸 состояние
let lastFrame = null;
let isSleeping = false;
let cameraIndex = 0;

// 🔑 проверка ключа
function checkKey(req) {
    const key = req.query.key || req.headers["x-api-key"];
    return key && key === SECRET_KEY;
}

// 🖥 HTML интерфейс
app.get("/", (req, res) => {
    if (!checkKey(req)) {
        return res.status(403).send("Forbidden");
    }

    res.send(`
        <html>
        <body style="margin:0;background:black;text-align:center;">
            <h3 style="color:white;">Camera Stream</h3>

            <img src="/video?key=${SECRET_KEY}" style="width:100%;" />

            <br><br>

            <button onclick="fetch('/switch?key=${SECRET_KEY}')">
                Switch Camera
            </button>

            <button onclick="fetch('/sleep?key=${SECRET_KEY}')">
                Sleep
            </button>

            <button onclick="fetch('/wake?key=${SECRET_KEY}')">
                Wake
            </button>
        </body>
        </html>
    `);
});

// 📥 получение кадра с телефона
app.post("/frame", (req, res) => {
    if (!checkKey(req)) {
        return res.status(403).send("Forbidden");
    }

    if (isSleeping) {
        return res.send("sleeping");
    }

    if (!req.body || !req.body.frame) {
        return res.status(400).send("No frame");
    }

    lastFrame = req.body.frame;
    res.send("ok");
});

// 📺 отдача видео (как изображение)
app.get("/video", (req, res) => {
    if (!checkKey(req)) {
        return res.status(403).send("Forbidden");
    }

    if (!lastFrame) {
        return res.send("no frame");
    }

    // base64 → картинка
    const img = Buffer.from(lastFrame, "base64");

    res.writeHead(200, {
        "Content-Type": "image/jpeg",
        "Content-Length": img.length
    });

    res.end(img);
});

// 🔄 переключение камеры
app.get("/switch", (req, res) => {
    if (!checkKey(req)) {
        return res.status(403).send("Forbidden");
    }

    cameraIndex = cameraIndex === 0 ? 1 : 0;

    console.log("Switch camera:", cameraIndex);

    res.send("switched");
});

// 😴 sleep
app.get("/sleep", (req, res) => {
    if (!checkKey(req)) {
        return res.status(403).send("Forbidden");
    }

    isSleeping = true;
    console.log("Camera sleeping");

    res.send("sleep");
});

// 🔔 wake
app.get("/wake", (req, res) => {
    if (!checkKey(req)) {
        return res.status(403).send("Forbidden");
    }

    isSleeping = false;
    console.log("Camera awake");

    res.send("wake");
});

// 🔥 тест
app.get("/ping", (req, res) => {
    res.send("pong");
});

// 🚀 запуск
const PORT = process.env.PORT || 1000;
app.listen(PORT, () => {
    console.log("Server started on port " + PORT);
});