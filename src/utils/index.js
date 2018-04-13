/**
 * Determine if the string ends with the specified substring.
 *
 * @param {string} haystack String to search in
 * @param {string} needle   String to search for
 * @return {boolean}
 */
const endsWith = (haystack, needle) => haystack.slice(-needle.length) === needle;

/**
 * Trim the specified substring off the string. If the string does not end
 * with the specified substring, this is a no-op.
 *
 * @param {string} haystack String to search in
 * @param {string} needle   String to search for
 * @return {string}
 */
export const trimEnd = (haystack, needle) =>
  endsWith(haystack, needle) ? haystack.slice(0, -needle.length) : haystack;

/**
 * Convert a hyphenated string to camelCase.
 */
export const hyphenToCamelCase = string =>
  string.replace(/-(.)/g, (match, chr) => chr.toUpperCase());

/**
 * Determines if the specified string consists entirely of numeric characters.
 */
export const isNumeric = input =>
  input !== undefined &&
  input !== null &&
  // TODO replace double equals
  // eslint-disable-next-line eqeqeq
  (typeof input === 'number' || parseInt(input, 10) == input);

/**
 * Determines if the CSS value can be converted from a
 * 'px' suffixed string to a numeric value
 *
 * @param {string} value CSS property value
 * @return {boolean}
 */
export const isConvertiblePixelValue = value => /^\d+px$/.test(value);
