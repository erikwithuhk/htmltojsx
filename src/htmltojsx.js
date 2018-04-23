/* eslint-disable class-methods-use-this,no-underscore-dangle */

/** @preserve
 *  Copyright (c) 2014, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 *
 */

/**
 * This is a very simple HTML to JSX converter. It turns out that browsers
 * have good HTML parsers (who would have thought?) so we utilise this by
 * inserting the HTML into a temporary DOM node, and then do a breadth-first
 * traversal of the resulting DOM tree.
 */

import { isNumeric, trimEnd } from './utils';
import {
  NODE_TYPE,
  ATTRIBUTE_MAPPING,
  ELEMENT_ATTRIBUTE_MAPPING,
  ELEMENT_TAG_NAME_MAPPING,
} from './mapping';
import parseStyles from './parseStyles';

const HTMLDOMPropertyConfig = require('react-dom/lib/HTMLDOMPropertyConfig');
const SVGDOMPropertyConfig = require('react-dom/lib/SVGDOMPropertyConfig');

/**
 * Iterates over elements of object invokes iteratee for each element
 *
 * @param {object}   obj        Collection object
 * @param {function} iteratee   Callback function called in iterative processing
 * @param {any}      context    This arg (aka Context)
 */
const eachObj = (obj, iteratee, context) => {
  Object.keys(obj).forEach(key => {
    if (Object.hasOwnProperty.call(obj, key)) {
      iteratee.call(context || obj, key, obj[key]);
    }
  });
};

// Populate property map with ReactJS's attribute and property mappings
// TODO handle/use .Properties value eg: MUST_USE_PROPERTY is not HTML attr
const mappingAttributesFromReactConfig = config => {
  eachObj(config.Properties, propname => {
    const mapFrom = config.DOMAttributeNames[propname] || propname.toLowerCase();

    if (!ATTRIBUTE_MAPPING[mapFrom]) ATTRIBUTE_MAPPING[mapFrom] = propname;
  });
};

mappingAttributesFromReactConfig(HTMLDOMPropertyConfig);
mappingAttributesFromReactConfig(SVGDOMPropertyConfig);

/**
 * Convert tag name to tag name suitable for JSX.
 *
 * @param  {string} tagName  String of tag name
 * @return {string}
 */
const jsxTagName = tagName => {
  let name = tagName.toLowerCase();

  if (Object.hasOwnProperty.call(ELEMENT_TAG_NAME_MAPPING, name)) {
    name = ELEMENT_TAG_NAME_MAPPING[name];
  }

  return name;
};

/**
 * Repeats a string a certain number of times.
 * Also: the future is bright and consists of native string repetition:
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/repeat
 *
 * @param {string} string  String to repeat
 * @param {number} times   Number of times to repeat string. Integer.
 * @see http://jsperf.com/string-repeater/2
 */
const repeatString = (string, times) => new Array(times).fill(string).join('');

/**
 * Determines if the specified string consists entirely of whitespace.
 */
const isEmpty = string => !/[^\s]/.test(string);

/**
 * Creates an HTML element from a tagname
 *
 * @param {string} value
 * @return {object}
 */
const createElement = tag => document.createElement(tag);

/**
 * Escapes special characters by converting them to their escaped equivalent
 * (eg. "<" to "&lt;"). Only escapes characters that absolutely must be escaped.
 *
 * @param {string} value
 * @return {string}
 */
const escapeSpecialChars = (value, containerTag) => {
  const tempEl = createElement(containerTag);
  // Uses this One Weird Trick to escape text - Raw text inserted as textContent
  // will have its escaped version in innerHTML.
  tempEl.textContent = value;
  return tempEl.innerHTML;
};

class HTMLtoJSX {
  constructor({ createClass = false, indent = '  ', outputClassName = undefined } = {}) {
    this.config = { createClass, indent, outputClassName };
  }
  /**
   * Reset the internal state of the converter
   */
  reset() {
    this.output = '';
    this.level = 0;
    this._inPreTag = false;
  }
  /**
   * Main entry point to the converter. Given the specified HTML, returns a
   * JSX object representing it.
   * @param {string} html HTML to convert
   * @return {string} JSX
   */
  convert(html, { containerTag = 'div' } = {}) {
    this.reset();
    this.config.containerTag = containerTag;

    const containerEl = createElement(this.config.containerTag);
    containerEl.innerHTML = `\n${this._cleanInput(html)}\n`;

    if (this.config.createClass) {
      if (this.config.outputClassName) {
        this.output = `var ${this.config.outputClassName} = React.createClass({\n`;
      } else {
        this.output = 'React.createClass({\n';
      }
      this.output += `${this.config.indent}render: function() {\n`;
      this.output += `${this.config.indent + this.config.indent}return (\n`;
    }

    if (this._onlyOneTopLevel(containerEl)) {
      // Only one top-level element, the component can return it directly
      // No need to actually visit the container element
      this._traverse(containerEl);
    } else {
      // More than one top-level element, need to wrap the whole thing in a
      // container.
      this.output += this.config.indent + this.config.indent + this.config.indent;
      this.level += 1;
      this._visit(containerEl);
    }
    this.output = `${this.output.trim()}\n`;
    if (this.config.createClass) {
      this.output += `${this.config.indent + this.config.indent});\n`;
      this.output += `${this.config.indent}}\n`;
      this.output += '});';
    } else {
      this.output = this._removeJSXClassIndention(this.output, this.config.indent);
    }
    return this.output;
  }

