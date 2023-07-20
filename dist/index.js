// src/index.ts
import "@bogeychan/elysia-polyfills/node/index.js";
import { Elysia, t } from "elysia";
import Database from "better-sqlite3";
import fs2 from "fs";

// src/access.ts
import { edenTreaty } from "@elysiajs/eden";
import DigestClient from "digest-fetch";

// src/constants.ts
import fs from "fs";
var GATE_CONFIG = getGateConfig();
var APP_VERSION = Bun.env.APP_VERSION ?? "undefined";
var CARD_VALIDITY_IN_MINUTES = 3;
function getGateConfig() {
  const file = fs.readFileSync("./config.json", "utf-8");
  const config = JSON.parse(file);
  return config;
}

// src/access.ts
var { doors } = GATE_CONFIG;
var CardCreationError = class extends Error {
  constructor(cause) {
    super("Failed to create a timed access card.", { cause });
    this.name = "CardCreationError";
  }
};
function createDoorClient(door) {
  const client = new DigestClient(door.username, door.password);
  return edenTreaty(door.host, {
    fetcher: client.fetch.bind(client)
  });
}
async function createTimedAccessCard(cardNo) {
  try {
    const responses = await Promise.all(
      doors.map(async (door) => {
        const { ISAPI } = createDoorClient(door);
        const { data, error } = await ISAPI.AccessControl.CardInfo.Record.post({
          $query: {
            format: "json"
          },
          $fetch: {},
          CardInfo: {
            employeeNo: door.employeeNo,
            cardNo,
            cardType: "normalCard"
          }
        });
        if (error) {
          throw new Error(
            `Unable to create card with the door "${door.name}" with error ${error.status} ${error.value}`,
            { cause: error }
          );
        }
        data;
      })
    );
  } catch (err) {
    throw new CardCreationError(err);
  }
}
async function deleteTimedAccessCard(door, cardNo) {
  const { ISAPI } = createDoorClient(door);
  const { error } = await ISAPI.AccessControl.CardInfo.Delete.put({
    $query: {
      format: "json"
    },
    CardInfoDelCond: {
      CardNoList: [{ cardNo }]
    }
  });
  if (error) {
    throw new Error(
      `Unable to delete card with the door "${door.name}" with error ${error.status} ${error.value}`,
      { cause: error }
    );
  }
}
async function getCards() {
  return Promise.all(
    doors.map(async (door) => {
      const { ISAPI } = createDoorClient(door);
      const { data, error } = await ISAPI.AccessControl.CardInfo.Search.post({
        $query: {
          format: "json"
        },
        CardInfoSearchCond: {
          maxResults: 2e3,
          searchID: crypto.randomUUID(),
          searchResultPosition: 0,
          EmployeeNoList: [{ employeeNo: door.employeeNo }]
        }
      });
      if (error) {
        throw error;
      }
      return (data.CardInfoSearch.CardInfo || []).map((card) => ({
        door,
        card
      }));
    })
  ).then((a) => a.flat());
}
async function getDoorStats() {
  return Promise.all(
    doors.map(async (door) => {
      const { ISAPI } = createDoorClient(door);
      const { data, error } = await ISAPI.AccessControl.CardInfo.Search.post({
        $query: {
          format: "json"
        },
        CardInfoSearchCond: {
          maxResults: 2e3,
          searchID: crypto.randomUUID(),
          searchResultPosition: 0,
          EmployeeNoList: [{ employeeNo: door.employeeNo }]
        }
      });
      if (error) {
        return { name: door.name, error: error.status };
      }
      return {
        name: door.name,
        count: (data.CardInfoSearch.CardInfo || []).length
      };
    })
  );
}
function formatTimeAsiaBangkok(time = Date.now()) {
  return new Date(time + 7 * 36e5).toISOString().replace(/\.\d+Z$/, "+07:00");
}
async function getLogs(timeLimitSeconds) {
  const perDoor = await Promise.all(
    doors.map(async (door) => {
      const { ISAPI } = createDoorClient(door);
      const { data: data2, error } = await ISAPI.AccessControl.AcsEvent.post({
        $query: {
          format: "json"
        },
        AcsEventCond: {
          searchID: crypto.randomUUID(),
          searchResultPosition: 0,
          maxResults: 2e3,
          major: 0,
          minor: 0,
          startTime: formatTimeAsiaBangkok(
            Date.now() - timeLimitSeconds * 1e3
          ),
          endTime: formatTimeAsiaBangkok(Date.now() + 6e5),
          employeeNoString: door.employeeNo
        }
      });
      if (error) {
        return { door, error };
      }
      return { door, data: data2 };
    })
  );
  const data = perDoor.flatMap(({ door, data: data2 }) => {
    if (!data2)
      return [];
    return (data2.AcsEvent.InfoList || []).map((event) => {
      return { door, event };
    });
  });
  const errors = perDoor.flatMap(({ door, error }) => {
    if (!error)
      return [];
    return { door, error };
  });
  return { data, errors };
}

