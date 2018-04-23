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
 * Convert the style information represented by this parser into a JSX
 * style object string
 *
 * @return {string}
 */
const toJSXStyleObjectString = styles => {
  const styleObj = {};
  Object.keys(styles).forEach(key => {
    styleObj[toJSXKey(key)] = styles[key];
  });
  return JSON.stringify(styleObj);
};

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
  return toJSXStyleObjectString(styles);
};

export default parseStyles;
