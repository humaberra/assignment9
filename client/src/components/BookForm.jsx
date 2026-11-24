import { useState } from 'react';
import { GENRES } from '../constants.js';

const EMPTY_VALUES = { title: '', author: '', year: '', genre: 'fiction', read: false, rating: '' };

function toFormValues(book) {
  if (!book) {
    return EMPTY_VALUES;
  }
  return {
    title: book.title,
    author: book.author,
    year: String(book.year),
    genre: book.genre,
    read: book.read,
    rating: book.rating === null ? '' : String(book.rating),
  };
}

// Used for both adding (book = null) and editing (book = the book to replace)
export default function BookForm({ book, onSubmit, onCancel }) {
  const [values, setValues] = useState(() => toFormValues(book));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const isEditing = book !== null;

  function update(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  // Unchecking "read" also clears the rating (a rating needs read = true)
  function handleReadChange(checked) {
    setValues((prev) => ({ ...prev, read: checked, rating: checked ? prev.rating : '' }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title: values.title,
        author: values.author,
        year: values.year === '' ? null : Number(values.year),
        genre: values.genre,
        read: values.read,
        rating: values.rating === '' ? null : Number(values.rating),
      });
      if (!isEditing) {
        setValues(EMPTY_VALUES);
      }
    } catch (err) {
      // Show the SERVER's message (duplicate, invalid year, ...)
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <h2>{isEditing ? `Edit book #${book.id}` : 'Add a book'}</h2>

      <div className="form-grid">
        <label>
          Title
          <input value={values.title} onChange={(e) => update('title', e.target.value)} />
        </label>
        <label>
          Author
          <input value={values.author} onChange={(e) => update('author', e.target.value)} />
        </label>
        <label>
          Year
          <input type="number" value={values.year} onChange={(e) => update('year', e.target.value)} />
        </label>
        <label>
          Genre
          <select value={values.genre} onChange={(e) => update('genre', e.target.value)}>
            {GENRES.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </label>
        <label className="inline">
          <input
            type="checkbox"
            checked={values.read}
            onChange={(e) => handleReadChange(e.target.checked)}
          />
          Read
        </label>
        <label>
          Rating
          <select
            value={values.rating}
            disabled={!values.read}
            onChange={(e) => update('rating', e.target.value)}
          >
            <option value="">No rating</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} ★
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="form-actions">
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Add book'}
        </button>
        {isEditing && (
          <button type="button" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}