// src/createCardNumber.ts
function createCardNumber(prefix) {
  const charSet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const randomBits = Array.from(
    crypto.getRandomValues(new Uint8Array(20)),
    (x) => charSet[x % charSet.length]
  ).join("");
  return ("G-" + (prefix ? `${prefix}-` : "") + randomBits).slice(0, 20);
}

// src/verify.ts
import { createRemoteJWKSet, jwtVerify } from "jose";
var issuer = "https://accounts.google.com";
var keySetUrl = new URL("https://www.googleapis.com/oauth2/v3/certs");
var keySet = createRemoteJWKSet(keySetUrl);
function validate(jwt) {
  return jwtVerify(jwt, keySet, {
    issuer,
    audience: GATE_CONFIG.allowedAudiences
  });
}
var AuthorizationError = class extends Error {
  code = 401;
  status = "Unauthorized";
  constructor(message, cause) {
    super(message + (cause ? `: ${cause}` : ""), { cause });
  }
};
async function verifyRequestAuthenticity(authorization) {
  const match = authorization.match(/^Bearer (.+)$/);
  if (!match)
    throw new AuthorizationError("Invalid authorization header.");
  const [_, token] = match;
  const result = await validate(token).catch((e) => {
    throw new AuthorizationError("Invalid authorization token.", e);
  });
  if (!result.payload.email_verified) {
    throw new AuthorizationError("Email address not verified.");
  }
  if (!GATE_CONFIG.allowedEmails.includes(result.payload.email)) {
    throw new AuthorizationError("Email address not in allowlist.");
  }
}

// src/index.ts
var { doors: doors2 } = GATE_CONFIG;
if (!fs2.existsSync(".data"))
  await fs2.promises.mkdir(".data");
