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

## Add card

- `cardNo` is case senstitive, only allow alpha-numeric characters and hyphen, max 20 chars. For an algorithm to generate a card number, see [`generateCardNo()`](./generateCardNo.js).

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