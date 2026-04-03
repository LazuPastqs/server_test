const express = require('express');
const app = express();

// Render сам назначает порт через process.env.PORT
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY;

if (!SECRET_KEY) {
    console.error("❌ SECRET_KEY не найден в настройках Render!");
    process.exit(1);
}

let lastFrame = null;

// Ограничение JSON для экономии памяти на Render
app.use(express.json({ limit: '5mb' }));

function checkKey(req, res, next) {
    const key = req.query.key;
    if (!key || key !== SECRET_KEY) {
        return res.status(403).json({ error: "Invalid key" });
    }
    next();
}

// ПРИЕМ КАДРА
app.post('/frame', checkKey, (req, res) => {
    try {
        const { image } = req.body;
        if (!image) return res.status(400).json({ error: "No image" });

        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        lastFrame = Buffer.from(base64Data, 'base64');

        res.json({ status: "ok" });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// MJPEG СТРИМ
app.get('/video', checkKey, (req, res) => {
    if (!lastFrame) return res.status(404).send("Wait for camera...");

    res.writeHead(200, {
        'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
        'Cache-Control': 'no-cache',
        'Connection': 'close',
        'Pragma': 'no-cache'
    });

    const streamInterval = setInterval(() => {
        if (!lastFrame) return;
        try {
            res.write(`--frame\r\n`);
            res.write(`Content-Type: image/jpeg\r\n`);
            res.write(`Content-Length: ${lastFrame.length}\r\n\r\n`);
            res.write(lastFrame);
            res.write(`\r\n`);
        } catch (e) {
            clearInterval(streamInterval);
        }
    }, 150); // Чуть увеличил интервал для стабильности на Render

    req.on('close', () => {
        clearInterval(streamInterval);
        res.end();
    });
});

// ГЛАВНАЯ
app.get('/', checkKey, (req, res) => {
    res.send(`
        <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="background:#000; color:#0f0; text-align:center; font-family:sans-serif;">
            <h3>RENDER LIVE STREAM</h3>
            <img src="/video?key=${SECRET_KEY}" style="width:100%; max-width:600px; border:1px solid #333;">
            <p>Status: Online</p>
        </body>
        </html>
    `);
});

// Важно: на Render используем '0.0.0.0'
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Сервер на Render запущен на порту ${PORT}`);
});
