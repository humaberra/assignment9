import { useEffect, useState } from 'react';
import { getBooks } from './api/books.js';
import BookList from './components/BookList.jsx';

export default function App() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load the list from the server.
  // The cleanup aborts the request, so a stale response never overwrites a newer one.
  useEffect(() => {
    const controller = new AbortController();

    async function loadBooks() {
      setLoading(true);
      setError(null);
      try {
        const data = await getBooks({}, controller.signal);
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
  }, []);

  return (
    <div className="app">
      <h1>Reading List</h1>
      <BookList books={books} loading={loading} error={error} />
    </div>
  );
}