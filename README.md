# Assignment 9 – Reading List (Full-Stack)

A REST API built with **Node.js + Express 5** and a **React** client built with **Vite**.
The server keeps the books **in memory**, so data returns to the seed when it restarts.

## How to install and run

Requirements: Node.js (LTS) and npm. Run the server and the client in two terminals.

### Server (default port 3000)

```bash
cd server
npm install
npm run dev     # node --watch server.js (restarts on file changes)
# or
npm start       # node server.js
```

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `3000` | Port the API listens on |
| `CLIENT_ORIGIN` | `http://localhost:5173` | The **only** origin allowed by CORS |

Example with custom values (Git Bash): `PORT=4000 CLIENT_ORIGIN=http://localhost:5173 npm run dev`

### Client (default port 5173)

```bash
cd client
npm install
cp .env.example .env    # VITE_API_URL=http://localhost:3000
npm run dev
```

Open http://localhost:5173. **No Vite proxy** is configured: the browser calls the API directly and the server answers with CORS headers from the `cors` package.

## File organization

```
assignment9/
├─ server/
│  ├─ server.js        Express app: CORS, express.json(), routes, 404 fallback, error middleware
│  ├─ booksStore.js    In-memory data; async functions with a short simulated delay; never mutates
│  ├─ validate.js      Hand-written validation (id, book body, query options)
│  └─ package.json     "type": "module", scripts start / dev
├─ client/
│  ├─ src/
│  │  ├─ api/books.js        All fetch calls + shared request helper
│  │  ├─ components/         BookFilters, BookForm, BookList, BookItem, StatsPanel
│  │  ├─ constants.js        Genre list
│  │  ├─ App.jsx             State, data loading (AbortController), actions
│  │  └─ main.jsx            Entry point
│  ├─ .env.example     Documents VITE_API_URL
│  └─ index.html
├─ .gitignore          Ignores node_modules and every .env file (keeps .env.example)
└─ README.md
```

## API overview and design decisions

| Method and path | Success | Errors |
| --- | --- | --- |
| `GET /api/books` | 200 | 400 |
| `GET /api/books/:id` | 200 | 400, 404 |
| `POST /api/books` | 201 + `Location` | 400, 409 |
| `PUT /api/books/:id` | 200 | 400, 404, 409 |
| `PATCH /api/books/:id` | 200 | 400, 404, 409 |
| `DELETE /api/books/:id` | 204 (no body) | 400, 404 |
| `GET /api/stats` | 200 | — |

- **Complete body** (POST / PUT) means `title`, `author`, `year` and `genre` are required; `read` defaults to `false` and `rating` to `null` when they are missing.
- `year` must be a real JSON number (the string `"2000"` is rejected); the upper limit is the current year, computed on each request.
- PATCH merges the existing book with the known fields that were sent and validates the merged result. Marking a rated book as unread therefore needs `{"read": false, "rating": null}`; the client sends exactly that.
- The duplicate check (title + author, case-insensitive, after trimming) ignores the book being updated.
- `averageRating` is rounded to one decimal place.
- Unknown query parameters are ignored; an empty `q` means "no search".
- **`GET /api/crash` is kept on purpose**: it throws inside an `async` handler to prove that Express 5 forwards the rejected promise to the error-handling middleware, which logs the error on the server and answers `500 {"error":"Something went wrong"}` without a stack trace.

## Testing evidence (curl)

The server was restarted before these requests, so the data starts from the seed.


### 1. GET /api/stats before any change (200)
```
$ curl --include http://localhost:3000/api/stats
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 127
ETag: W/"7f-cgFHV3yVAriWsfM1+k8YUwTAOoo"
Date: Tue, 24 Nov 2026 19:32:00 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"total":7,"read":4,"unread":3,"averageRating":4.7,"byGenre":{"fiction":2,"fantasy":2,"history":1,"science":1,"non-fiction":1}}
```

### 2. List with three query parameters combined (200)

