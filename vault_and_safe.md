Vault is a secure secret store by Hashicorp.  Safe is a CLI for
Vault that is more user-friendly and powerful than the native
Vault CLI.  For more information, refer to the [Vault
documentation][vault-docs] and the [Safe guide][safe-docs].

Pre-compiled Mac OSX and Linux `safe` binaries can be downloaded
from [Github][safe-dl].

[vault-docs]: https://www.vaultproject.io/docs/concepts
[safe-docs]:  https://github.com/starkandwayne/safe/blob/master/README.md
[safe-dl]:    https://github.com/starkandwayne/safe/releases



## Initialize Vault

Ideally, you deployed your Vault using the `vault-genesis-kit` via
a Genesis deployment.  Doing so uses the safe-boshrelease, which
gives you a convenient routine to initialize your vault: 
`genesis do my-env -- init`.

Running `genesis do my-env -- init` will output five unseal keys and the
root token.  Store these in a secure location, such as 1Password,
another Vault, etc.

This initialization will automatically unseal the vault, so you
don't have to [do it manually](#unseal-the-vault).  It also
creates a test secret `secret/handshake` for testing.


## Target and Authenticate to a Vault

Before you can access Vault, you must first target and
authenticate to it using Safe.  

Easiest way to do this is with `genesis do my-env target`. Give it the token 
that was generated on init to target and authenticate to the vault. 

```
$ genesis do my-env target
Running target addon for my-env

Specifying --target to the target command makes no sense; ignoring...
Currently targeting my-env at https://10.128.80.12
Skipping TLS certificate validation
Uses Strongbox at http://10.128.80.12:8484/strongbox

Authenticating against my-env at https://10.128.80.12
Token:

Retrieving status of Vault via node 10.128.80.12
https://10.128.80.12:443 is unsealed
https://10.128.80.13:443 is unsealed
https://10.128.80.14:443 is unsealed
```

To see your targets, run the `safe targets` command:

```
$ safe targets

Known Vault targets - current target indicated with a (*):
(*) my-env      (noverify) https://10.128.80.12
    lab-vault   (insecure) http://10.0.200.44
    myvault                https://secrets.cloud.mycorp.com
```

Once you have targets, you can switch between them by running the
`safe target` command with the name of the target you want as the
argument, or `-i` to choose interactively.  The Vault you target
stays targeted until changed with a subsequent `safe target` call.

```
$ safe target myvault
Now targeting myvault at https://secrets.cloud.mycorp.com
```

Once targeted, you must authenticate to the Vault by running the
`safe auth` command. This command runs in several different modes,
supporting various authentication systems, but the primary method
is `token` .  You will need to get your token from the Vault
administrator, then run the following:

```
$ safe auth token
Authenticating against myvault at https://secrets.cloud.mycorp.com
Token:
```

Type in your token at the prompt, then hit enter.  The token will
not be displayed to the screen, nor will there be any confirmation
that the token was accepted,



## Test Your Access

Once authenticated, the easiest way to test that you can connect
to Vault from the command line is to run the following command:

```bash
$ safe get secret/handshake
```

You should get the following response:

```
--- # secret/handshake
knock: knock
```

If you are not authenticated, you will get the following response:

```
You are not authenticated to a Vault.
Try safe auth ldap
 or safe auth github
 or safe auth token
 or safe auth userpass
```

If you did not correctly target the Vault, you may get a message
similar to the following:

```
!! Get https://secrets.croud.mycorp.com/v1/secret/handshake: dial tcp: lookup secrets.croud.mycorp.com on 192.168.1.1:53: no such host:
```

or it may time out:

```
!! Get https://something-else.cloud.mycorp.com/v1/secret/handshake: dial tcp something-else.cloud.mycorp.com:80: getsockopt: operation timed out
```



## Find Secrets

A common need for safe is to retrieve secrets stored in it to
access services provided by BOSH and CF deployments.
Unfortunately sometimes you're not sure where the secret you need
is stored in Vault.

Vault stores secrets in a hierarchy of paths.  Genesis imposes
some conventions on this hierarchy: everything is stored under
`secret/` prefix, followed by the environment, split at each
hyphen, then the deployment type.  For example, the Genesis
Concourse deployment `your-prod` stores its secrets in
`secret/your/prod/concourse`.  This is referred to as the _vault
prefix_.

To find the secret you are after, you can list the secret paths
used for the deployment:

```
$ safe paths secret/your/env/bosh --keys

secret/your/env/bosh/aws:access_key
secret/your/env/bosh/aws:secret_key
secret/your/env/bosh/blobstore/agent:password
secret/your/env/bosh/blobstore/director:password
.
.
.
secret/your/env/bosh/users/admin:password
secret/your/env/bosh/users/concourse:password
```

Once you find the path of the secret you want, you can retrieve
via `safe get`:

```
$ safe get secret/your/env/bosh/users/admin:password
```



## Back up and Restore Secrets

You can export the entire contents of the secret store, as JSON,
to a file using `safe export`.

```
$ safe export > secrets.json
```

You can also backup a subset of secrets:

```
$ safe export secret/your/lab/bosh > lab-secrets.json
```

Secrets are exported in the clear, without encryption.  Handle these export files with care.

You can restore from an exported backup using the `safe import` command:

```bash
$ safe import < secrets.json
```

**Note:** You cannot restore the output of the export command to a
different prefix in Vault.  If you want to do this, you must edit
the json and manually change the path, or use `jq`:

