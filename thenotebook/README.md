----------------
gobuster

2021/04/06 16:14:56 Starting gobuster in directory enumeration mode
===============================================================
/login                (Status: 200) [Size: 1250]
/register             (Status: 200) [Size: 1422]
/admin                (Status: 403) [Size: 9]
/logout               (Status: 302) [Size: 209] [--> http://10.10.10.230/]

=====================================================
Token data:
{
  "typ": "JWT",
  "alg": "RS256",
  "kid": "http://localhost:7070/privKey.key"
}

{
  "username": "r3ot",
  "email": "1@gmail.com",
  "admin_cap": 0
}
======================================================
cat /etc/passwd
root:x:0:0:root:/root:/bin/bash
noah:x:1000:1000:Noah:/home/noah:/bin/bash

====================================================
cp home.tar.gz /tmp
tar -zxcf home.tar.gz 
COPY id_rsa private key and login
=> got user

====================================================
sudo -l
(ALL) NOPASSWD: /usr/bin/docker exec -it webapp-dev01*

========================
Exploit: https://programmersought.com/article/71085031667/
Source code: https://github.com/Frichetten/CVE-2019-5736-PoC

Install Docker image without internet:
https://stackoverflow.com/questions/48125169/how-run-docker-images-without-connect-to-internet
