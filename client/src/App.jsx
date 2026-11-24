import { useEffect, useState } from 'react';
import { getBooks } from './api/books.js';
import BookFilters from './components/BookFilters.jsx';
import BookList from './components/BookList.jsx';

const INITIAL_FILTERS = { q: '', genre: '', read: '', sort: '', order: 'asc' };

export default function App() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  // Every filter change requests a NEW list from the server.
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
  }, [filters]);

  return (
    <div className="app">
      <h1>Reading List</h1>
      <BookFilters filters={filters} onChange={setFilters} />
      <BookList books={books} loading={loading} error={error} />
    </div>
  );
}