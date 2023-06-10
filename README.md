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

9. Run the simulator (in another terminal):

    ```sh
    bun src/simulator.ts
    ```

10. Run the server:

    ```sh
    bun src/index.ts
    ```

11. Use VS Code [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) to test the API by clicking the **Send Request** link in the code blocks below.

Generate an access card:

```http
POST http://localhost:3310/access/generate
Authorization: Bearer {{$dotenv ID_TOKEN}}
Content-Type: application/json

{"accessId":"{{$guid}}"}
```

Get public stats:

```http
GET http://localhost:3310/stats-public
```

# Raspberry Pi Setup

1. Flash an Debian Bullseye arm64 into an SD card.

2. Set up networking ([LAN](https://learn.sparkfun.com/tutorials/headless-raspberry-pi-setup/ethernet-with-static-ip-address), [Wi-Fi](https://learn.sparkfun.com/tutorials/headless-raspberry-pi-setup/wifi-with-dhcp)).

3. [Set up default user (see _Headless setup_ section).](https://www.raspberrypi.com/news/raspberry-pi-bullseye-update-april-2022/)

4. Put the SD card into the Pi and boot it up.

5. SSH into the Pi: `ssh pi@raspberrypi.local`

6. Install Docker: `curl -sSL https://get.docker.com | sh`

7. Set up Cloudflare tunnel.

8. Set up Docker Compose project:

    ```sh
    git clone https://github.com/creatorsgarten/garden-gate-pi.git
    ```

9. Create and edit `config.json`:

    ```sh
    cp config.example.json config.json
    vi config.json
    ```

10. Run the service:

    ```sh
    docker compose up -d
    ```

## Deploying new code

```sh
docker compose pull && docker compose up -d
```
