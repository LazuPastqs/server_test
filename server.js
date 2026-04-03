const express = require('express');
const app = express();

const PORT = 3000;
const SECRET_KEY = process.env.SECRET_KEY;

if (!SECRET_KEY) {
  console.error("❌ SECRET_KEY не задан в .env");
  process.exit(1);
}

// Храним последний кадр
let lastFrame = null;

// Ограничение размера тела запроса (например до 10MB)
app.use(express.json({ limit: '10mb' }));

// Проверка ключа
function checkKey(req, res, next) {
  const key = req.query.key;

  if (!key || key !== SECRET_KEY) {
    return res.status(403).json({ error: "Invalid key" });
  }

  next();
}

/**
 * Прием кадра (base64 или raw)
 * Пример: POST /frame?key=SECRET
 * body: { image: "base64..." }
 */
app.post('/frame', checkKey, (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    // Убираем data:image/...;base64,
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    lastFrame = Buffer.from(base64Data, 'base64');

    res.json({ status: "ok" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * Отдача последнего кадра
 * Пример: GET /video?key=SECRET
 */
app.get('/video', checkKey, (req, res) => {
  if (!lastFrame) {
    return res.status(404).send("No frame yet");
  }

  res.writeHead(200, {
    'Content-Type': 'image/jpeg',
    'Content-Length': lastFrame.length,
    'Cache-Control': 'no-cache'
  });

  res.end(lastFrame);
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
