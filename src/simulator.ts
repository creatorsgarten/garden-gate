import { Elysia, t } from "elysia";
import {
  DIGEST,
  parseAuthorizationHeader,
  buildWWWAuthenticateHeader,
} from "http-auth-utils";

/*
To run the simulator, run the following command:

bun run src/simulator.ts

To test with the simulator, use the following environment variables:

HIKVISION_IP=127.0.0.1:3331
HIKVISION_EMPLOYEE_NO=500033
HIKVISION_ADMIN_PASSWORD=simulatorPassword
*/

function digestAuth(request: Request): any {
  const realm = "DS-SIMULATOR";
  const qop = "auth";
  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return unauthorized("authorize please");
  }
  const result = parseAuthorizationHeader(authorization, [DIGEST]);
  const hash = DIGEST.computeHash({
    algorithm: "md5",
    qop,
    realm,
    username: result.data.username,
    password: "simulatorPassword",
    uri: result.data.uri,
    nonce: result.data.nonce,
    nc: result.data.nc || "",
    method: request.method.toUpperCase(),
    cnonce: result.data.cnonce || "",
  });
  if (hash !== result.data.response) {
    return unauthorized("invalid digest hash");
  }
  function unauthorized(message: string): any {
    return new Response(`[simulator / auth] ${message}`, {
      status: 401,
      headers: {
        "WWW-Authenticate": buildWWWAuthenticateHeader(DIGEST, {
          realm,
          qop,
          nonce: "1234567890",
          opaque: "0987654321",
        }),
      },
    }) as any;
  }
}

function badRequest(message: string): any {
  return new Response(`[simulator: bad request] ${message}`, {
    status: 400,
  }) as any;
}

interface CardInfo {
  employeeNo: string;
  cardNo: string;
  leaderCard: string;
  cardType: string;
}

const cards: Map<string, CardInfo> = new Map();

new Elysia()
  .post(
    "/ISAPI/AccessControl/CardInfo/Search",
    async ({ body, request }) => {
      const unauthorized = digestAuth(request);
      if (unauthorized) return unauthorized;
      const found = Array.from(cards.values()).filter((card) =>
        body.CardInfoSearchCond.EmployeeNoList.some(
          (employee) => employee.employeeNo === card.employeeNo
        )
      );
      console.log(`[Search] Found ${found.length} cards`);
      return {
        CardInfoSearch: {
          searchID: body.CardInfoSearchCond.searchID,
          responseStatusStrg: "OK",
          numOfMatches: found.length,
          totalMatches: found.length,
          CardInfo: found,
        },
      };
    },
    {
      body: t.Object({
        CardInfoSearchCond: t.Object({
          searchID: t.String(),
          maxResults: t.Number(),
          searchResultPosition: t.Number(),
          EmployeeNoList: t.Array(
            t.Object({
              employeeNo: t.String(),
            })
          ),
        }),
      }),
    }
  )
  .post(
    "/ISAPI/AccessControl/CardInfo/Record",
    async ({ body, request }) => {
      const unauthorized = digestAuth(request);
      if (unauthorized) return unauthorized;
      const cardNoRegex = /^[0-9a-zA-Z-]{1,20}$/;
      if (!cardNoRegex.test(body.CardInfo.cardNo)) {
        return badRequest(`invalid cardNo (must match ${cardNoRegex})`);
      }
      if (cards.has(body.CardInfo.cardNo)) {
        return new Response(
          `[simulator] cardNo ${body.CardInfo.cardNo} already exists`,
          { status: 409 }
        );
      }
      cards.set(body.CardInfo.cardNo, {
        employeeNo: body.CardInfo.employeeNo,
        cardNo: body.CardInfo.cardNo,
        leaderCard: "",
        cardType: body.CardInfo.cardType,
      });
      console.log(
        `[Record] Added card ${body.CardInfo.cardNo} for employee ${body.CardInfo.employeeNo}`
      );
      return {
        statusCode: 1,
        statusString: "OK",
        subStatusCode: "ok",
      };
    },
    {
      body: t.Object({
        CardInfo: t.Object({
          employeeNo: t.String(),
          cardNo: t.String(),
          cardType: t.Literal("normalCard"),
        }),
      }),
    }
  )
  .put(
    "/ISAPI/AccessControl/CardInfo/Delete",
    async ({ body, request }) => {
      const unauthorized = digestAuth(request);
      if (unauthorized) return unauthorized;
      for (const cardNo of body.CardInfoDelCond.CardNoList) {
        if (!cards.has(cardNo.cardNo)) {
          console.log(`[Delete] Card ${cardNo.cardNo} not found`);
          continue;
        }
        cards.delete(cardNo.cardNo);
        console.log(`[Delete] Deleted card ${cardNo.cardNo}`);
      }
      return {
        statusCode: 1,
        statusString: "OK",
        subStatusCode: "ok",
      };
    },
    {
      body: t.Object({
        CardInfoDelCond: t.Object({
          CardNoList: t.Array(
            t.Object({
              cardNo: t.String(),
            })
          ),
        }),
      }),
    }
  )
  // TODO: Implement POST /ISAPI/AccessControl/AcsEvent
  .listen(3331);
