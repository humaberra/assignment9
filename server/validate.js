// Validation helpers. No libraries: everything is written by hand.

// Route parameters are always strings. Accept only positive integers
// written with digits only ("1", "42"); reject "0", "-1", "1.5", "abc", "01".
export function parseId(value) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    return null;
  }
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}