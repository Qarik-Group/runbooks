## Access the Jumpbox via SSH

To ssh to the jumpbox, run:

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
