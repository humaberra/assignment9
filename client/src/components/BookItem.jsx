// One book in the list (actions are added in a later step)
export default function BookItem({ book }) {
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
    </li>
  );
}