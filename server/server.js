import express from 'express';
import cors from 'cors';

const app = express();

// Configuration from environment variables (with fallbacks)
const PORT = Number(process.env.PORT) || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// CORS: allow ONLY the client's exact origin (never '*')
app.use(cors({ origin: CLIENT_ORIGIN }));

// Parse JSON request bodies (must be registered BEFORE the routes)
app.use(express.json());

// ---------- Routes will go here ----------

// 404 fallback: any /api request that matched no route
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error-handling middleware (4 parameters, registered after all routes)
app.use((err, req, res, next) => {
  // If a response was already started, let Express close the connection
  if (res.headersSent) {
    return next(err);
  }

  // Malformed JSON body -> 400 with a JSON error (not Express's HTML page)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body contains malformed JSON' });
  }

  // Anything else: log on the server, hide details from the client
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

app.listen(PORT, (error) => {
  if (error) {
    throw error;
  }
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`Allowed client origin: ${CLIENT_ORIGIN}`);
});