#!/usr/bin/env node
const extractInlineScripts = require('./');
const fs = require('fs');
const glob = require('glob');

const argv = require('minimist')(process.argv.slice(2));
if (argv._.length === 0) {
  console.error(`Usage: extis [OPTIONS] globs
  OPTIONS
  -c  show code
  -d  show duplicated
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

function showList(scripts) {
  var filename = '';
  scripts.forEach(({file, line, code}) => {
    if (filename !== file) {
      if (filename !== '' && !argv.v) {
        console.info('');
      }
      console.info(filename = file);
    }
    console.info(`  line: ${line}`);
    if (argv.c) {
      console.info(`${code}\n`);
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
      console.info(`${key}`);
      hashmap[key].at.forEach(({file, line}) => {
        console.info(`  file: ${file}  line: ${line}`);
      });

      if (argv.c) {
        console.info(`${hashmap[key].code}\n`);
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
  const scripts = argv._
    .flatMap(glob.sync)
    .filter((file) => fs.statSync(file).isFile())
    .flatMap(getScripts);

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
