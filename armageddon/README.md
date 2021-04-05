
# Enumeration

Some basic nmap scan let us know that this box has 2 opening ports, `22, 80`

Visit the website, navigate around. But I see nothing interested
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
