---------------------
schooled.htb moodle.schooled.htb

gobuster moodle.schooled.htb

```
===============================================================
2021/04/11 22:26:43 Starting gobuster in directory enumeration mode
===============================================================

/repository         (Status: 301) [Size: 255] [--> http://moodle.schooled.htb/moodle/availability/]
```

Information

- Using Redis cache, s3 bucket, php web site
- Staff email address: phillips_manuel@staff.schooled.htb
- Student email address: angel@student.schooled.htb

XSS on MoodleNet Profile field:
- TODO: Steal teacher's cookie

Exploit Information:
- CVE-2020-14321

--------------------------------------

cat /etc/passwd

root:*:0:0:Charlie &:/root:/bin/csh
jamie:*:1001:1001:Jamie:/home/jamie:/bin/sh
steve:*:1002:1002:User &:/home/steve:/bin/csh

------
db config:
$CFG->dbtype    = 'mysqli';
$CFG->dblibrary = 'native';
$CFG->dbhost    = 'localhost';
$CFG->dbname    = 'moodle';
$CFG->dbuser    = 'moodle';
$CFG->dbpass    = 'PlaybookMaster2020';
$CFG->prefix    = 'mdl_';
$CFG->dboptions = array (
  'dbpersist' => 0,
  'dbport' => 3306,
  'dbsocket' => '',
  'dbcollation' => 'utf8_unicode_ci',
);

----------
Admin hash:
 admin             | $2y$10$3D/gznFHdpV6PXt1cLPhX.ViTgs87DCE5KqphQhGYR5GFbcl4qTiW

$2y$10$3D/gznFHdpV6PXt1cLPhX.ViTgs87DCE5KqphQhGYR5GFbcl4qTiW:!QAZ2wsx

------------------------------

User jamie may run the following commands on Schooled:
    (ALL) NOPASSWD: /usr/sbin/pkg update
    (ALL) NOPASSWD: /usr/sbin/pkg install *


Create your own pkg: http://lastsummer.de/creating-custom-packages-on-freebsd/

