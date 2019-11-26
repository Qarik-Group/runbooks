## Jumpbox Genesis Addons

The Jumpbox Genesis kit has a number of useful addons: 

```
$ genesis do my-env list
Running list addon for my-env
The following addons are defined:

  inventory           Take an inventory of software installed on the
                      jumpbox and the versions present.

  ssh                 SSH (interactively) into the jumpbox.

  who                 See who is logged into the jumpbox, via SSH.
                      (requires the ability to login via SSH)

If the 'openvpn' feature has been enabled, the following addons are also
available:

  generate-vpn-config <user>  Generate a client certificate (if missing)
                              and an openvpn config file for a given user

  certs                       List the VPN certificates for the users defined
                              on the given jumpbox environment.

  issue-cert <user>           Issue a new VPN certificate to a named user,
                              so that they can access the VPN.

  revoke-cert <user>          Revokes an issued VPN user certificate, preventing
                              them from accessing the VPN.

  renew-cert <user>           Renew the lifetime of a previously-issued VPN
                              certificate, without replacing the user's key.

  renew-all-certs             Renews the lifetime of all previously-issued VPN
                              certificates on the server, without replacing the
                              keys

  reissue-cert <user>         Re-issue a VPN user certificate, regnerating the
                              users key in the first place.  The old certificate
                              will be revoked.
```

## Access the Jumpbox via SSH

To ssh to the jumpbox, run:

```
$ genesis do my-env ssh
```

Or:

```
$ ssh you@jumpbox-ip -i path/to/your/private.key
```

To make it easier to SSH to your jumpbox, setup an entry in your
`~/.ssh/config` file:

```
Host jumpbox
  User         you
  Hostname     jumpbox-ip
  IdentityFile path/to/your/private.key
```

Then, you can `ssh jumpbox` to connect.



## Add a User to the Jumpbox

Several engineers will use a given Jumpbox, each of whom should
have their own account, with their own SSH key.  This helps with
both auditing and accountability, and also lets each person
customize his or her environment (editor settings, prompt, shell,
etc.)

The list of users provisioned on the jumpbox is in the `users`
param of the Genesis Jumpbox kit.  This is a YAML list.  To add
new people, append new items to the list:

```
params:
  users:
    - name:  new-user
      shell: /bin/bash
      ssh_keys:
        - ssh-rsa AAA.... user@host
```

Then, execute a `genesis deploy`, or let your Genesis CI/CD
pipelines do the work.
