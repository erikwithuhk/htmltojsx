/* eslint-disable no-eval */

/**
 *  Copyright (c) 2014, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 *
 */

import React from 'react'; // eslint-disable-line no-unused-vars
import Enzyme, { shallow } from 'enzyme';
import Adapter from 'enzyme-adapter-react-15';
import { transform } from 'babel-core';

import HTMLtoJSX from '../src';

Enzyme.configure({ adapter: new Adapter() });
global.React = React;

const shallowRenderJSX = jsx =>
  [shallow, eval, code => transform(code, { babelrc: false, presets: ['react'] }).code].reduceRight(
    (retVal, func) => func(retVal),
    jsx,
  );

describe('HTMLtoJSX', () => {
  it('should handle basic HTML', () => {
    const converter = new HTMLtoJSX({ createClass: false });
    const jsx = converter.convert('<div>Hello world!</div>').trim();
    expect(jsx).toBe('<div>Hello world!</div>');
    expect(shallowRenderJSX(jsx)).toMatchSnapshot();
  });

  it('should handle HTML comments', () => {
    const converter = new HTMLtoJSX({ createClass: false });
    const jsx = converter.convert('<!-- Hello World -->').trim();
    expect(jsx).toBe('{/* Hello World */}');
  });

  it('should convert tags to lowercase', () => {
    const converter = new HTMLtoJSX({ createClass: false });
    const jsx = converter.convert('<DIV>Hello world!</DIV>').trim();
    expect(jsx).toBe('<div>Hello world!</div>');
  });

  it('should strip single-line script tag', () => {
    const converter = new HTMLtoJSX({ createClass: false });
    const jsx = converter.convert('<div>foo<script>lol</script>bar</div>').trim();
    expect(jsx).toBe('<div>foobar</div>');
  });

  it('should strip multi-line script tag', () => {
    const converter = new HTMLtoJSX({ createClass: false });
    const jsx = converter.convert('<div>foo<script>\nlol\nlolz\n</script>bar</div>').trim();
    expect(jsx).toBe('<div>foobar</div>');
  });

  it('should create a new React component', () => {
    const converter = new HTMLtoJSX({
      createClass: true,
      outputClassName: 'FooComponent',
    });
    const jsx = converter.convert('<div>Hello world!</div>');
    expect(jsx).toBe(
      'var FooComponent = React.createClass({\n' +
        '  render: function() {\n' +
        '    return (\n' +
        '\n' +
        '      <div>Hello world!</div>\n' +
        '    );\n' +
        '  }\n' +
        '});',
    );
  });

  it('should create a new React without var name', () => {
    const converter = new HTMLtoJSX({
      createClass: true,
    });
    const result = converter.convert('<div>Hello world!</div>');
    const jsx = result;
    expect(jsx).toBe(
      'React.createClass({\n' +
        '  render: function() {\n' +
        '    return (\n' +
        '\n' +
        '      <div>Hello world!</div>\n' +
        '    );\n' +
        '  }\n' +
        '});',
    );
  });

  it('should wrap HTML with a div when multiple top-level', () => {
    const converter = new HTMLtoJSX({
      createClass: true,
      outputClassName: 'FooComponent',
    });
    const jsx = converter.convert('<span>1</span><span>2</span>');
    expect(jsx).toBe(
      [
        'var FooComponent = React.createClass({',
        '  render: function() {',
        '    return (',
        '      <div>',
        '        <span>1</span><span>2</span>',
        '      </div>',
        '    );',
        '  }',
        '});',
      ].join('\n'),
    );
  });

  describe('escaped characters', () => {
    it('should handle escaped < symbols', () => {
      const converter = new HTMLtoJSX({ createClass: false });
      const jsx = converter.convert('<div>&lt;</div>').trim();
      expect(jsx).toBe('<div>&lt;</div>');
      expect(shallowRenderJSX(jsx)).toMatchSnapshot();
    });

    it('should handle unescaped copyright symbols', () => {
      const converter = new HTMLtoJSX({ createClass: false });
      const jsx = converter.convert('<div>©</div>').trim();
      expect(jsx).toBe('<div>©</div>');
      expect(shallowRenderJSX(jsx)).toMatchSnapshot();
    });
  });

  describe('Attribute transformations', () => {
    it('should convert basic "style" attributes', () => {
      const converter = new HTMLtoJSX({ createClass: false });
      const jsx = converter.convert('<div style="color: red">Test</div>').trim();
      expect(jsx).toBe(`<div style={{"color":"red"}}>Test</div>`);
      expect(shallowRenderJSX(jsx)).toMatchSnapshot();
    });

    it('should convert CSS shorthand "style" values', () => {
      const converter = new HTMLtoJSX({ createClass: false });
      const jsx = converter.convert('<div style="padding: 10px 15px 20px 25px;">Test</div>').trim();
      expect(jsx).toBe(`<div style={{"padding":"10px 15px 20px 25px"}}>Test</div>`);
      expect(shallowRenderJSX(jsx)).toMatchSnapshot();
    });

    it('should pass thru vendor-prefix "style" attributes', () => {
      const converter = new HTMLtoJSX({ createClass: false });
      const jsx = converter
        .convert('<div style="-moz-hyphens: auto; -webkit-hyphens: auto">Test</div>')
        .trim();
      expect(jsx).toBe(`<div style={{"-moz-hyphens":"auto","-webkit-hyphens":"auto"}}>Test</div>`);
      expect(shallowRenderJSX(jsx)).toMatchSnapshot();
    });

    it('should convert "class" attribute', () => {
      const converter = new HTMLtoJSX({ createClass: false });
      const jsx = converter.convert('<div class="awesome">Test</div>').trim();
      expect(jsx).toBe('<div className="awesome">Test</div>');
      expect(shallowRenderJSX(jsx)).toMatchSnapshot();
    });

    it('should convert "for" attribute', () => {
      const converter = new HTMLtoJSX({ createClass: false });
      const jsx = converter.convert('<label for="potato">Test</label>').trim();
      expect(jsx).toBe('<label htmlFor="potato">Test</label>');
      expect(shallowRenderJSX(jsx)).toMatchSnapshot();
    });

    it('should convert "maxlength" attribute to "maxLength"', () => {
      const converter = new HTMLtoJSX({ createClass: false });
      const jsx = converter.convert('<input maxlength=2></input>').trim();
      expect(jsx).toBe('<input maxLength={2} />');
      expect(shallowRenderJSX(jsx)).toMatchSnapshot();
    });

    it('should convert "http-equiv" attribute to "httpEquiv"', () => {
      const converter = new HTMLtoJSX({ createClass: false });
      const jsx = converter.convert('<meta http-equiv="refresh">').trim();
      expect(jsx).toBe('<meta httpEquiv="refresh" />');
      expect(shallowRenderJSX(jsx)).toMatchSnapshot();
    });

    it('should convert "accept-charset" attribute to "acceptCharset"', () => {
      const converter = new HTMLtoJSX({ createClass: false });
      const jsx = converter.convert('<form accept-charset="UTF-8">Test</form>').trim();
      expect(jsx).toBe('<form acceptCharset="UTF-8">Test</form>');
    });

    it('should convert "enctype" attribute to "encType"', () => {
      const converter = new HTMLtoJSX({ createClass: false });
      const jsx = converter
        .convert('<form method="post" enctype="application/x-www-form-urlencoded">Test</form>')
        .trim();
      expect(jsx).toBe(
        '<form method="post" encType="application/x-www-form-urlencoded">Test</form>',
      );
      expect(shallowRenderJSX(jsx)).toMatchSnapshot();
    });

    it('should maintain value-less attributes', () => {
      const converter = new HTMLtoJSX({ createClass: false });
      const jsx = converter.convert('<input disabled>').trim();
      expect(jsx).toBe('<input disabled />');
      expect(shallowRenderJSX(jsx)).toMatchSnapshot();
    });

    it('should set <input> "value" to "defaultValue" to allow input editing', () => {
      const converter = new HTMLtoJSX({ createClass: false });
      const jsx = converter.convert('<input value="Darth Vader">').trim();
      expect(jsx).toBe('<input defaultValue="Darth Vader" />');
      expect(shallowRenderJSX(jsx)).toMatchSnapshot();
    });

    it('should not set "value" to "defaultValue" for non-<input> elements', () => {
      const converter = new HTMLtoJSX({ createClass: false });
      const jsx = converter.convert('<select><option value="Hans"></select>').trim();
      expect(jsx).toBe('<select><option value="Hans" /></select>');
      expect(shallowRenderJSX(jsx)).toMatchSnapshot();
    });

    it('should set <input> "checked" to "defaultChecked" to allow box checking', () => {
      const converter = new HTMLtoJSX({ createClass: false });
      const jsx = converter.convert('<input type="checkbox" checked>').trim();
      expect(jsx).toBe('<input type="checkbox" defaultChecked />');
      expect(shallowRenderJSX(jsx)).toMatchSnapshot();
    });

    it('should convert SVG attributes', () => {
      const converter = new HTMLtoJSX({ createClass: false });
      const jsx = converter
        .convert(
          '<svg height="100" width="100"><circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" fill-rule="evenodd"/></svg>',
        )
        .trim();
      expect(jsx).toBe(
        '<svg height={100} width={100}><circle cx={50} cy={50} r={40} stroke="black" strokeWidth={3} fill="red" fillRule="evenodd" /></svg>',
      );
      expect(shallowRenderJSX(jsx)).toMatchSnapshot();
    });
  });

  describe('special tags', () => {
    it('should use "defaultValue" for textareas', () => {
      const converter = new HTMLtoJSX({ createClass: false });
      const jsx = converter.convert('<textarea>hello\nworld</textarea>').trim();
      expect(jsx).toBe('<textarea defaultValue={"hello\\nworld"} />');
      expect(shallowRenderJSX(jsx)).toMatchSnapshot();
    });

    it('should do magic voodoo for <pre>', () => {
      const converter = new HTMLtoJSX({ createClass: false });
      const jsx = converter.convert('<pre>hello\nworld{foo}</pre>').trim();
      expect(jsx).toBe('<pre>hello{"\\n"}world{"{"}foo{"}"}</pre>');
      expect(shallowRenderJSX(jsx)).toMatchSnapshot();
    });

    it('should handle <pre> tags with children', () => {
      const converter = new HTMLtoJSX({ createClass: false });
      const jsx = converter
        .convert('<pre><b>Hello world  yo</b>this   is   a<i>   test</i></pre>')
        .trim();
      expect(jsx).toBe(
        '<pre><b>Hello world{"  "}yo</b>this{"   "}is{"   "}a<i>{"   "}test</i></pre>',
      );
      expect(shallowRenderJSX(jsx)).toMatchSnapshot();
    });

    it('should dangerously set <style> tag contents', () => {
      const converter = new HTMLtoJSX({ createClass: false });
      const jsx = converter
        .convert("<style>\nh1 {\n    background: url('http://foo.bar/img.jpg';\n}\n</style>")
        .trim();
      expect(jsx).toBe(
        '<style dangerouslySetInnerHTML={{__html: "\\nh1 {\\n    background: url(\'http://foo.bar/img.jpg\';\\n}\\n" }} />',
      );
      expect(shallowRenderJSX(jsx)).toMatchSnapshot();
    });

    it(`should gracefully handle malformed CSS in an HTML element's style attribute`, () => {
      const converter = new HTMLtoJSX({ createClass: false });
      const jsx = converter
        .convert(
          `<span style="
color: rgb(209, 204, 189);
*border-bottom: .175em solid rgba( 209, 204, 189, 1);
float: left;
font-size: 590%;
font-family: 'Roboto Slab';
font-weight: bold;
*font-style: italic;
line-height: 80%;
font-weight: 700;
width: .8em;
padding-left: .1em;
margin-right: .1em;
*color: white;
*text-shadow: rgb(74, 144, 226) 1px 0px 0px, rgb(74, 144, 226) 0.540302px 0.841471px 0px, rgb(74, 144, 226) -0.416147px 0.909297px 0px, rgb(74, 144, 226) -0.989992px 0.14112px 0px, rgb(74, 144, 226) -0.653644px -0.756802px 0px, rgb(74, 144, 226) 0.283662px -0.958924px 0px, rgb(74, 144, 226) 0.96017px -0.279415px 0px;
">D</span>`,
        )
        .trim();
      expect(jsx).toBe(
        `<span style={{"color":"rgb(209, 204, 189)","*border-bottom":".175em solid rgba( 209, 204, 189, 1)","float":"left","font-size":"590%","font-family":"'Roboto Slab'","font-weight":"700","*font-style":"italic","line-height":"80%","width":".8em","padding-left":".1em","margin-right":".1em","*color":"white","*text-shadow":"rgb(74, 144, 226) 1px 0px 0px, rgb(74, 144, 226) 0.540302px 0.841471px 0px, rgb(74, 144, 226) -0.416147px 0.909297px 0px, rgb(74, 144, 226) -0.989992px 0.14112px 0px, rgb(74, 144, 226) -0.653644px -0.756802px 0px, rgb(74, 144, 226) 0.283662px -0.958924px 0px, rgb(74, 144, 226) 0.96017px -0.279415px 0px"}}>D</span>`,
      );
      expect(shallowRenderJSX(jsx)).toMatchSnapshot();
    });

    it(`should strip malformed CSS properties in accordance with a robust CSS parser`, () => {
      const converter = new HTMLtoJSX({ createClass: false });
      const jsx = converter
        .convert(
          `<span style="
color: rgb(209, 204, 189);
*border-bottom: .175em solid rgba( 209, 204, 189, 1);
float: left;
font-size: 590%;
font-family: 'Roboto Slab';
font-weight: bold;
*font-style: italic;
line-height: 80%;
font-weight: 700;
width: .8em;
padding-left: .1em;
margin-right: .1em;
*col'or: white;
*text-shadow: rgb(74, 144, 226) 1px 0px 0px, rgb(74, 144, 226) 0.540302px 0.841471px 0px, rgb(74, 144, 226) -0.416147px 0.909297px 0px, rgb(74, 144, 226) -0.989992px 0.14112px 0px, rgb(74, 144, 226) -0.653644px -0.756802px 0px, rgb(74, 144, 226) 0.283662px -0.958924px 0px, rgb(74, 144, 226) 0.96017px -0.279415px 0px;
">D</span>`,
        )
        .trim();
      expect(jsx).toBe(
        `<span style={{"color":"rgb(209, 204, 189)","*border-bottom":".175em solid rgba( 209, 204, 189, 1)","float":"left","font-size":"590%","font-family":"'Roboto Slab'","font-weight":"700","*font-style":"italic","line-height":"80%","width":".8em","padding-left":".1em","margin-right":".1em"}}>D</span>`,
      );
      expect(shallowRenderJSX(jsx)).toMatchSnapshot();
    });

    it('should convert svg tag names', () => {
      const converter = new HTMLtoJSX({ createClass: false });
      const jsx = converter
        .convert(
          '<svg><clipPath><feSpotLight><linearGradient></linearGradient></feSpotLight></clipPath></svg>',
        )
        .trim();
      expect(jsx).toBe(
        '<svg><clipPath><feSpotLight><linearGradient /></feSpotLight></clipPath></svg>',
      );
      expect(shallowRenderJSX(jsx)).toMatchSnapshot();
    });
  });
});
