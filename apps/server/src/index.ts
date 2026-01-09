// ** import core packages
import http from 'http';

// ** import logs
import { logger } from '@repo/logs';

const PORT = process.env.PORT || 8787;

const server = http.createServer((req, res) => {
  logger.info(`${req.method} ${req.url}`);

  if (req.url === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'FlowStack Server' }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});
