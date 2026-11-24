import { useEffect, useState } from 'react';
import { getBooks, createBook, replaceBook } from './api/books.js';
import BookFilters from './components/BookFilters.jsx';
import BookList from './components/BookList.jsx';
import BookForm from './components/BookForm.jsx';

const INITIAL_FILTERS = { q: '', genre: '', read: '', sort: '', order: 'asc' };

export default function App() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [reloadKey, setReloadKey] = useState(0);
  const [editingBook, setEditingBook] = useState(null);

  const refresh = () => setReloadKey((key) => key + 1);

  // Every filter change (or refresh) requests a NEW list from the server.
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

  return (
    <div className="app">
      <h1>Reading List</h1>
      <BookForm
        key={editingBook ? editingBook.id : 'new'}
        book={editingBook}
        onSubmit={handleSubmitForm}
        onCancel={() => setEditingBook(null)}
      />
      <BookFilters filters={filters} onChange={setFilters} />
      <BookList books={books} loading={loading} error={error} onEdit={setEditingBook} />
    </div>
  );
}