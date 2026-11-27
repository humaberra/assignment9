import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import {
  getAllBooks,
  getBookById,
  findDuplicate,
  createBook,
  replaceBook,
  deleteBook,
} from './booksStore.js';
import {
  parseId,
  validateBook,
  isPlainObject,
  pickBookFields,
  parseListQuery,
} from './validate.js';

const app = express();

// Configuration from environment variables (with fallbacks)
const PORT = Number(process.env.PORT) || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/readinglist';

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

// Keeps only books matching every given filter (filter returns a new array)
function filterBooks(books, { genre, read, q }) {
  return books.filter(
    (book) =>
      (genre === null || book.genre === genre) &&
      (read === null || book.read === read) &&
      (q === null ||
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q))
  );
}

// Sorts a COPY (toSorted) so the stored array is never changed.
// Books without a rating always go last when sorting by rating.
function sortBooks(books, sort, order) {
  const direction = order === 'desc' ? -1 : 1;

  return books.toSorted((a, b) => {
    if (sort === 'rating') {
      if (a.rating === null && b.rating === null) return a.id - b.id;
      if (a.rating === null) return 1; // a goes after b
      if (b.rating === null) return -1; // b goes after a
      return (a.rating - b.rating) * direction || a.id - b.id;
    }

    if (sort === 'title' || sort === 'author') {
      const byText = a[sort].localeCompare(b[sort], undefined, { sensitivity: 'base' });
      return byText * direction || a.id - b.id;
    }

    // year or id: numeric comparison
    return (a[sort] - b[sort]) * direction || a.id - b.id;
  });
}

function paginate(books, page, limit) {
  const start = (page - 1) * limit;
  return books.slice(start, start + limit); // slice returns a new array
}

// Computes statistics from the CURRENT data (nothing is stored separately)
function computeStats(books) {
  const readCount = books.filter((book) => book.read).length;
  const ratings = books.filter((book) => book.rating !== null).map((book) => book.rating);

  const averageRating =
    ratings.length === 0
      ? null
      : Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 10) / 10;

  // Only genres that have at least one book appear (built immutably)
  const byGenre = books.reduce(
    (counts, book) => ({ ...counts, [book.genre]: (counts[book.genre] ?? 0) + 1 }),
    {}
  );

  return {
    total: books.length,
    read: readCount,
    unread: books.length - readCount,
    averageRating,
    byGenre,
  };
}

// ---------- Routes ----------

// GET /api/books -> list with query options
app.get('/api/books', async (req, res) => {
  const parsed = parseListQuery(req.query);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }

  const books = await getAllBooks();
  const { sort, order, page, limit } = parsed.options;
  const result = paginate(sortBooks(filterBooks(books, parsed.options), sort, order), page, limit);
  res.status(200).json(result);
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

// DELETE /api/books/:id -> delete a book (204, no body)
app.delete('/api/books/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return sendInvalidId(res, req.params.id);
  }

  const deleted = await deleteBook(id);
  if (!deleted) {
    return sendBookNotFound(res, id);
  }

  res.status(204).end();
});

// GET /api/stats -> statistics computed on every request
app.get('/api/stats', async (req, res) => {
  const books = await getAllBooks();
  res.status(200).json(computeStats(books));
});

// GET /api/crash -> deliberately throws inside an async handler.
// Kept on purpose (documented in the README) to prove that Express 5
// forwards rejected promises to the error-handling middleware.
app.get('/api/crash', async () => {
  await getAllBooks();
  throw new Error('Deliberate crash to test the error-handling middleware');
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

// Connect to MongoDB BEFORE accepting requests.
// A short serverSelectionTimeoutMS makes a missing database fail fast.
try {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  console.log(`Connected to MongoDB at ${MONGODB_URI}`);
} catch (error) {
  console.error(`Could not connect to MongoDB at ${MONGODB_URI}: ${error.message}`);
  process.exit(1);
}

app.listen(PORT, (error) => {
  if (error) {
    throw error;
  }
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`Allowed client origin: ${CLIENT_ORIGIN}`);
});