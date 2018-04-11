#!/usr/bin/env node
import HTMLtoJSX from './HTMLtoJSX';

const fs = require('fs');
const yargs = require('yargs');

function getArgs() {
  const args = yargs
    .usage('Converts HTML to JSX for use with React.\nUsage: $0 [-c ComponentName] file.htm')
    .describe('className', 'Create a React component (wraps JSX in React.createClass call)')
    .alias('className', 'c')
    .help('help')
    .example(
      '$0 -c AwesomeComponent awesome.htm',
      'Creates React component "AwesomeComponent" based on awesome.htm',
    )
    .strict();

  const files = args.argv._;
  if (!files || files.length === 0) {
    console.error('Please provide a file name');
    args.showHelp();
    process.exit(1);
  }
  return args.argv;
}

function main() {
  const argv = getArgs();
  fs.readFile(argv._[0], 'utf-8', (err, input) => {
    if (err) {
      console.error(err.stack);
      process.exit(2);
    }
    const converter = new HTMLtoJSX({
      createClass: !!argv.className,
      outputClassName: argv.className,
      isInBrowser: false,
    });
    const output = converter.convert(input);
    console.log(output);
  });
}

main();
