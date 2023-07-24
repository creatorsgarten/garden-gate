# Garden Gate: Garden Zero Door Authorizer

## How it works

-   The API server runs on a Raspberry Pi in a secure area. Currently, it is being deployed at [Garden Zero](https://creatorsgarten.org/wiki/GardenZero).

## Development config

Garden Gate uses Google IAM Credentials to authenticate callers.

To set up a development environment:

1. Create a Google Cloud Platform project and a service account. Give it a name.

2. Grant it the [Service Account OpenID Connect Identity Token Creator](https://cloud.google.com/iam/docs/service-account-permissions#id-token-creator-role) role.

3. Download the service account's JSON credentials file.

4. Using `gcloud`, activate the service account:

    ```sh
    gcloud auth activate-service-account --key-file=<path-to-credentials-file>
    ```

5. Generate an ID token for the service account:

    ```sh
    gcloud auth print-identity-token --audiences=https://github.com/creatorsgarten/garden-gate
    ```

    The ID token can be used for 1 hour. After that, you need to generate a new one.

6. Copy `config.example.json` to `config.json`.

7. Copy the service account’s email address from the credentials file to the config file’s `allowedEmails` array.

8. Create an `.env` file and put in `ID_TOKEN=<id-token>`

9. Run the build script in watch mode:

    ```sh
    pnpm run build --watch
    ```

10. Run the simulator (in another terminal):

    ```sh
    node dist/simulator.js
    ```

11. Run the server:

    ```sh
    node dist/index.js
    ```

12. Use VS Code [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) to test the API by clicking the **Send Request** link in the code blocks below.

Generate an access card:

```http
POST http://localhost:3310/access/generate
Authorization: Bearer {{$dotenv ID_TOKEN}}
Content-Type: application/json

{
    "accessId": "{{$guid}}",
    "userId": "user01",
    "prefix": "name"
}
```

Get logs:

```http
GET http://localhost:3310/access/log?timeLimitSeconds=3600
Authorization: Bearer {{$dotenv ID_TOKEN}}
```

Get public stats:

```http
GET http://localhost:3310/stats-public
```

## Local development and testing

In a terminal tab, run the build script:

```sh
pnpm run build --watch
```

In another terminal tab, run the test environment:

```sh
pnpm qa
```

In another terminal tab, run the tests:

```sh
pnpm test
```

## Production access

To access the production server and make authenticated calls, you need to be granted access to Garden Gate’s service account on Google Cloud.

<details><summary>How to grant access to the service account</summary>

1. Go to [service account’s permissions page](https://console.cloud.google.com/iam-admin/serviceaccounts/details/107259846035962061387/permissions?project=creatorsgarten-wiki).
2. Click **Grant Access**.
3. Type in the Google account’s email address.
4. Select the **Service Account Token Creator** role.
5. Click **Save** and wait for a few minutes.

</details>

1. Using `gcloud`, get the service account’s ID token:

    ```sh
    gcloud auth print-identity-token \
        --audiences=https://github.com/creatorsgarten/garden-gate \
        --impersonate-service-account=garden-gate@creatorsgarten-wiki.iam.gserviceaccount.com \
        --include-email \
        --project=creatorsgarten-wiki
    ```

    The above common should output a long string. This is the ID token. The ID token can be used for 1 hour. After that, you need to generate a new one.

2. Create a `.env` file and put in:

    ```sh
    ID_TOKEN=<id-token>
    GARDEN_GATE_URL=https://<domain>
    ```

    You should have received the URL from the Garden Gate maintainer. Please make sure that there is no trailing slash in the URL.

3. Use VS Code [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) invoke the API by clicking the **Send Request** link in the code blocks below.

Get access log:

```http
GET {{$dotenv GARDEN_GATE_URL}}/access/log?timeLimitSeconds=3600
Authorization: Bearer {{$dotenv ID_TOKEN}}
```

Get error log:

```http
GET {{$dotenv GARDEN_GATE_URL}}/error-log
Authorization: Bearer {{$dotenv ID_TOKEN}}
```
