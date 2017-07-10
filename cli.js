#!/usr/bin/env node
const extractInlineScripts = require('./');
const fs = require('fs');
const glob = require('glob');

const argv = require('minimist')(process.argv.slice(2));
if (argv._.length === 0) {
  console.error(`Usage: extis globs [OPTIONS]
  OPTIONS
  -c          print the code.
  -d          analyze the duplicated code.
  -n [NUM]    print the first NUM lines.
  -l [NUM]    extract the scripts with NUM lines or more.
  `);
  process.exit(1);
}

Array.prototype.flatMap = function(cb) {
  var results = [];
  this.forEach((elem) => {
    results.push(...cb(elem));
  });
  return results;
}

function printCode(code) {
  if (argv.n && /^[1-9]\d*$/.test(argv.n)) {
    const lines = code.split(/\n/);
    if (lines.length > argv.n) {
      lines.length = argv.n;
      code = lines.join('\n');
    }
  }
  code = code.replace(/\n$/, '');
  console.info(`\n${code}\n`);
}

function showList(scripts) {
  var filename = '';
  scripts.forEach(({file, line, code}) => {
    if (filename !== file) {
      if (filename !== '' && !argv.c) {
        console.info('');
      }
      console.info(filename = file);
    }
    console.info(`line: ${line}`);
    if (argv.c) {
      printCode(code);
    }
  });
}

function showDuplicated(scripts) {
  const hashmap = {};
  const descCount = (a, b) => hashmap[b].count - hashmap[a].count;

  scripts.forEach(({file, line, code, hash}) => {
    if (!hashmap[hash]) {
      hashmap[hash] = {
        at: [],
        count: 0,
        code
      };
    }

    hashmap[hash].at.push({file, line});
    hashmap[hash].count++;
  });

  Object.keys(hashmap)
    .filter((key) => hashmap[key].count >= 2)
    .sort(descCount)
    .forEach((key) => {
      hashmap[key].at.forEach(({file, line}) => {
        console.info(`${file} (${line})`);
      });

      if (argv.c) {
        printCode(hashmap[key].code);
      } else {
        console.info('');
      }
    });
}

function getScripts(file) {
  const html = fs.readFileSync(file, 'utf-8');
  return extractInlineScripts(html).map((script) => {
    script.file = file;
    return script;
  });
}

try {
  var scripts = argv._
    .flatMap(glob.sync)
    .filter((file) => fs.statSync(file).isFile())
    .flatMap(getScripts);

  if (argv.l && /^[1-9]\d*$/.test(argv.l)) {
    scripts = scripts.filter((script) => {
      const lines = script.code.replace(/\n$/, '').split(/\n/);
      return lines.length >= argv.l
    });
  }

  if (argv.d) {
    showDuplicated(scripts);
  } else {
    showList(scripts);
  }
}
catch (err) {
  console.error(err);
  process.exit(1);
}
