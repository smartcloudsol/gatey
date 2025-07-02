require('./crypto-random.js');

if (!globalThis.crypto?.subtle) {
    globalThis.asmCrypto = require('asmcrypto.js');
    globalThis.elliptic = require('elliptic');
    require('webcrypto-liner/build/webcrypto-liner.shim.js');
}