// utils/escapeRegex.js

/**
 * Escapes every RegExp metacharacter in a string so user input can be used
 * safely inside `new RegExp(...)`.
 *
 * Without this, a query like `?search=sajkj\` throws
 * "Invalid regular expression: \ at end of pattern" and the request 500s.
 * Unescaped input also lets callers inject their own pattern (e.g. `.*`) or a
 * catastrophically backtracking one.
 *
 * @param {unknown} value
 * @returns {string} escaped string ('' for null/undefined)
 */
export const escapeRegex = (value) => {
  if (value === undefined || value === null) return '';
  return String(value).replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');
};

/**
 * Builds a case-insensitive RegExp from untrusted input.
 *
 * @param {unknown} value
 * @param {{ exact?: boolean }} [options] exact:true anchors with ^...$
 */
export const safeRegex = (value, { exact = false } = {}) => {
  const escaped = escapeRegex(value);
  return new RegExp(exact ? `^${escaped}$` : escaped, 'i');
};

export default escapeRegex;
