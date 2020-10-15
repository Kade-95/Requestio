'use strict'
const { Server, Func } = require('@thekade/kerd');

global.server = new Server();
const func = new Func();

let { port, protocol } = server.getCommands('-');
if (!func.isset(port)) port = 8080;
if (!func.isset(protocol)) protocol = 'http';

server.createServer({
    port,
    protocol,
    domains: { origins: ['*'] },
    response: params => {
        params.response.end('Hello world');
    }
});

server.methods.post = (req, res, form) => {
    res.end(JSON.stringify({ word: 'Hello' }));
}

server.makeStatic('build');