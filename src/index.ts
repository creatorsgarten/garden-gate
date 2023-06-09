import {Elysia} from 'elysia'

// @todo #1 expose the server only to allowed hostnames for security
const app = new Elysia()

app.get('/', () => ({status: 'Garden Gate is active.'})).listen(3000)

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
)
