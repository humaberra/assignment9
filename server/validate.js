// Validation helpers. No libraries: everything is written by hand.

export const GENRES = ['fiction', 'non-fiction', 'science', 'history', 'fantasy', 'other'];

const MIN_YEAR = 1000;
const MAX_TEXT_LENGTH = 100;

// Route parameters are always strings. Accept only positive integers
// written with digits only ("1", "42"); reject "0", "-1", "1.5", "abc", "01".
export function parseId(value) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    return null;
  }
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

// true for { ... }, false for null, arrays, strings, numbers, undefined
export function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function checkText(value, field, errors) {
  if (typeof value !== 'string') {
    errors.push(`${field} is required and must be a string`);
    return;
  }
  const length = value.trim().length;
  if (length < 1 || length > MAX_TEXT_LENGTH) {
    errors.push(`${field} must be 1 to ${MAX_TEXT_LENGTH} characters after trimming (got ${length})`);
  }
}

// Validates a COMPLETE book (used for POST, PUT and the merged PATCH result).
// Returns { book } with clean data, or { error } with a message.
// Only known fields are copied, so "id" and unknown fields are ignored.
export function validateBook(input) {
  if (!isPlainObject(input)) {
    return { error: 'Request body must be a JSON object' };
  }

  const errors = [];
  const currentYear = new Date().getFullYear();

  const { title, author, year, genre } = input;
  const read = input.read === undefined ? false : input.read; // default false
  const rating = input.rating === undefined ? null : input.rating; // default null

  checkText(title, 'title', errors);
  checkText(author, 'author', errors);

  if (!Number.isInteger(year) || year < MIN_YEAR || year > currentYear) {
    errors.push(`year must be an integer between ${MIN_YEAR} and ${currentYear}`);
  }

  if (!GENRES.includes(genre)) {
    errors.push(`genre must be one of: ${GENRES.join(', ')}`);
  }

  if (typeof read !== 'boolean') {
    errors.push('read must be a boolean (true or false)');
  }

  if (rating !== null) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      errors.push('rating must be an integer from 1 to 5, or null');
    } else if (read !== true) {
      errors.push('rating is only allowed when read is true');
    }
  }

  if (errors.length > 0) {
    return { error: errors.join('; ') };
  }

  return {
    book: {
      title: title.trim(),
      author: author.trim(),
      year,
      genre,
      read,
      rating,
    },
  };
}