```
$ curl --include http://localhost:3000/api/books?genre=fiction&sort=year&order=desc
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 205
ETag: W/"cd-hp+22CLqj2j/rAk0w3ePGBoXJJo"
Date: Tue, 24 Nov 2026 19:32:00 GMT
Connection: keep-alive
Keep-Alive: timeout=5

[{"id":1,"title":"Dune","author":"Frank Herbert","year":1965,"genre":"fiction","read":true,"rating":5},{"id":5,"title":"1984","author":"George Orwell","year":1949,"genre":"fiction","read":true,"rating":5}]
```

### 3. One book (200)

```
$ curl --include http://localhost:3000/api/books/2
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 108
ETag: W/"6c-Njgao7QYoRqPB4F+UzLFWSwohrQ"
Date: Tue, 24 Nov 2026 19:32:00 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"id":2,"title":"The Hobbit","author":"J.R.R. Tolkien","year":1937,"genre":"fantasy","read":true,"rating":4}
```

### 4. Create a book (201 + Location header)

```
$ curl --include -X POST http://localhost:3000/api/books -H Content-Type: application/json -d {"title":"Clean Code","author":"Robert C. Martin","year":2008,"genre":"other"}
HTTP/1.1 201 Created
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Location: /api/books/8
Content-Type: application/json; charset=utf-8
Content-Length: 112
ETag: W/"70-HVXJpZOC5f3ApfdMwwerUhvvRTk"
Date: Tue, 24 Nov 2026 19:32:01 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"title":"Clean Code","author":"Robert C. Martin","year":2008,"genre":"other","read":false,"rating":null,"id":8}
```

### 5. Invalid body (400)

```
$ curl --include -X POST http://localhost:3000/api/books -H Content-Type: application/json -d {"title":"","author":"X","year":3000,"genre":"poetry"}
HTTP/1.1 400 Bad Request
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 193
ETag: W/"c1-QWbbt0IQyTcF9nhLIBFEqpy6b+k"
Date: Tue, 24 Nov 2026 19:32:02 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"title must be 1 to 100 characters after trimming (got 0); year must be an integer between 1000 and 2026; genre must be one of: fiction, non-fiction, science, history, fantasy, other"}
```

### 6. Repeated query parameter (400)

```
$ curl --include http://localhost:3000/api/books?genre=fiction&genre=history
HTTP/1.1 400 Bad Request
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 55
ETag: W/"37-8pR1kKbNTURjBwXLtJvNqG3oFeQ"
Date: Tue, 24 Nov 2026 19:32:02 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Query parameter must not be repeated: genre"}
```

### 7. Missing book (404)

```
$ curl --include http://localhost:3000/api/books/999
HTTP/1.1 404 Not Found
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 38
ETag: W/"26-NCNuNg8Bq8kpSh64K6XedJL3BrE"
Date: Tue, 24 Nov 2026 19:32:02 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Book with id 999 not found"}
```

### 8. Duplicate title + author, different case (409)

```
$ curl --include -X POST http://localhost:3000/api/books -H Content-Type: application/json -d {"title":"  dune ","author":"FRANK HERBERT","year":1965,"genre":"fiction"}
HTTP/1.1 409 Conflict
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 73
ETag: W/"49-MOrtwuQ1CupU1B/XRrVTXNV98Tw"
Date: Tue, 24 Nov 2026 19:32:02 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"A book titled \"Dune\" by Frank Herbert already exists (id 1)"}
```

### 9a. PATCH book 5: only the rating changes (200)

```
$ curl --include -X PATCH http://localhost:3000/api/books/5 -H Content-Type: application/json -d {"rating":4}
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 101
ETag: W/"65-0hYmNByqPj7RN55JqQBwVxm1IM4"
Date: Tue, 24 Nov 2026 19:32:03 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"title":"1984","author":"George Orwell","year":1949,"genre":"fiction","read":true,"rating":4,"id":5}
```

### 9b. PUT book 5: complete replacement, read/rating fall back to defaults (200)

