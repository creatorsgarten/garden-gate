import { test, expect } from 'vitest'
import axios, { AxiosInstance } from 'axios'
import ObjectID from 'bson-objectid'

const client = axios.create({
    baseURL: 'http://localhost:3000/',
    headers: {
        Authorization: 'Bearer tester',
    },
})

const door1 = axios.create({
    baseURL: 'http://localhost:3331/',
})
const door2 = axios.create({
    baseURL: 'http://localhost:3332/',
})

async function getActiveCards(door: AxiosInstance) {
    const { data } = await door.get('/simulator/cards')
    return data.map((x: any) => x.cardNo)
}
async function useCard(door: AxiosInstance, cardNo: string) {
    const { data } = await door.post('/simulator/access', { cardNo })
    return data
}

async function createAccess({
    userId = ObjectID().toHexString(),
    overrideTimeout = undefined as number | undefined,
}) {
    const accessId = ObjectID().toHexString()
    const { data } = await client.post('/access/generate', {
        accessId,
        userId,
        prefix: 'user',
        overrideTimeout,
    })
    return data
}
async function cleanUp() {
    await client.post('/tester/cleanup')
}

test('status', async () => {
    const { data } = await client.get('/')
    expect(data.status).toEqual(expect.any(String))
})

test('generates access', async () => {
    const data = await createAccess({})
    expect(data.accessKey).toEqual(expect.any(String))
    expect(data.createdAt).toEqual(expect.any(String))
    expect(data.expiresAt).toEqual(expect.any(String))
    expect(await getActiveCards(door1)).toContain(data.accessKey)
    expect(await getActiveCards(door2)).toContain(data.accessKey)
})

test('cleans up after expired', async () => {
    const data = await createAccess({ overrideTimeout: 0.1 })
    expect(await getActiveCards(door1)).toContain(data.accessKey)
    expect(await getActiveCards(door2)).toContain(data.accessKey)
    await new Promise((resolve) => setTimeout(resolve, 150))
    await cleanUp()
    expect(await getActiveCards(door1)).not.toContain(data.accessKey)
    expect(await getActiveCards(door2)).not.toContain(data.accessKey)
})

test('allow multiple users', async () => {
    const data1 = await createAccess({})
    const data2 = await createAccess({})
    expect(await getActiveCards(door1)).toContain(data1.accessKey)
    expect(await getActiveCards(door2)).toContain(data1.accessKey)
    expect(await getActiveCards(door1)).toContain(data2.accessKey)
    expect(await getActiveCards(door2)).toContain(data2.accessKey)
})

test('revokes previous access when generate card for new user', async () => {
    const userId = ObjectID().toHexString()
    const data1 = await createAccess({ userId })
    expect(await getActiveCards(door1)).toContain(data1.accessKey)
    const data2 = await createAccess({ userId })
    expect(await getActiveCards(door1)).not.toContain(data1.accessKey)
    expect(await getActiveCards(door2)).toContain(data2.accessKey)
})

test('cleans up the access after used', async () => {
    const userId = ObjectID().toHexString()
    const data1 = await createAccess({ userId })
    expect(await getActiveCards(door1)).toContain(data1.accessKey)
    await useCard(door1, data1.accessKey)
    await cleanUp()
    expect(await getActiveCards(door1)).not.toContain(data1.accessKey)
    expect(await getActiveCards(door2)).toContain(data1.accessKey)
})

test('error log', async () => {
    await client.post(
        '/tester/simulate-error',
        {},
        { validateStatus: () => true },
    )
    const { data } = await client.get('/error-log')
    expect(data).toEqual(expect.any(Array))
    expect(data).toContainEqual(
        expect.objectContaining({
            message: expect.stringContaining('Simulated error'),
        }),
    )
})
