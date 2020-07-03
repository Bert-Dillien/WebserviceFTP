# Installing required packages with yum
> Requires root access
```
yum install lftp httpd mod_ssl openssl nodejs
```

**lftp**: A commandline tool used in a script to sync with the remote ftp server

**httpd mod_ssl openssl**: Is the http daemon (apache) webserver + support for ssl (https)

**nodejs**: Nodejs, used to consume http(s) calls and return the files from the synced ftp server.

# FTP sync
> No root access required  
> Advised to do this as a regular user, in our example we use _remantconnect_

## Installation
- Upload the [ftp sync script](bash/ftp-sync) to the server, for example to `/home/remantconnect/bin/ftp-sync`.

## How to use
```
ftp-sync
ftp-sync /path/to/config
```
1) If you provide a config to the command, it will read the file and execute the sync according to it.
2) If you don't specify a file, it will look the current user home directory for the file `.ftp-sync-config`. If it exists, it will be used.
3) If the previous steps failed, a global default will be used located at `/etc/ftp-sync/config`.

## Config
This is an example config file which explains what each value is.
Change the values as needed.

It is recommended to seperate the push & pull directories into their own sub directory per configuration.
In this case we use `/home/remantconnect/ftp/inttra` as our working directory.
It is also recommended to put your config file in the same directory `/home/remantconnect/ftp/inttra/ftp-sync-config`.
```ini
# The protocol + ip or host name of the machine you want to connect to
FTP_HOST=sftp://example.com
# The user you will use to connect
FTP_USER=example
# OPTIONAL - The password for the user. If none is supplied, the ssh key of local user will be used
FTP_PASS=Super secure password

# OPTIONAL - Uploading: if one of these values isn’t supplied, there will be no uploading
# Files in this folder will be pushed to the remote, after a successful push, they are deleted/archived.
LOCAL_PUSH_DIR=/home/remantconnect/ftp/inttra/inbound
# If the archive has a value, all uploaded files will be moved here and won’t be deleted.
LOCAL_PUSH_ARCHIVE_DIR=/home/remantconnect/ftp/inttra/inbound_archive
# The location of where to upload the files to
REMOTE_PUSH_DIR=/inbound

# OPTIONAL - Downloading: if one of these values isn’t supplied, there will be no downloading
# Files from the remote server will be copied into here.
LOCAL_PULL_DIR=/home/remantconnect/ftp/inttra/outbound
# Files from this remote directory will be copied to the local directory.
REMOTE_PULL_DIR=/outbound
# Archive files after X days
PULL_ARCHIVE_AFTER_DAYS=7
# Clear the archive after X days
PULL_ARCHIVE_CLEAR_DAYS=60
# If the archive has a value, all downloaded files will be moved here after X days.
LOCAL_PULL_ARCHIVE_DIR=/home/remantconnect/ftp/inttra/outbound_archive
```

## Scheduling
You can run the command manually but ideally we would schedule how often the sync needs to happen. This can easly be accompished with cron scheduling.
```
crontab -e
```

Crontab may open the vi editor. For those who aren't familair with it, you can quickly google how to use it or use [this guide](https://www.howtogeek.com/102468/a-beginners-guide-to-editing-text-files-with-vi/).  

Here is an example of scheduling the sync for 2 configurations every 5 minutes during working hours and week days
```sh
SHELL=/bin/bash
PATH=/bin:/sbin:/usr/bin:/usr/sbin:/usr/local/bin:/usr/local/sbin:~/bin

# For details see man 4 crontabs

# Example of job definition:
# .---------------- minute (0 - 59)
# |  .------------- hour (0 - 23)
# |  |  .---------- day of month (1 - 31)
# |  |  |  .------- month (1 - 12) OR jan,feb,mar,apr ...
# |  |  |  |  .---- day of week (0 - 6) (Sunday=0 or 7 OR sun,mon,...
# |  |  |  |  |
# *  *  *  *  *  command to be executed

# Every 5 minutes between 6u - 20u during week days
*/5 6-20 * * 1-5 /home/remantconnect/bin/ftp-sync /home/remantconnect/ftp/inttra/ftp-sync-config
*/5 6-20 * * 1-5 /home/remantconnect/bin/ftp-sync /home/remantconnect/ftp/inttra-test/ftp-sync-config
```
# FTP web service
> Requires root access  
> Adviced to have a user with limited permissions, in our example we use _remantconnect_ but it could be a different user.