```
$ curl --include -X PUT http://localhost:3000/api/books/5 -H Content-Type: application/json -d {"title":"1984","author":"George Orwell","year":1949,"genre":"fiction"}
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 105
ETag: W/"69-Qn/JsBse66SRqDpcLVtd+ZdNC4g"
Date: Tue, 24 Nov 2026 19:32:03 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"title":"1984","author":"George Orwell","year":1949,"genre":"fiction","read":false,"rating":null,"id":5}
```

### 10a. Delete a book (204, no body)

```
$ curl --include -X DELETE http://localhost:3000/api/books/6
HTTP/1.1 204 No Content
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Date: Tue, 24 Nov 2026 19:32:03 GMT
Connection: keep-alive
Keep-Alive: timeout=5


```

### 10b. Same delete repeated (404)

```
$ curl --include -X DELETE http://localhost:3000/api/books/6
HTTP/1.1 404 Not Found
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 36
ETag: W/"24-Lp+oxIj9Y3qlelrrZ9nE//0f6yY"
Date: Tue, 24 Nov 2026 19:32:04 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Book with id 6 not found"}
```

### 11. GET /api/stats after the changes (200)

```
$ curl --include http://localhost:3000/api/stats
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 127
ETag: W/"7f-mwVD7rNCmoa6+LuxlPV9gllLyNE"
Date: Tue, 24 Nov 2026 19:32:04 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"total":6,"read":3,"unread":3,"averageRating":4.5,"byGenre":{"fiction":2,"fantasy":1,"history":1,"science":1,"non-fiction":1}}
```

### 12. Malformed JSON body (400, JSON error)

```
$ curl --include -X POST http://localhost:3000/api/books -H Content-Type: application/json -d {"title": 
HTTP/1.1 400 Bad Request
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 48
ETag: W/"30-aN4vOcZSAqz3S4T1znDK+th71A4"
Date: Tue, 24 Nov 2026 19:32:04 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Request body contains malformed JSON"}
```

### 13. Unknown /api route (404)

```
$ curl --include http://localhost:3000/api/nothing
HTTP/1.1 404 Not Found
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 21
ETag: W/"15-bm7tJgu8FHlq5QU+Y6gDxOGPfRc"
Date: Tue, 24 Nov 2026 19:32:04 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Not found"}
```

### 14. Deliberate crash in an async handler (500)

```
$ curl --include http://localhost:3000/api/crash
HTTP/1.1 500 Internal Server Error
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 32
ETag: W/"20-cI8B1wZuBEyTE5ClDvphKZx7wd0"
Date: Tue, 24 Nov 2026 19:32:05 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Something went wrong"}
```



## CORS preflight evidence

Toggling "read" in the browser sends a `PATCH` with a JSON body. Because it uses the `PATCH` method and a `Content-Type: application/json` header, it is not a "simple request", so the browser first sends a preflight. In the Network tab I saw:

- Request: `OPTIONS http://localhost:3000/api/books/1` – Status **204 No Content**
- Request headers: `Origin: http://localhost:5173`, `Access-Control-Request-Method: PATCH`, `Access-Control-Request-Headers: content-type`
- Response headers: `Access-Control-Allow-Origin: http://localhost:5173`, `Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE`, `Access-Control-Allow-Headers: content-type`
- Only after this preflight succeeded did the browser send the real `PATCH` request (status 200), and then the list and `/api/stats` were reloaded.

## Reasoning questions

**1. Parameters.** The `id` identifies one specific resource, so it belongs in the path: `/api/books/3` *is* book 3, and PUT, PATCH and DELETE act on that exact address. `genre` and `sort` do not name a resource; they are optional ways to view the same collection (`/api/books`), so they are query parameters and can be combined or left out. If `id` were in the query string (`/api/books?id=3`), every book would share the same URL, the route could not tell "list" from "one book", and a missing book would look like an empty filter result instead of a clear `404`.

**2. Body parsing (experiment).** I moved `app.use(express.json())` below the routes and sent a valid `POST /api/books`. The server answered `400 {"error":"Request body must be a JSON object"}`, because `req.body` was `undefined`: middleware runs in the order it is registered, so the JSON parser had not run yet when the route handler read the body.