  /**
   * Cleans up the specified HTML so it's in a format acceptable for
   * converting.
   *
   * @param {string} html HTML to clean
   * @return {string} Cleaned HTML
   */
  _cleanInput(html) {
    // Remove unnecessary whitespace
    // Ugly method to strip script tags. They can wreak havoc on the DOM nodes
    // so let's not even put them in the DOM.
    return html.trim().replace(/<script([\s\S]*?)<\/script>/g, '');
  }

  /**
   * Determines if there's only one top-level node in the DOM tree. That is,
   * all the HTML is wrapped by a single HTML tag.
   *
   * @param {DOMElement} containerEl Container element
   * @return {boolean}
   */
  _onlyOneTopLevel(containerEl) {
    // Only a single child element
    if (
      containerEl.childNodes.length === 1 &&
      containerEl.childNodes[0].nodeType === NODE_TYPE.ELEMENT
    ) {
      return true;
    }
    // Only one element, and all other children are whitespace
    let foundElement = false;
    for (let i = 0, count = containerEl.childNodes.length; i < count; i += 1) {
      const child = containerEl.childNodes[i];
      if (child.nodeType === NODE_TYPE.ELEMENT) {
        if (foundElement) {
          // Encountered an element after already encountering another one
          // Therefore, more than one element at root level
          return false;
        }
        foundElement = true;
      } else if (child.nodeType === NODE_TYPE.TEXT && !isEmpty(child.textContent)) {
        // Contains text content
        return false;
      }
    }
    return true;
  }

  /**
   * Gets a newline followed by the correct indentation for the current
   * nesting level
   *
   * @return {string}
   */
  _getIndentedNewline() {
    return `\n${repeatString(this.config.indent, this.level + 2)}`;
  }

  /**
   * Handles processing the specified node
   *
   * @param {Node} node
   */
  _visit(node) {
    this._beginVisit(node);
    this._traverse(node);
    this._endVisit(node);
  }

  /**
   * Traverses all the children of the specified node
   *
   * @param {Node} node
   */
  _traverse(node) {
    this.level += 1;
    for (let i = 0, count = node.childNodes.length; i < count; i += 1) {
      this._visit(node.childNodes[i]);
    }
    this.level -= 1;
  }

  /**
   * Handle pre-visit behaviour for the specified node.
   *
   * @param {Node} node
   */
  _beginVisit(node) {
    switch (node.nodeType) {
      case NODE_TYPE.ELEMENT:
        this._beginVisitElement(node);
        break;

      case NODE_TYPE.TEXT:
        this._visitText(node);
        break;

      case NODE_TYPE.COMMENT:
        this._visitComment(node);
        break;

      default:
        console.warn(`Unrecognised node type: ${node.nodeType}`);
    }
  }

  /**
   * Handles post-visit behaviour for the specified node.
   *
   * @param {Node} node
   */
  _endVisit(node) {
    switch (node.nodeType) {
      case NODE_TYPE.ELEMENT:
        this._endVisitElement(node);
        break;
      // No ending tags required for these types
      case NODE_TYPE.TEXT:
      case NODE_TYPE.COMMENT:
        break;
      default:
        break;
    }
  }

  /**
   * Handles pre-visit behaviour for the specified element node
   *
   * @param {DOMElement} node
   */
  _beginVisitElement(node) {
    const tagName = jsxTagName(node.tagName);
    const attributes = [];
    for (let i = 0, count = node.attributes.length; i < count; i += 1) {
      attributes.push(this._getElementAttribute(node, node.attributes[i]));
    }

    if (tagName === 'textarea') {
      // Hax: textareas need their inner text moved to a "defaultValue" attribute.
      attributes.push(`defaultValue={${JSON.stringify(node.value)}}`);
    }
    if (tagName === 'style') {
      // Hax: style tag contents need to be dangerously set due to liberal curly brace usage
      attributes.push(`dangerouslySetInnerHTML={{__html: ${JSON.stringify(node.textContent)} }}`);
    }
    if (tagName === 'pre') {
      this._inPreTag = true;
    }

    this.output += `<${tagName}`;
    if (attributes.length > 0) {
      this.output += ` ${attributes.join(' ')}`;
    }
    if (!this._isSelfClosing(node)) {
      this.output += '>';
    }
  }

