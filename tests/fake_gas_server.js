// Simule le web app Apps Script : POST texte -> 302 -> JSON (comme Google)
const http = require('http');
const { makeEnv } = require('./gas_mock.js');
const g = makeEnv();
g.installer();
const admin = g._logs.join('\n').match(/administrateur.*?: (\d{4})/)[1];
require('fs').writeFileSync('/tmp/admin_code.txt', admin);
let last = {};
http.createServer((req, res) => {
  if (req.method === 'POST' && req.url.startsWith('/exec')) {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const id = Math.random().toString(36).slice(2);
      last[id] = g.doPost({ postData: { contents: body } }).getContent();
      res.writeHead(302, { Location: '/echo?id=' + id, 'Access-Control-Allow-Origin': '*' });
      res.end();
    });
  } else if (req.url.startsWith('/echo')) {
    const id = new URL(req.url, 'http://x').searchParams.get('id');
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(last[id] || '{}');
  } else { res.writeHead(404); res.end(); }
}).listen(8898, () => console.log('fake gas on 8898, admin', admin));
