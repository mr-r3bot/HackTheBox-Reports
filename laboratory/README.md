# Enumeration
Usng `nmap -sV -A -T4 -Pn 10.10.10.216 -oN lab_nmap.txt` show us result that website has these opening ports: `80,443,22`
The result back from nmap show us that there are 2 domains in there: `laboratory.htb`, `git.laboratory.htb`
=> Add laboratory.htb, git.laboratory.htb to `/etc/hosts` file to access to those websites

Visit https://laboratory.htb

After visiting the website, we can now have 1 information is that username `dexter` is the CEO of laboratory.

Run gobuster for directory enumeration

`gobuster dir -u https://laboratory.htb` 

While waiting for gobuster, visit website `https://git.laboratory.htb` 

We see that it's a Gitlab platform. Register a user account with emain domain @laboratory.htb

After navigate around gitlab website, go to `/help` directory, with user account, we can see that the Gitlab version using is `12.8.1`

After I google around about Gitlab 12.8.1 vulns, I found this vulnerability reported by [vakzz](https://hackerone.com/reports/827052)
and a PoC [python script](https://github.com/thewhiteh4t/cve-2020-10977)

# Exploit

Executing the PoC python script got me to read file from gitlab server, I decided to read `/etc/passwd` file first, and then I try to find `.ssh/id_rsa` file but no luck

And then I read more about the CVE that vakzz reported, turn out that vulnerability can lead to remote code execution (RCE) 

I follow vakzz steps to reproduce RCE vuln:
- Start a docker container with `gitlab/gitlab-ce:12.8.1` image
- Read secrets.yaml file from `https://git.laboratory.htb` server (using [python script](https://github.com/thewhiteh4t/cve-2020-10977) with this path `/opt/gitlab/embedded/service/gitlab-rails/config/secrets.yml` )
- Replace `secret_key_base` value in `secrets.yaml` file inside `gitlab/gitlab-ce` container with the `secret_key_base` read from gitlab server
- Run `gitlab-ctl reconfigure && gitlab-ctl restart`
- After gitlab container restarted, execute cmd `gitlab-rails console` to get IRB shell 
- Execute the codes from [vakzz](https://hackerone.com/reports/827052) with `ping` payload to verify RCE

Indeed RCE vuln do exist on gitlab server 12.8.1, now I take a further step with reverse shell payload and generate a cookie
Send a `curl` request to gitlab server with cookie, start a listener listen for the shell call

From the shell, we can see we were first brought to the gitlab-rails directory within Gitlab. Gitlab-Rails as we know is an interactive Gitlab CLI. Because we are in a container and the website is owned by `dexter`, perhaps there is a shared folder or we can find/reset his credentials

We can execute these commands to reset `dexter` password 
```
gitlab-rails console -e production
user = User.where(id:1).first
user.password = "password1"
user.password_confirmation = "password1"
user.save!
```

And then we go to `git.laboratory.htb` website and login with creds `dexter:password1`. We found dexter `id_rsa` key
With that private key, we can login to laboratory server `dexter@10.10.10.216` and there we got `user.txt` flag



# Post Exploitation
Using `LinEnum.sh` for local enumeration -> check for any vulnerabilities that we can use for privilege escalation.

After the script ran, we find one interesting executable file at `usr/local/bin/docker-security` 

Inspect file permission show us that `docker-security` has a setuid (SUID) that allow us to execute it as `root` user

See file content with `cat docker-security` and find out 2 interesting commands `chmod 700 /usr/bin/docker` and `chmod 660 /var/run/docker.sock`

In the script file, they use `chmod`relative path, not absolute path => We can hijack this execution.

- Create a folder at `/tmp/suid` 
- Write a reverse shell script and name it `chmod` and enable permission for it to execute `chmod +x chmod`
- Add current path to PATH environment: `export PATH=$(pwd):$PATH` 

When `./docker-security` file is executed, it will find `chmod` command ( which is using relative path) and it will find our current path `/tmp/suid` that we added to `PATH` env. So it will execute our `chmod` reverse shell instead of the real chmod
=> Listen for reverse shell in our machine and we have `root` user