**3. One response (experiment).** I removed the `return` before `sendBookNotFound(res, id)` in `GET /api/books/:id` and requested `/api/books/999`. curl still received the `404`, but the handler kept running and reached `res.status(200).json(book)`, so the server terminal showed an `ERR_HTTP_HEADERS_SENT` error ("Cannot set headers after they are sent to the client"). Sending a response does not stop the function; only `return` does, which is why every early response needs it.

**4. PUT and PATCH.** PATCH is the better choice when only one or two fields change, for example ticking "read" or choosing a rating in the list: the client sends just `{"rating": 4}` and the rest of the book is kept. PUT is the better choice in the edit form, where the user sees and submits the whole book, so the client sends a complete replacement. The curl evidence (9a/9b) shows the difference: after PUT without `read` and `rating`, those fields went back to their defaults.

**5. CORS (experiment).** With `CLIENT_ORIGIN=http://localhost:9999`, the page showed an error and the browser console reported that the request was blocked by CORS policy because the `Access-Control-Allow-Origin` header did not match `http://localhost:5173`. The server printed nothing (it does not log requests) and still answered normally; it was the browser that refused to give the response to JavaScript. curl still works because CORS is a rule enforced by browsers to protect users, not a server-side firewall, and curl does not apply it.

**6. Validation.** Client-side checks only improve the user experience; anyone can bypass them with curl, Postman, the browser console or a modified client. Some rules, such as the duplicate check, can only be decided by the server because only it has all the data. The server owns the data, so it must validate every request itself.

**7. State (experiment).** Every time the server restarted (including automatic restarts by `node --watch`), all added, edited and deleted books were lost and the list went back to the 7 seed books. The data lives only in the memory of the Node.js process, in a JavaScript array inside `booksStore.js`. To keep it, the data must be stored outside the process, for example in a database or a file.

## Self-study notes

- **URLSearchParams** (MDN): builds a query string from key/value pairs and encodes special characters (spaces, `&`, `=`), so user input cannot break the URL. Used in `toQueryString()` in `client/src/api/books.js`; empty values are filtered out first.
- **localeCompare** (MDN): compares two strings alphabetically according to language rules and returns a negative number, 0 or a positive number, exactly what a sort comparator needs. I used it with `{ sensitivity: 'base' }` so upper/lower case does not change the order (`sortBooks()` in `server.js`).
- **import.meta.env in Vite** (Vite docs, "Env Variables and Modes"): Vite reads `.env` files and exposes only variables that start with `VITE_` to client code, so secrets without the prefix are never bundled into the browser. The client reads `import.meta.env.VITE_API_URL`; `.env.example` documents it and `.env` is ignored by Git.
- **204 in Express 5** (Express API docs): a 204 response must not have a body, so I used `res.status(204).end()`, which ends the response without sending JSON. On the client, the shared `request()` helper returns `null` for 204 instead of calling `response.json()`.
- **Cancelling fetch** (MDN, AbortController): `fetch` accepts a `signal`; calling `controller.abort()` rejects the promise with an error whose `name` is `"AbortError"`. The list effect in `App.jsx` aborts the previous request in its cleanup and ignores `AbortError`, so an old response can never overwrite a newer one.

## Challenges

- `git push` failed twice with "Could not connect to server" because of my VPN (Cloudflare WARP); retrying the push solved it.
- While updating the imports I left an old import line in `server.js`, which caused `SyntaxError: Identifier 'getAllBooks' has already been declared`. `node --check` helped me find the exact line. Another time I had accidentally deleted `const app = express();` (`app is not defined`).
- The editor's AI autocomplete suggested a different 500 message than the required `Something went wrong`, so I turned inline suggestions off.
- My statistics test looked wrong because `node --watch` restarted the server between two requests and the in-memory data was reset; this also showed me why the data is not persistent.
- Windows did not accept a folder name ending with a dot (`api.`).