## Install node server
First off copy the following files and directories onto the server, we copy it to `/home/remantconnect/webservice-ftp`
- modules
- routes
- config.ini
- package.json
- routes.js
- server.js

In the terminal, navigate to the project and install all the node modules.
```
npm i
```

## Config
There are 2 configs, a global config and a config per ftp server.

### Global config
This file is the `config.ini` file in the project folder.
```ini
; default config file

[sites] ; Add all available ftp connections by their name
INTTRA=/home/remantconnect/ftp/inttra
INTTRATest=/home/remantconnect/ftp/inttra-test

[security] ; Specify the authentication
tokenType=Bearer
accessToken=<token>
description=SHA512_Sparklink.be
sslCertificateFile=/etc/ssl/certs/Certificate.crt
sslCertificateKeyFile=/etc/ssl/private/CertificateKey.key
sslCertificateChainFile=/etc/ssl/certs/CertificateChain.pem

[setup]
pathDelim=/
errorLog=ApiErrors.txt   ; logs generic errors, when no site could be determined
```

#### Enable https
We need to fill in the ssl settings to enable https support.

First we want to install our certificates. We want to install out public certificates in `/etc/ssl/certs` and private certificates in `/etc/ssl/private`. Make sure your user can read the private key.

In our example we upload our public keys `Certificate.crt` and `CertificateChain.pem` to the public and private key `CertificateKey.key` to the private folder.

### FTP config
This file is the `config.ini` file in the sites folder.  
Example: `/home/remantconnect/ftp/inttra/config.ini`
```ini
[file]
limit=100     ; maximun nr of files returned in one response
filters=*.xml ; comma list of file filters

[general]
sessions=sessions    ; folder name to store sessions
sessionDuration=120  ; session duration in minutes
logFile=ApiLog.txt
```

## Run the node server
Next up we want to configure the node server to start as a service.
Copy the [init script](bash/init-script) to the folder `/etc/init.d` with the name `http-to-ftp-server-inttra`

You may want to edit the script. there are 2 variables at the top.
- *WORKING_DIR*: This is the directory where you installed the node server, in our example it would be `/home/remantconnect/webservice-ftp`
- *USER*: Run the node server as this user, this is for extra security. This user should NOT have root access.

You can now start, stop, restart or check the status the service in the background
```
service http-to-ftp-server-inttra start
service http-to-ftp-server-inttra stop
service http-to-ftp-server-inttra restart
service http-to-ftp-server-inttra status
```

## Run on startup
We would also like the service to start when the machine reboots [[+]][Auto start generic].
```
chkconfig --add http-to-ftp-server-inttra
```

## Firewall [[+]][Firewall]
We also need to configure our firewall to allow http & https calls from the outside
```
firewall-cmd --permanent --add-port=7592/tcp
firewall-cmd --permanent --add-port=7593/tcp
```


## Call our webservice
You can now make http calls to the port `7592` and secure https calls to port `7593`, if you setup the certificates.


[Firewall]: https://www.digitalocean.com/community/tutorials/how-to-set-up-a-firewall-using-firewalld-on-centos-7
[Auto start generic]: https://www.thegeekdiary.com/how-to-enable-or-disable-service-on-boot-with-chkconfig/
[Matching hostnames]: https://unix.stackexchange.com/questions/263706/hostname-name-or-service-not-known/263709