'use strict'
import { Kerds } from '@thekade/kerds';

global.kerds = new Kerds();

let { port, protocol } = kerds.getCommands('-');
if (!kerds.isset(port)) port = 8080;
if (!kerds.isset(protocol)) protocol = 'http';

kerds.createServer({
    port,
    protocol,
    domains: { origins: ['*'] },
    response: params => {
        params.response.end('Hello world');
    }
});

kerds.handleRequests = (req, res, form) => {
    res.end(JSON.stringify({ word: 'Hello' }));
}

kerds.makeStatic('public');