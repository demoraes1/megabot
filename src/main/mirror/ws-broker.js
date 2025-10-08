const http = require('http');
const WebSocket = require('ws');
const { EventEmitter } = require('events');

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PATH = '/mirror';

class MirrorBroker extends EventEmitter {
  constructor(options = {}) {
    super();
    this.host = options.host || DEFAULT_HOST;
    this.path = options.path || DEFAULT_PATH;
    this.httpServer = null;
    this.wsServer = null;
    this.port = null;
    this.clients = new Set();
    this.started = false;
  }

  async start() {
    if (this.started) {
      return this.getConnectionInfo();
    }

    this.httpServer = http.createServer();
    await new Promise((resolve, reject) => {
      const onError = (error) => {
        this.httpServer?.off('listening', onListening);
        reject(error);
      };
      const onListening = () => {
        this.httpServer?.off('error', onError);
        resolve();
      };
      this.httpServer.once('error', onError);
      this.httpServer.once('listening', onListening);
      this.httpServer.listen(0, this.host);
    });

    const address = this.httpServer.address();
    this.port = address && typeof address.port === 'number' ? address.port : null;

    this.wsServer = new WebSocket.Server({
      server: this.httpServer,
      path: this.path
    });

    this.wsServer.on('connection', (socket, request) => {
      this.clients.add(socket);
      this.emit('connection', socket, request);

      socket.on('message', (data, isBinary) => {
        for (const client of this.clients) {
          if (client === socket || client.readyState !== WebSocket.OPEN) {
            continue;
          }
          try {
            client.send(data, { binary: isBinary });
          } catch (error) {
            this.emit('client-error', error);
          }
        }
      });

      socket.on('close', () => {
        this.clients.delete(socket);
        this.emit('disconnection', socket);
      });

      socket.on('error', (error) => {
        this.emit('client-error', error);
      });
    });

    this.wsServer.on('error', (error) => {
      this.emit('error', error);
    });

    this.started = true;
    return this.getConnectionInfo();
  }

  async stop() {
    if (!this.started) {
      return;
    }

    for (const socket of this.clients) {
      try {
        socket.terminate();
      } catch (error) {
        this.emit('client-error', error);
      }
    }
    this.clients.clear();

    await new Promise((resolve) => {
      if (this.wsServer) {
        try {
          this.wsServer.close(() => resolve());
        } catch (error) {
          resolve();
        }
      } else {
        resolve();
      }
    });

    await new Promise((resolve) => {
      if (this.httpServer) {
        try {
          this.httpServer.close(() => resolve());
        } catch (error) {
          resolve();
        }
      } else {
        resolve();
      }
    });

    this.httpServer = null;
    this.wsServer = null;
    this.port = null;
    this.started = false;
  }

  getConnectionInfo() {
    if (!this.started || !this.port) {
      return null;
    }
    return {
      host: this.host,
      path: this.path,
      port: this.port,
      url: `ws://${this.host}:${this.port}${this.path}`
    };
  }
}

module.exports = MirrorBroker;
