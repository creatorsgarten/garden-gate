import { Elysia, t } from "elysia";
import {
  DIGEST,
  parseAuthorizationHeader,
  buildWWWAuthenticateHeader,
} from "http-auth-utils";

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
    password: "wtf",
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

new Elysia()
  .post(
    "/ISAPI/AccessControl/CardInfo/Search",
    async ({ body, request }) => {
      const unauthorized = digestAuth(request);
      if (unauthorized) return unauthorized;
      console.log(body);
      return {
        CardInfoSearch: {
          searchID: body.CardInfoSearchCond.searchID,
          responseStatusStrg: "OK",
          numOfMatches: 0,
          totalMatches: 0,
          CardInfo: [],
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
      response: {
        CardInfoSearch: t.Object({
          searchID: t.String(),
          responseStatusStrg: t.String(),
          numOfMatches: t.Number(),
          totalMatches: t.Number(),
          CardInfo: t.Array(
            t.Object({
              employeeNo: t.String(),
              cardNo: t.String(),
              leaderCard: t.String(),
              cardType: t.String(),
            })
          ),
        }),
      },
    }
  )
  .listen(3001);
