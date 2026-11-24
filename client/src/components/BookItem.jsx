// One book in the list
export default function BookItem({ book, onEdit }) {
  return (
    <li className="book">
      <div>
        <strong>{book.title}</strong>{' '}
        <span className="muted">
          by {book.author} ({book.year})
        </span>
        <div className="muted">
          {book.genre} · {book.read ? 'Read' : 'Not read'} ·{' '}
          {book.rating === null ? 'No rating' : '★'.repeat(book.rating)}
        </div>
      </div>
      <div className="book-actions">
        <button type="button" onClick={() => onEdit(book)}>
          Edit
        </button>
      </div>
    </li>
  );
}