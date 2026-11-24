import { useEffect, useState } from 'react';
import {
  getBooks,
  createBook,
  replaceBook,
  updateBook,
  deleteBook,
  getStats,
} from './api/books.js';
import BookFilters from './components/BookFilters.jsx';
import BookList from './components/BookList.jsx';
import BookForm from './components/BookForm.jsx';
import StatsPanel from './components/StatsPanel.jsx';

const INITIAL_FILTERS = { q: '', genre: '', read: '', sort: '', order: 'asc' };

export default function App() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [reloadKey, setReloadKey] = useState(0);
  const [editingBook, setEditingBook] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(null);

  // Called after every successful change: reloads the list AND the statistics
  const refresh = () => setReloadKey((key) => key + 1);

  // List: every filter change (or refresh) requests a NEW list from the server.
  // The cleanup aborts the previous request, so a stale response never wins.
  useEffect(() => {
    const controller = new AbortController();

    async function loadBooks() {
      setLoading(true);
      setError(null);
      try {
        const data = await getBooks(filters, controller.signal);
        setBooks(data);
      } catch (err) {
        if (err.name === 'AbortError') {
          return; // cancelled on purpose: not a real error
        }
        setError(err.message);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadBooks();
    return () => controller.abort();
  }, [filters, reloadKey]);

  // Statistics: loaded at start and refreshed after every successful change
  useEffect(() => {
    const controller = new AbortController();

    async function loadStats() {
      try {
        const data = await getStats(controller.signal);
        setStats(data);
        setStatsError(null);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setStatsError(err.message);
        }
      }
    }

    loadStats();
    return () => controller.abort();
  }, [reloadKey]);

  // The screen changes only AFTER the server confirms (no optimistic updates).
  // Errors are re-thrown to the form, which shows the server's message.
  async function handleSubmitForm(data) {
    if (editingBook) {
      const updated = await replaceBook(editingBook.id, data); // PUT
      setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      setEditingBook(null);
    } else {
      const created = await createBook(data); // POST
      setBooks((prev) => [...prev, created]);
    }
    refresh();
  }

  // Shared wrapper for row actions: disables that row, shows server errors
  async function runAction(bookId, action) {
    setBusyId(bookId);
    setActionError(null);
    try {
      await action();
      refresh();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  function replaceInList(updated) {
    setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  }

  function handleToggleRead(book) {
    // Marking as unread must also clear the rating (rating needs read = true)
    const changes = book.read ? { read: false, rating: null } : { read: true };
    runAction(book.id, async () => {
      replaceInList(await updateBook(book.id, changes)); // PATCH
    });
  }

  function handleRate(book, rating) {
    runAction(book.id, async () => {
      replaceInList(await updateBook(book.id, { rating })); // PATCH
    });
  }

  function handleDelete(book) {
    if (!window.confirm(`Delete "${book.title}"?`)) {
      return;
    }
    runAction(book.id, async () => {
      await deleteBook(book.id); // DELETE (204)
      setBooks((prev) => prev.filter((b) => b.id !== book.id));
      if (editingBook?.id === book.id) {
        setEditingBook(null);
      }
    });
  }

  return (
    <div className="app">
      <h1>Reading List</h1>
      <div className="layout">
        <main>
          <BookForm
            key={editingBook ? editingBook.id : 'new'}
            book={editingBook}
            onSubmit={handleSubmitForm}
            onCancel={() => setEditingBook(null)}
          />
          <BookFilters filters={filters} onChange={setFilters} />
          {actionError && (
            <p className="error" role="alert">
              {actionError}
            </p>
          )}
          <BookList
            books={books}
            loading={loading}
            error={error}
            busy={false}
            onEdit={setEditingBook}
            onToggleRead={handleToggleRead}
            onRate={handleRate}
            onDelete={handleDelete}
            busyId={busyId}
          />
        </main>
        <aside>
          <StatsPanel stats={stats} error={statsError} />
        </aside>
      </div>
    </div>
  );
}