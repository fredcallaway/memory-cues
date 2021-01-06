function updateExisting(target, src) {
  Object.keys(target)
        .forEach(k => target[k] = (src.hasOwnProperty(k) ? src[k] : target[k]));
}

function maybeJson(s) {
  try {
    return JSON.parse(s);
  } catch (error) {
    return s;
  }
};


// Generated by CoffeeScript 2.0.2
var assert, check, checkObj, converter, delay, mapObject, markdown, mean, sleep, zip;

converter = new showdown.Converter();

markdown = function(txt) {
  // Remove leading spaces so as not to interpret indented
  // blocks as code blocks. Use fenced code blocks instead.
  return converter.makeHtml(txt.replace(/^[ ]+/gm, ''));
};

delay = function(time, func) {
  return setTimeout(func, time);
};

sleep = function(ms) {
  return new Promise(function(resolve) {
    return window.setTimeout(resolve, ms);
  });
};

zip = function(...rows) {
  return rows[0].map(function(_, c) {
    return rows.map(function(row) {
      return row[c];
    });
  });
};

mapObject = function(obj, fn) {
  return Object.keys(obj).reduce(function(res, key) {
    res[key] = fn(obj[key]);
    return res;
  }, {});
};

mean = function(xs) {
  return (xs.reduce((function(acc, x) {
    return acc + x;
  }))) / xs.length;
};

checkObj = function(obj, keys) {
  var i, k, len;
  if (keys == null) {
    keys = Object.keys(obj);
  }
  for (i = 0, len = keys.length; i < len; i++) {
    k = keys[i];
    if (obj[k] === void 0) {
      console.log('Bad Object: ', obj);
      throw new Error(`${k} is undefined`);
    }
  }
  return obj;
};

check = function(name, val) {
  if (val === void 0) {
    throw new Error(`${name}is undefined`);
  }
  return val;
};

assert = function(val) {
  if (!val) {
    throw new Error('Assertion Error');
  }
  return val;
};
