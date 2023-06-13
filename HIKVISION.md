# Notes about Hikvision

## Get card info

```http
POST http://{{$dotenv HIKVISION_IP}}/ISAPI/AccessControl/CardInfo/Search?format=json
Authorization: Digest admin {{$dotenv HIKVISION_ADMIN_PASSWORD}}
Content-Type: application/json

{
  "CardInfoSearchCond": {
    "searchID": "{{$guid}}",
    "maxResults": 2000,
    "searchResultPosition": 0,
    "EmployeeNoList": [
      { "employeeNo": "{{$dotenv HIKVISION_EMPLOYEE_NO}}" }
    ]
  }
}
```

```json
{
    "CardInfoSearch": {
        "searchID": "fab02d83-4ad8-4a61-a931-305ce0ae60d1",
        "responseStatusStrg": "OK",
        "numOfMatches": 1,
        "totalMatches": 1,
        "CardInfo": [
            {
                "employeeNo": "100054",
                "cardNo": "tmp001",
                "leaderCard": "",
                "cardType": "normalCard"
            }
        ]
    }
}
```

When no card is registered, the `CardInfo` array will be missing.

```json
{
    "CardInfoSearch": {
        "searchID": "4ef69650-96f2-41e8-87d5-282d7f73e45b",
        "responseStatusStrg": "NO MATCH",
        "numOfMatches": 0,
        "totalMatches": 0
    }
}
```

## Add card

-   `cardNo` is case senstitive, only allow alpha-numeric characters and hyphen, max 20 chars. For an algorithm to generate a card number, see [`generateCardNo()`](./generateCardNo.js).

```http
POST http://{{$dotenv HIKVISION_IP}}/ISAPI/AccessControl/CardInfo/Record?format=json
Authorization: Digest admin {{$dotenv HIKVISION_ADMIN_PASSWORD}}
Content-Type: application/json

{
  "CardInfo": {
    "employeeNo": "{{$dotenv HIKVISION_EMPLOYEE_NO}}",
    "cardNo": "garten-zho0k6WjKtxJm",
    "cardType": "normalCard"
  }
}
```

```json
{
    "statusCode": 1,
    "statusString": "OK",
    "subStatusCode": "ok"
}
```

## Delete card

```http
PUT http://{{$dotenv HIKVISION_IP}}/ISAPI/AccessControl/CardInfo/Delete?format=json
Authorization: Digest admin {{$dotenv HIKVISION_ADMIN_PASSWORD}}
Content-Type: application/json

{
  "CardInfoDelCond": {
    "CardNoList": [ { "cardNo": "garten-zho0k6WjKtxJm" } ]
  }
}
```

```json
{
    "statusCode": 1,
    "statusString": "OK",
    "subStatusCode": "ok"
}
```

## Fetch logs

```http
POST http://{{$dotenv HIKVISION_IP}}/ISAPI/AccessControl/AcsEvent?format=json
Authorization: Digest admin {{$dotenv HIKVISION_ADMIN_PASSWORD}}
Content-Type: application/json

{
  "AcsEventCond": {
    "searchID": "{{$guid}}",
    "searchResultPosition": 0,
    "maxResults": 2000,
    "major": 0,
    "minor": 0,
    "startTime": "{{$localDatetime iso8601 -1 h}}",
    "endTime": "{{$localDatetime iso8601}}",
    "employeeNoString": "{{$dotenv HIKVISION_EMPLOYEE_NO}}"
  }
}
```

```json
HTTP/1.1 200 OK
Date: Fri, 09 Jun 2023 20:07:40 GMT
Server: webs
Content-Length: 2208
Connection: close
X-Frame-Options: SAMEORIGIN
Cache-Control: no-store
Pragma: no-cache
Content-Type: application/json

{
  "AcsEvent": {
    "searchID": "b6e1244c-e50b-43e5-8407-e42230298bd3",
    "totalMatches": 6,
    "responseStatusStrg": "OK",
    "numOfMatches": 6,
    "InfoList": [
      {
        "major": 5,
        "minor": 1,
        "time": "2023-06-09T19:05:47+07:00",
        "cardNo": "garten-XU7oiAB9AU01t",
        "cardType": 1,
        "name": "Creatorgarten",
        "cardReaderNo": 1,
        "doorNo": 1,
        "employeeNoString": "100054",
        "type": 0,
        "serialNo": 42970,
        "userType": "normal",
        "currentVerifyMode": "cardOrFaceOrFp"
      },
      {
        "major": 5,
        "minor": 1,
        "time": "2023-06-09T19:29:42+07:00",
        "cardNo": "garten-Xn7E2BoG9fj8f",
        "cardType": 1,
        "name": "Creatorgarten",
        "cardReaderNo": 1,
        "doorNo": 1,
        "employeeNoString": "100054",
        "type": 0,
        "serialNo": 42976,
        "userType": "normal",
        "currentVerifyMode": "cardOrFaceOrFp"
      },
      {
        "major": 5,
        "minor": 1,
        "time": "2023-06-09T19:33:43+07:00",
        "cardNo": "garten-SUXYtpk1x4opU",
        "cardType": 1,
        "name": "Creatorgarten",
        "cardReaderNo": 1,
        "doorNo": 1,
        "employeeNoString": "100054",
        "type": 0,
        "serialNo": 42980,
        "userType": "normal",
        "currentVerifyMode": "cardOrFaceOrFp"
      },
      {
        "major": 5,
        "minor": 1,
        "time": "2023-06-09T19:52:20+07:00",
        "cardNo": "garten-Qg2XNleUKYHhm",
        "cardType": 1,
        "name": "Creatorgarten",
        "cardReaderNo": 1,
        "doorNo": 1,
        "employeeNoString": "100054",
        "type": 0,
        "serialNo": 42984,
        "userType": "normal",
        "currentVerifyMode": "cardOrFaceOrFp"
      },
      {
        "major": 5,
        "minor": 1,
        "time": "2023-06-09T19:53:33+07:00",
        "cardNo": "garten-Qg2XNleUKYHhm",
        "cardType": 1,
        "name": "Creatorgarten",
        "cardReaderNo": 1,
        "doorNo": 1,
        "employeeNoString": "100054",
        "type": 0,
        "serialNo": 42987,
        "userType": "normal",
        "currentVerifyMode": "cardOrFaceOrFp"
      },
      {
        "major": 5,
        "minor": 1,
        "time": "2023-06-09T19:58:47+07:00",
        "cardNo": "garten-Qg2XNleUKYHhm",
        "cardType": 1,
        "name": "Creatorgarten",
        "cardReaderNo": 1,
        "doorNo": 1,
        "employeeNoString": "100054",
        "type": 0,
        "serialNo": 42991,
        "userType": "normal",
        "currentVerifyMode": "cardOrFaceOrFp"
      }
    ]
  }
}
```
