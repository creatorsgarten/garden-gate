# Garden Gate: Garden Zero Door Authorizer

## How it works

-   The API server runs on a Raspberry Pi in a secure area. Currently, it is being deployed at [Garden Zero](https://creatorsgarten.org/wiki/GardenZero).

## Development config

Use the following JWK to sign JWTs for development:

```json
{
    "d": "Ad4ooif_bu32JFHYRsCkxAzjV8NzSo_H3iibdGM5-_ogVg2xxvcBmU817y9jYi6NjHFjcIyAJi8bkPeVqI2-f8k5YjHp8o8J6Y6UC17o-OEhNXBZDSp5OAWk1rXZsdz6jAv4J1wfGxbgefNP9RxZ97qHTXq7vAnLH5D5qF1b3cOlRICO0W2dJbRjkHgO6kAVK79RbLtkv_Zlljoxrykq9CTn_lE477fr7wyJK7guXDJwdDvfE5j6os_7syClXPWGpHuHF6ngyF1fEmsdwKVYdD6FStVzq9Plks3qjoh4FphgvUqX1NUvcrx_aXkaukS8FM3U9tryxbnm4cx6CDuV8Q",
    "dp": "3QjqjuVmC7GN5P1zv2_Qrf6P0PLgdjuq8yyDZxxdkbqMpwVGz7Z6eH91sSMxHyo86UQjH-2hSvJeAtw0dTvJht9tDQdW8cyR0s5c5rXv3QGXxanOzBuvwXNwNHZ_Pv5n9Si2EDnk4D05XjfXIN78Ktzm3qnsXcaRsqBywaC3z-k",
    "dq": "KWzPERiaL0I99AwWFTLvT6yCI9ntVS_ehNoLBmyR_ip_uA4WJzWxOIFR9ZrMs_jOIg6YtbsLvDUMNGu7Gd3aXcATocCinl6eORPA5hIxZ5dMvEM8odQ_T8e-IJrrmHE2kAVmvMh-T9jUHivnNwJ1tDFMkEXEUKZvrHv9cxHzbYE",
    "e": "AQAB",
    "kty": "RSA",
    "n": "wFFyJnZ72SU7cAHZOhXtYDAFFqQekm35I2Iupy_Pam0fPibx_LH_uYnZ80Jj-YoMEHcA-vLOmoxEZ20L66ZUrNWi27h3Pbtp0SPWJpfEY8lWGSkFO_ARF3k1CB666FcKRC3ub4UdPoj5skper-KrxXp7env2qFTt2DjM2zSUdg6fZuTFMRr4A1fx3dCKVapDAwAOZgPjU6EYtpGiKa2A7FmXsRKg0BdjFlLfYSADxjwM7hOR5q106Fq1JJAzUPbDlRMlIlno0WYhbCpHJzBIhOoTi-xUi_4A3F2U9Om29PAO4qAyW6HVCA_BHyjvCEkhkyxoGnFTCPC4PROFU91pNQ",
    "p": "8R6ENqT-rwdCW0mgfIIeR1y0S3NSFSLAEdOGWguPH4Y6JUAe5-m_yfolYZM26z7ednsY3BT4To6DYmG_Unzp9tnljIIRCEXl3jxRu6WFjDkNIS8SBAQbbfEyBEXLyC-voh8nb7wvQafnXklu-KeANUkjCHunXgWAzUsPtyHqiy0",
    "q": "zC_px3bSQAIaTnDyKXQ590szwu2J_rbAoUgVksi19rDJhagq7DQ5kq_MEh0Al6w_XKnzJQoxvNuApPddc2NHE-rFMf0A56_Wj0mCzsT-9MTvbubo_ismldqvI-jSeLL3FwboUjzm5kKeK77LYJwf28iQNBuBgoR5H_R8IZE4-yk",
    "qi": "yRgiyXhi7Ocgu5aBKLwaJhCtMPDL2ft31vkMN9tDiq4Fe5a2LJ5XEfZt197U-eNGKNmzdp62Ci9MflEakL1ePvA4H7NYXNWNIMH3hkMSKIPggz6ax-fIRNMiDkBKsEAcOV1TXvSQqvlcMTW7Yd8kyqD1f6jqs8iLRm99FVmUZAM"
}
```

Corresponding public key:

```json
{
    "e": "AQAB",
    "kty": "RSA",
    "n": "wFFyJnZ72SU7cAHZOhXtYDAFFqQekm35I2Iupy_Pam0fPibx_LH_uYnZ80Jj-YoMEHcA-vLOmoxEZ20L66ZUrNWi27h3Pbtp0SPWJpfEY8lWGSkFO_ARF3k1CB666FcKRC3ub4UdPoj5skper-KrxXp7env2qFTt2DjM2zSUdg6fZuTFMRr4A1fx3dCKVapDAwAOZgPjU6EYtpGiKa2A7FmXsRKg0BdjFlLfYSADxjwM7hOR5q106Fq1JJAzUPbDlRMlIlno0WYhbCpHJzBIhOoTi-xUi_4A3F2U9Om29PAO4qAyW6HVCA_BHyjvCEkhkyxoGnFTCPC4PROFU91pNQ"
}
```

Generate an access card:

```http
POST http://localhost:3000/access/generate
Authorization: Bearer dummy
Content-Type: application/json

{}
```

Get public stats:

```http
GET http://localhost:3000/stats-public
```