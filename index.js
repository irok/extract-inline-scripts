const crypto = require('crypto');
const {parseDOM} = require('htmlparser2');

function trim(str) {
  return str.replace(/^\n|\x20+$/g, '');
}

function normalize(str) {
  return str.replace(/^[\t\x20]+/mg, '').replace(/\s+$/, '');
}

function extractInlineScripts(html) {
  var fromIndex = 0;

  const _extractInlineScripts = (dom) => {
    const scripts = [];

    dom.forEach((node) => {
      if (node.type === 'script' && !node.attribs.src) {
        if (node.children.length === 0) {
          return;
        }
        if (node.children.length >= 2) {
          throw new Error('many children');
        }
        if (node.children[0].type !== 'text') {
          throw new Error('unexpected type');
        }

        const script = {
          code: trim(node.children[0].data)
        };
        script.hash = crypto.createHash('md5').update(normalize(script.code)).digest('hex');

        // search line
        const index = html.indexOf(script.code, fromIndex);
        fromIndex = index + script.code.length;
        script.line = html.substr(0, index).split(/\n/).length;
        if (html.charAt(index) === '\n') {
          script.line++;
        }

        scripts.push(script);
      }
      else if (node.type === 'tag' && node.children.length > 0) {
        scripts.push(..._extractInlineScripts(node.children));
      }
    });

    return scripts;
  };

  return _extractInlineScripts(parseDOM(html));
}

module.exports = extractInlineScripts;
