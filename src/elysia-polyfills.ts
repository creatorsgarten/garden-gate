import '@bogeychan/elysia-polyfills/node/index.js'

const originalServe = globalThis.Bun.serve

// Implement server.reload() function. Otherwise, Elysia may crash with:
//
// TypeError: this.server.reload is not a function
//     at Elysia.compile (node_modules/elysia/dist/cjs/index.js:518:25)
//
globalThis.Bun.serve = function (...args) {
    const server = originalServe.apply(this, args as any)
    if (!server.reload) {
        server.reload = () => {}
    }
    return server
}
