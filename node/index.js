const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const url = require('url');
const ebml = require('ebml');

const app = express();
const server = http.createServer(app);
const send = new WebSocket.Server({ noServer: true }), recv = new WebSocket.Server({ noServer: true });
const ws = {
  '/send': send,
  '/recv': recv
};

const decoder = new ebml.Decoder();

let init;
let buffer;
let index = 0;

function emit(data) {
  recv.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN && c.readyToSend && c.initialized) c.send(data);
  });
}

decoder.on('data', ([type, elem]) => {
  if (type === 'start' && elem.name === 'Cluster') {
    if (!init) {
      recv.clients.forEach(c => c.initialized = c.readyToSend = true);
      init = buffer.slice(0, elem.start - index);
    }
    emit(buffer.slice(0, elem.start - index));
    recv.clients.forEach(c => c.readyToSend = true);
    buffer = buffer.slice(elem.start - index);
    index = elem.start;
  }

  if (elem.end >= index + buffer.length) emit(buffer);
});

app.use(express.static('public'));

server.on('upgrade', function upgrade(request, socket, head) {
  const pathname = url.parse(request.url).pathname;

  let handler = ws[pathname];
  if (handler) {
    handler.handleUpgrade(request, socket, head, function done(ws) {
      handler.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

server.listen(5000, () => console.log('server started'));

send.on('connection', conn => {
  if (send.clients.size > 1) { // only allow one client to send
    conn.close();
    return;
  }
  console.log('sender connected');
  conn.on('message', message => {
    if (buffer) index += buffer.length;
    buffer = message;
    decoder.write(message);
  });
});

recv.on('connection', conn => {
  console.log('receiver connected');
  conn.initialized = conn.readyToSend = false;
  if (init) {
    conn.send(init);
    conn.initialized = true;
  }
});
