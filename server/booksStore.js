// In-memory data store for books.
// Every function is async and waits briefly to simulate a slow data source.
// Data is NEVER modified in place: each change builds a new array / new object.

const SIMULATED_DELAY_MS = 50;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Seed data: 7 books, 5 genres, some read, some rated
let books = [
  { id: 1, title: 'Dune', author: 'Frank Herbert', year: 1965, genre: 'fiction', read: true, rating: 5 },
  { id: 2, title: 'The Hobbit', author: 'J.R.R. Tolkien', year: 1937, genre: 'fantasy', read: true, rating: 4 },
  { id: 3, title: 'Sapiens', author: 'Yuval Noah Harari', year: 2011, genre: 'history', read: true, rating: null },
  { id: 4, title: 'A Brief History of Time', author: 'Stephen Hawking', year: 1988, genre: 'science', read: false, rating: null },
  { id: 5, title: '1984', author: 'George Orwell', year: 1949, genre: 'fiction', read: true, rating: 5 },
  { id: 6, title: 'The Name of the Wind', author: 'Patrick Rothfuss', year: 2007, genre: 'fantasy', read: false, rating: null },
  { id: 7, title: 'Atomic Habits', author: 'James Clear', year: 2018, genre: 'non-fiction', read: false, rating: null },
];

// Next id is always one more than the highest existing id
let nextId = Math.max(...books.map((book) => book.id)) + 1;

export async function getAllBooks() {
  await wait(SIMULATED_DELAY_MS);
  return books;
}

export async function getBookById(id) {
  await wait(SIMULATED_DELAY_MS);
  return books.find((book) => book.id === id) ?? null;
}

// Returns a book with the same title AND author (case-insensitive),
// ignoring the book whose id is excludeId (used by PUT / PATCH).
export async function findDuplicate(title, author, excludeId = null) {
  await wait(SIMULATED_DELAY_MS);
  const t = title.trim().toLowerCase();
  const a = author.trim().toLowerCase();
  return (
    books.find(
      (book) =>
        book.id !== excludeId &&
        book.title.toLowerCase() === t &&
        book.author.toLowerCase() === a
    ) ?? null
  );
}

export async function createBook(data) {
  await wait(SIMULATED_DELAY_MS);
  // id is assigned by the server and placed last so it can never be overwritten
  const newBook = { ...data, id: nextId };
  nextId += 1;
  books = [...books, newBook]; // new array, the old one is untouched
  return newBook;
}

export async function replaceBook(id, data) {
  await wait(SIMULATED_DELAY_MS);
  const exists = books.some((book) => book.id === id);
  if (!exists) {
    return null;
  }
  const updatedBook = { ...data, id };
  books = books.map((book) => (book.id === id ? updatedBook : book)); // new array
  return updatedBook;
}

export async function deleteBook(id) {
  await wait(SIMULATED_DELAY_MS);
  const exists = books.some((book) => book.id === id);
  if (!exists) {
    return false;
  }
  books = books.filter((book) => book.id !== id); // new array
  return true;
}