import { hyphenToCamelCase, isConvertiblePixelValue, isNumeric, trimEnd } from './utils';

/**
 * Convert the CSS style key to a JSX style key
 *
 * @param {string} key CSS style key
 * @return {string} JSX style key
 */
const toJSXKey = key => {
  // Don't capitalize -ms- prefix
  if (/^-ms-/.test(key)) {
    return hyphenToCamelCase(key.substr(1));
  }
  return hyphenToCamelCase(key);
};

/**
 * Convert the CSS style value to a JSX style value
 *
 * @param {string} value CSS style value
 * @return {string} JSX style value
 */
const toJSXValue = value => {
  if (isNumeric(value)) {
    // If numeric, no quotes
    return value;
  } else if (isConvertiblePixelValue(value)) {
    // "500px" -> 500
    return trimEnd(value, 'px');
  }
  // Probably a string, wrap it in quotes
  return `'${value.replace(/'/g, '"')}'`;
};

/**
 * Convert the style information represented by this parser into a JSX
 * string
 *
 * @return {string}
 */
const toJSXString = styles =>
  Object.entries(styles)
    .map(([key, value]) => `'${toJSXKey(key)}': ${toJSXValue(value)}`)
    .join(', ');

/**
 * Handles parsing of inline styles
 *
 * @param {string} rawStyle Raw style attribute
 */
const parseStyles = rawStyles => {
  const styles = rawStyles.split(';').reduce((acc, rawStyle) => {
    const style = rawStyle.trim();
    const firstColon = style.indexOf(':');
    const key = style.substr(0, firstColon);
    const value = style.substr(firstColon + 1).trim();
    if (key !== '') {
      return { ...acc, [key.toLowerCase()]: value };
    }
    return { ...acc };
  }, {});
  return toJSXString(styles);
};

export default parseStyles;
