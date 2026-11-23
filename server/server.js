import express from 'express';
import cors from 'cors';
import {
  getAllBooks,
  getBookById,
  findDuplicate,
  createBook,
  replaceBook,
} from './booksStore.js';
import { parseId, validateBook, isPlainObject, pickBookFields } from './validate.js';


const app = express();

// Configuration from environment variables (with fallbacks)
const PORT = Number(process.env.PORT) || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// CORS: allow ONLY the client's exact origin (never '*')
app.use(cors({ origin: CLIENT_ORIGIN }));

// Parse JSON request bodies (must be registered BEFORE the routes)
app.use(express.json());

// ---------- Helpers ----------

function sendInvalidId(res, rawId) {
  return res
    .status(400)
    .json({ error: `Invalid id "${rawId}": id must be a positive integer` });
}

function sendBookNotFound(res, id) {
  return res.status(404).json({ error: `Book with id ${id} not found` });
}
function sendDuplicate(res, duplicate) {
  return res.status(409).json({
    error: `A book titled "${duplicate.title}" by ${duplicate.author} already exists (id ${duplicate.id})`,
  });
}

// ---------- Routes ----------

// GET /api/books -> list (query options will be added later)
app.get('/api/books', async (req, res) => {
  const books = await getAllBooks();
  res.status(200).json(books);
});

// GET /api/books/:id -> one book
app.get('/api/books/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return sendInvalidId(res, req.params.id);
  }

  const book = await getBookById(id);
  if (!book) {
    return sendBookNotFound(res, id);
  }

  res.status(200).json(book);
});

// POST /api/books -> create a book from a complete body
app.post('/api/books', async (req, res) => {
  const result = validateBook(req.body);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  const duplicate = await findDuplicate(result.book.title, result.book.author);
  if (duplicate) {
    return sendDuplicate(res, duplicate);
  }

  const created = await createBook(result.book);
  res.status(201).location(`/api/books/${created.id}`).json(created);
});
// PUT /api/books/:id -> replace a book with a complete body
app.put('/api/books/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return sendInvalidId(res, req.params.id);
  }

  const existing = await getBookById(id);
  if (!existing) {
    return sendBookNotFound(res, id);
  }

  const result = validateBook(req.body);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  const duplicate = await findDuplicate(result.book.title, result.book.author, id);
  if (duplicate) {
    return sendDuplicate(res, duplicate);
  }

  const updated = await replaceBook(id, result.book);
  res.status(200).json(updated);
});

// PATCH /api/books/:id -> change only the fields sent
app.patch('/api/books/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return sendInvalidId(res, req.params.id);
  }

  const existing = await getBookById(id);
  if (!existing) {
    return sendBookNotFound(res, id);
  }

  if (!isPlainObject(req.body)) {
    return res.status(400).json({ error: 'Request body must be a JSON object' });
  }

  // Merge: existing values + only the known fields that were sent (new object)
  const merged = { ...existing, ...pickBookFields(req.body) };

  // The merged book must pass the same validation as a complete book
  const result = validateBook(merged);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  const duplicate = await findDuplicate(result.book.title, result.book.author, id);
  if (duplicate) {
    return sendDuplicate(res, duplicate);
  }

  const updated = await replaceBook(id, result.book);
  res.status(200).json(updated);
});

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