// API module: the ONLY place in the client that calls fetch or builds URLs.

const BASE_URL = import.meta.env.VITE_API_URL;

if (!BASE_URL) {
  console.error('VITE_API_URL is not set. Copy client/.env.example to client/.env');
}

// Shared helper for every request
async function request(path, { method = 'GET', body, signal } = {}) {
  // Content-Type is set ONLY when there is a body
  const options =
    body === undefined
      ? { method, signal }
      : {
          method,
          signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        };

  const response = await fetch(`${BASE_URL}${path}`, options);

  // 204 No Content: there is no body to read
  if (response.status === 204) {
    return null;
  }

  // Read JSON if possible (an unexpected non-JSON body becomes null)
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // Turn the server's { error } into a real Error
    throw new Error(data?.error ?? `Request failed with status ${response.status}`);
  }

  return data;
}

// Builds "?genre=fiction&q=the%20hobbit" safely, skipping empty values.
// URLSearchParams takes care of encoding special characters.
function toQueryString(params) {
  const entries = Object.entries(params).filter(
    ([, value]) => value !== '' && value !== null && value !== undefined
  );
  const query = new URLSearchParams(entries).toString();
  return query ? `?${query}` : '';
}

export function getBooks(params = {}, signal) {
  return request(`/api/books${toQueryString(params)}`, { signal });
}

export function getBook(id, signal) {
  return request(`/api/books/${encodeURIComponent(id)}`, { signal });
}

export function createBook(book) {
  return request('/api/books', { method: 'POST', body: book });
}

// PUT: replace the whole book
export function replaceBook(id, book) {
  return request(`/api/books/${encodeURIComponent(id)}`, { method: 'PUT', body: book });
}

// PATCH: change only some fields (read, rating)
export function updateBook(id, changes) {
  return request(`/api/books/${encodeURIComponent(id)}`, { method: 'PATCH', body: changes });
}

export function deleteBook(id) {
  return request(`/api/books/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function getStats(signal) {
  return request('/api/stats', { signal });
}