var db = new Database(".data/gardengate.sqlite");
db.prepare(
  `CREATE TABLE IF NOT EXISTS timed_access_cards (
        card_no TEXT PRIMARY KEY,
        access_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL
    )`
).run();
setInterval(async () => {
  await cleanup();
}, 15e3);
async function cleanup(log = false) {
  const [activeCards, doorLogs] = await Promise.all([
    getCards(),
    getLogs(3600)
  ]);
  for (const { door, card } of activeCards) {
    const timedCard = db.prepare(`SELECT * FROM timed_access_cards WHERE card_no = $cardNo`).get({ $cardNo: card.cardNo });
    if (!timedCard) {
      console.log(
        `[cleanup] Unknown card "${card.cardNo}" found in door "${door.name}". Deleting.`
      );
      await deleteTimedAccessCard(door, card.cardNo);
      continue;
    }
    if (/* @__PURE__ */ new Date() > new Date(timedCard.expires_at)) {
      console.log(
        `[cleanup] Card "${card.cardNo}" in door "${door.name}" has expired. Deleting.`
      );
      await deleteTimedAccessCard(door, card.cardNo);
      db.prepare(
        `DELETE FROM timed_access_cards WHERE card_no = $cardNo`
      ).run({ $cardNo: card.cardNo });
      continue;
    }
    if (doorLogs.data.find(
      (log2) => log2.event.cardNo === card.cardNo && log2.door.name === door.name
    )) {
      console.log(
        `[cleanup] Card "${card.cardNo}" has already been used at door "${door.name}". Deleting.`
      );
      await deleteTimedAccessCard(door, card.cardNo);
      continue;
    }
    if (log) {
      console.log(
        `[cleanup] Access "${timedCard.access_id}" in door "${door.name}" is still active.`
      );
    }
  }
}
await cleanup(true);
var app = new Elysia().onError(({ error }) => {
  console.error(error);
  if (error.cause) {
    console.error(error.cause);
    if (error.cause.cause) {
      console.error(error.cause.cause);
    }
  }
  throw error;
}).get("/", () => ({ status: "Garden Gate is active." })).get("/stats-public", async () => {
  return { doors: await getDoorStats() };
}).guard(
  {
    headers: t.Object({ authorization: t.String() }),
    beforeHandle: async (req) => {
      await verifyRequestAuthenticity(req.headers.authorization ?? "");
    }
  },
  (app2) => app2.post(
    "/access/generate",
    async ({ body: { accessId, prefix, userId } }) => {
      const cardNo = createCardNumber(prefix);
      const timeoutIn = 1e3 * 60 * CARD_VALIDITY_IN_MINUTES;
      const createdAt = /* @__PURE__ */ new Date();
      const expiresAt = new Date(Date.now() + timeoutIn);
      const userCards = db.prepare(
        `SELECT * FROM timed_access_cards WHERE user_id = $user_id`
      ).all({ $user_id: userId });
      if (userCards.length > 0) {
        console.log(
          `[cleanup] Removing ${userCards.length} cards owned by user ${userId} before granting a new card`
        );
        for await (const card of userCards) {
          await Promise.allSettled(
            doors2.map(async (door) => {
              await deleteTimedAccessCard(
                door,
                card.card_no
              );
              db.prepare(
                `DELETE FROM timed_access_cards WHERE card_no = $cardNo`
              ).run({ $cardNo: card.card_no });
            })
          );
        }
      }
      db.prepare(
        `INSERT INTO timed_access_cards (
                            card_no,
                            access_id,
                            user_id,
                            created_at,
                            expires_at
                        ) VALUES (
                            $cardNo,
                            $accessId,
                            $userId,
                            $createdAt,
                            $expiresAt
                        )`
      ).all({
        $cardNo: cardNo,
        $accessId: accessId,
        $userId: userId,
        $createdAt: createdAt.toISOString(),
        $expiresAt: expiresAt.toISOString()
      });
      await createTimedAccessCard(cardNo);
      console.log(`created: ${cardNo}`);
      return {
        accessKey: cardNo,
        createdAt,
        expiresAt
      };
    },
    {
      body: t.Object({
        accessId: t.String(),
        userId: t.String(),
        prefix: t.String({ pattern: "^[a-zA-Z]{0,10}$" })
      })
    }
  ).get(
    "/access/log",
    async ({ query }) => {
      const timeLimitSeconds = +query.timeLimitSeconds || 3600;
      const logs = await getLogs(timeLimitSeconds);
      return {
        errors: logs.errors.map((e) => {
          return { door: e.door.name, error: e.error };
        }),
        entries: logs.data.map((e) => {
          return {
            door: e.door.name,
            accessKey: e.event.cardNo,
            usedAt: new Date(e.event.time).toJSON()
          };
        })
      };
    },
    {
      query: t.Object({
        timeLimitSeconds: t.Optional(t.String())
      })
    }
  )
).listen(+Bun.env.PORT || 3310);
console.log(
  `Garden gate [${APP_VERSION}] is running at ${app.server?.hostname}:${app.server?.port}`
);
