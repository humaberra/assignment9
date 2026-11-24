import BookItem from './BookItem.jsx';

// Shows the loading, error and empty states, or the list itself.
// Any extra props (onEdit, onDelete, ...) are passed down to each BookItem.
export default function BookList({ books, loading, error, ...itemProps }) {
  if (loading) {
    return <p className="muted">Loading books…</p>;
  }

  if (error) {
    return (
      <p className="error" role="alert">
        Could not load books: {error}
      </p>
    );
  }

  if (books.length === 0) {
    return <p className="muted">No books found.</p>;
  }

  return (
    <ul className="book-list">
      {books.map((book) => (
        <BookItem key={book.id} book={book} {...itemProps} />
      ))}
    </ul>
  );
}