  /**
   * Handles post-visit behaviour for the specified element node
   *
   * @param {Node} node
   */
  _endVisitElement(node) {
    const tagName = jsxTagName(node.tagName);
    // De-indent a bit
    // TODO: It's inefficient to do it this way :/
    this.output = trimEnd(this.output, this.config.indent);
    if (this._isSelfClosing(node)) {
      this.output += ' />';
    } else {
      this.output += `</${tagName}>`;
    }

    if (tagName === 'pre') {
      this._inPreTag = false;
    }
  }

  /**
   * Determines if this element node should be rendered as a self-closing
   * tag.
   *
   * @param {Node} node
   * @return {boolean}
   */
  _isSelfClosing(node) {
    const tagName = jsxTagName(node.tagName);
    // If it has children, it's not self-closing
    // Exception: All children of a textarea are moved to a "defaultValue" attribute, style attributes are dangerously set.
    return !node.firstChild || tagName === 'textarea' || tagName === 'style';
  }

  /**
   * Handles processing of the specified text node
   *
   * @param {TextNode} node
   */
  _visitText(node) {
    const parentTag = node.parentNode && jsxTagName(node.parentNode.tagName);
    if (parentTag === 'textarea' || parentTag === 'style') {
      // Ignore text content of textareas and styles, as it will have already been moved
      // to a "defaultValue" attribute and "dangerouslySetInnerHTML" attribute respectively.
      return;
    }

    let text = escapeSpecialChars(node.textContent, this.config.containerTag);

    if (this._inPreTag) {
      // If this text is contained within a <pre>, we need to ensure the JSX
      // whitespace coalescing rules don't eat the whitespace. This means
      // wrapping newlines and sequences of two or more spaces in variables.
      text = text
        .replace(/\r/g, '')
        .replace(/( {2,}|\n|\t|\{|\})/g, whitespace => `{${JSON.stringify(whitespace)}}`);
    } else {
      // Handle any curly braces.
      text = text.replace(/(\{|\})/g, brace => `{'${brace}'}`);
      // If there's a newline in the text, adjust the indent level
      if (text.indexOf('\n') > -1) {
        text = text.replace(/\n\s*/g, this._getIndentedNewline());
      }
    }
    this.output += text;
  }

  /**
   * Handles processing of the specified text node
   *
   * @param {Text} node
   */
  _visitComment(node) {
    this.output += `{/*${node.textContent.replace('*/', '* /')}*/}`;
  }

  /**
   * Gets a JSX formatted version of the specified attribute from the node
   *
   * @param {DOMElement} node
   * @param {object}     attribute
   * @return {string}
   */
  _getElementAttribute(node, attribute) {
    let tagName;
    let name;
    let result;

    switch (attribute.name) {
      case 'style':
        return this._getStyleAttribute(attribute.value);
      default:
        tagName = jsxTagName(node.tagName);
        name =
          (ELEMENT_ATTRIBUTE_MAPPING[tagName] &&
            ELEMENT_ATTRIBUTE_MAPPING[tagName][attribute.name]) ||
          ATTRIBUTE_MAPPING[attribute.name] ||
          attribute.name;
        result = name;

        // Numeric values should be output as {123} not "123"
        if (isNumeric(attribute.value)) {
          result += `={${attribute.value}}`;
        } else if (attribute.value.length > 0) {
          result += `="${attribute.value.replace(/"/gm, '&quot;')}"`;
        }
        return result;
    }
  }

  /**
   * Gets a JSX formatted version of the specified element styles
   *
   * @param {string} styles
   * @return {string}
   */
  _getStyleAttribute(styles) {
    const jsxStyles = parseStyles(styles);
    return `style={${jsxStyles}}`;
  }

  /**
   * Removes class-level indention in the JSX output. To be used when the JSX
   * output is configured to not contain a class deifinition.
   *
   * @param {string} output JSX output with class-level indention
   * @param {string} indent Configured indention
   * @return {string} JSX output wihtout class-level indention
   */
  _removeJSXClassIndention(output, indent) {
    const classIndention = new RegExp(`\\n${indent}${indent}${indent}`, 'g');
    return output.replace(classIndention, '\n');
  }
}

export default HTMLtoJSX;