```bash
$ cat secrets.json | \
    jq -Mc ".secret.your.prod.bosh | {'secret': {'your': {'staging': {'bosh': .}}}}" | \
    safe import
```

You can also backup your credentials in Vault using [shield][shield]. Shield has a
plugin for Vault which you can use to backup and restore Vault. The web UI is pretty
straitforward to follow. You can also get more details [here][runbook-shield].


## Copy Secrets to a Different Vault

You can use `export` + `import` to copy secrets form one targeted
Vault to another:

```bash
$ safe --target src-vault export | safe --target dst-vault import
```

You must be authenticated to both Vaults before running this command.



## Change a Secret

Before you try to change a secret manually, consider if it can be
rotated using Genesis.  Genesis has a `rotate-secrets` command
that rotates secrets for the named environment.

Other secrets can be changed by `safe set`

```
$ safe set secret/to/change key=value
$ safe set secret/to/change key
$ safe set secret/to/change key@path/to/file
```

The first variation sets `key` to `value` under the given path.
This has the unfortunate side-effect of leaking credentials to the
process table (anyone running `ps -ef` might see your secrets!).

The second variation fixes this by prompting you for the secret,
without terminal echo, and then confirming the value.  It looks
like this:

```
$ safe set secret/to/change key
key [hidden]:
key [confirm]:
```

The third variation is required if your secret value spans
multiple lines (like an RSA key or an X.509 certificate).  `safe`
expects to find the value of the secret _inside_ the named file.



## Unseal The Vault

When you initialized your Vault, you were given 5 unseal keys,
along with the root token.  These will have been stored in
1Password, LastPass, or something similar.  Genesis also stores 
these keys inside the vault so that it can grab them prior to performing 
updates and unseal the updated vault automatically.  Otherwise, whenever you 
apply updates to your Vault installation manually (not recommended), or 
recreate its VMs, the Vault will come up in _sealed_, and won't let anyone 
(not even authenticated users!) extract secrets.

The Genesis Vault kit deploys a component called `strongbox` that
makes it trivial to unseal the Vault.  This activates three
commands in `genesis`:

  1. `genesis do my-env status` - Check whether the Vault is sealed or not
  2. `genesis do my-env unseal` - Unseal all of the Vault nodes
  3. `genesis do my-env seal`   - Seal all of the Vault nodes

```
$ genesis do my-env status
Running status addon for my-env

+ safe -T my-env status
https://10.128.80.12:443 is sealed
https://10.128.80.13:443 is sealed
https://10.128.80.14:443 is sealed
```

To unseal the Vault, run the following command and enter any three
of the five unseal keys:

```
$ genesis do my-env unseal
Running unseal addon for my-env

+ safe -T my-env unseal
You need 3 key(s) to unseal the vaults.

Key #1:
Key #2:
Key #3:
unsealing https://10.128.80.12:443...
unsealing https://10.128.80.13:443...
unsealing https://10.128.80.14:443...
```

The keys won't be echoed to the screen, so be sure to copy them
accurately.  To confirm the Vault is now unsealed, run `safe
status` again:

```
$ genesis do my-env status
Running status addon for my-env

+ safe -T my-env status
https://10.128.80.12:443 is unsealed
https://10.128.80.13:443 is unsealed
https://10.128.80.14:443 is unsealed
```


## Common Errors and Their Solutions

You may encounter the following errors when using `safe`.  Here's
some suggestions for things to try to move past them.

### `!! API 503 Service Unavailable`

The Vault is likely sealed, and it needs to be unsealed before it
can be accessed.  Unseal your Vault and everything should start
working again.


### `!! API 403 Forbidden`

You are not correctly authenticated to the targeted Vault. Try
re-authenticating to see if your credentials have changed.  If
that doesn't work, verify with your Vault administrator that your
account (or token) has been given access to the paths that you are
trying to access.

### `!! no secret exists at path ...`

You've requested a secret that doesn't exist.  Try a `safe tree
...` or `safe paths ...` and check your spelling / order of
components / prefixes / etc.

### `!! no key ... exists in secret ...`

The path you've requested exists, but the key you want isn't at
that path.  Usually, this means you've either misspelled something
in the request, or you've got the wrong path.


### `!! Get ...: no such host`

`safe` cannot find your Vault.

If the Vault has just been set up or this is the first time you've
targeted it, confirm that the URL you are targeting is correct.

If you are using DNS names to target your Vault, make sure they
resolve (via a tool like `dig`).

If you have accessed the Vault before, you may be experiencing a
network outage or misconfiguration.  If you need to be on a VPN to
access your Vault, make sure that it is connected.  Check your
proxy settings as well.


### `!! Get ...: operation timed out`

Your Vault is not responding, or your target isn't actually a
Vault.  Confirm the IP address of your target matches the IP
address for the Vault instances reported by the `bosh vms`.  If
the IP is correct and the VMS are reported as `running`, check
your proxy settings.

### `!! Get ...:8484/strongbox: ... connection refused; are you targeting a 'safe' installation?`

The `safe seal`, `safe unseal` and `safe status` commands require
a Genesis-deployed Vault to function.  You can use `safe` with
other types of Vault deployments, but you will have to use other
`safe vault ...` commands instead.

[shield]: https://shieldproject.io/
[runbook-shield]: http://runbooks.starkandwayne.com/shield.html
