// One book in the list. Controls show the SERVER's data:
// the checkbox and rating only change after the server confirms.
export default function BookItem({ book, busy, onEdit, onToggleRead, onRate, onDelete }) {
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
        <label className="inline">
          <input
            type="checkbox"
            checked={book.read}
            disabled={busy}
            onChange={() => onToggleRead(book)}
          />
          Read
        </label>

        <select
          aria-label={`Rating for ${book.title}`}
          value={book.rating ?? ''}
          disabled={busy || !book.read}
          onChange={(e) => onRate(book, e.target.value === '' ? null : Number(e.target.value))}
        >
          <option value="">No rating</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n} ★
            </option>
          ))}
        </select>

        <button type="button" disabled={busy} onClick={() => onEdit(book)}>
          Edit
        </button>
        <button type="button" disabled={busy} onClick={() => onDelete(book)}>
          Delete
        </button>
      </div>
    </li>
  );
}