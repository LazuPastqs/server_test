const http = require('http');
const fs = require('fs');

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
      <body style="margin:0;background:black;">
        <img src="/video" style="width:100%;" />
        <br><br>
        <button onclick="fetch('/switch')">Switch Camera</button>
        <button onclick="fetch('/sleep')">Sleep</button>
        <button onclick="fetch('/wake')">Wake</button>
      </body>
      </html>
    `);
  } else if (req.url === '/video') {
    res.writeHead(200, {
      'Content-Type': 'multipart/x-mixed-replace; boundary=frame'
    });
    // В реальности нужно реализовать поток кадров
  } else if (req.url === '/switch') {
    // Логика переключения камеры (если есть)
    res.writeHead(200);
    res.end('OK');
  } else if (req.url === '/sleep') {
    // Логика паузы
    res.writeHead(200);
    res.end('SLEEP');
  } else if (req.url === '/wake') {
    // Логика возобновления
    res.writeHead(200);
    res.end('WAKE');
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(8080, () => {
  console.log('Server listening on http://localhost:8080');
});
