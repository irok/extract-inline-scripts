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

const showLines = atoi(argv.n);
const limitLines = atoi(argv.l);

Array.prototype.flatMap = function(cb) {
  var results = [];
  this.forEach((elem) => {
    results.push(...cb(elem));
  });
  return results;
}

function atoi(str) {
  const num = parseInt(str);
  return isNaN(num) ? 0 : num;
}

function getPrintCode(code) {
  const lines = code.split(/\n/);
  if (0 < showLines && showLines < lines.length) {
    lines.length = showLines;
  }
  return lines.join('\n').replace(/\n$/, '');
}

function printList(scripts) {
  var filename = '';
  scripts.forEach(({file, line, code}) => {
    if (filename !== file) {
      if (filename !== '') {
        console.info('');
      }
      console.info(filename = file);
    }
    console.info(`line: ${line}`);
    if (argv.c) {
      console.info(`\n${getPrintCode(code)}`);
    }
  });
}

function printDuplicated(hashmap) {
  Object.keys(hashmap)
    .map((key) => hashmap[key])
    .filter((dup) => dup.count >= 2)
    .sort((a, b) => b.count - a.count)
    .forEach((dup) => {
      dup.at.forEach(({file, line}) => {
        console.info(`${file} (${line})`);
      });
      if (argv.c) {
        console.info(`\n${getPrintCode(dup.code)}`);
      }
      console.info('');
    });
}

function analyze(scripts) {
  const hashmap = {};

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

  return hashmap;
}

function getScripts(file) {
  const html = fs.readFileSync(file, 'utf-8');
  const scripts = extractInlineScripts(html).map((script) => {
    script.file = file;
    return script;
  });

  if (limitLines > 0) {
    return scripts.filter((script) => {
      const lines = script.code.replace(/\n$/, '').split(/\n/).length;
      return lines >= limitLines;
    });
  }
  return scripts;
}

try {
  const scripts = argv._
    .flatMap(glob.sync)
    .filter((file) => fs.statSync(file).isFile())
    .flatMap(getScripts);

  if (argv.d) {
    printDuplicated(analyze(scripts));
  } else {
    printList(scripts);
  }
}
catch (err) {
  console.error(err);
  process.exit(1);
}
