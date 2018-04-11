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
gives you a convenient routine to initialize your vault: `safe
init`.

First you will need to target the new vault as per the [Target and
Authenticate to a Vault](#target-and-authenticate-to-a-vault)
section below.  You also need to "pretend" to authenticate with a
bogus token, also covered in that section.

Next, run `safe init`.  This will output five unseal keys and the
root token.  Store these in a secure location, such as 1Password,
another Vault, etc.

This initialization will automatically unseal the vault, so you
don't have to [do it manually](#unseal-the-vault).  It also
creates a test secret `secret/handshake` for testing.

If you're not using Genesis, you must manually initialize the
vault using `safe vault operator init` after targeting, then
[manually unsealing](#unseal-the-vault), and then authenticating to
the new Vault, and finally adding the test secret using `safe set
secret/handshake knock=knock`.



## Target and Authenticate to a Vault

Before you can access Vault, you must first target and
authenticate to it using Safe.  You need to know the IP address or
fully-qualified domain name of your Vault server, whether it is
using HTTPS (recommended) or HTTP, and if it has a self-signed certificate.

To find the Vault IP addresses from BOSH, you can run the
following command:

```
$ bosh -d your-vault vms
Instance  Process State  AZ  IPs           VM CID       VM Type
vault/0   running        z1  10.200.130.6  vm-98627dfd  small
vault/1   running        z1  10.200.130.5  vm-5c9638b1  small
vault/2   running        z1  10.200.130.4  vm-a59d7f16  small
```

For example, if your Vault is located at
`secrets.cloud.mycorp.com` and uses a certificate signed by a
third-party certificate authority, and you want to refer to this
Vault as `myvault`, you can create a target for this Vault with
the following command:

```
$ safe target https://secrets.cloud.mycorp.com myvault
```

If instead you are using a self-signed certificate, you would add
a `-k` option to that command.  Furthermore, if you target an IP
address directly without TLS (on an internal network, for
example), you have to issue a command similar to:

```
$ safe target http://10.0.200.44 lab-vault
```

to create a target named `lab-vault` that targets a Vault at
10.0.200.44 without TLS.

To see your targets, run the `safe targets` command:

```
$ safe targets

Known Vault targets - current target indicated with a (*):
(*) lab-vault   (insecure) http://10.0.200.44
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



## Copy Secrets to a Different Vault

You can use `export` + `import` to copy secrets form one targeted
Vault to another:

```bash
$ safe --target src-vault export | safe --target dst-vault import
```

You must be authenticated to both Vaults before running this command.



## Change a Secret

Before you try to change a secret manually, consider if it can be
rotated using Genesis.  Genesis has a `secrets rotate` command
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
1Password, LastPass, or something similar.  Whenever you apply
updates to your Vault installation, or recreate its VMs, the Vault
will come up in _sealed_, and won't let anyone (not even
authenticated users!) extract secrets.

The Genesis Vault kit deploys a component called `strongbox` that
makes it trivial to unseal the Vault.  This activates three
commands in `safe`:

  1. `safe status` - Check whether the Vault is sealed or not
  2. `safe unseal` - Unseal all of the Vault nodes
  3. `safe seal` - Seal all of the Vault nodes

```
$ safe status
https://10.200.130.6:443 is sealed
https://10.200.130.4:443 is sealed
https://10.200.130.5:443 is sealed
```

To unseal the Vault, run the following command and enter any three
of the five unseal keys:

```
$ safe unseal
You need 3 key(s) to unseal the vaults.

Key #1:
Key #2:
Key #3:
unsealing https://10.200.130.4:443...
unsealing https://10.200.130.5:443...
unsealing https://10.200.130.6:443...
```

The keys won't be echoed to the screen, so be sure to copy them
accurately.  To confirm the Vault is now unsealed, run `safe
status` again:

```
$ safe status
https://10.200.130.6:443 is unsealed
https://10.200.130.4:443 is unsealed
https://10.200.130.5:443 is unsealed
```

If you are using a Vault that was not deployed by Genesis, you
will have to manually unseal each Vault node, individually.

For each IP (which you can get via `bosh vms`): IP, run:

```
safe vault operator unseal --address <protocol://ip:port>
```

This will prompt you for one (and only one) key.  Keep running
that command until enough keys have been entered, and then move
onto the next IP.



## Common Errors and Their Solutions

You may encounter the following errors when using `safe`.  Here's
some suggestions for things to try to move past them.

### `!! API 503 Service Unavailable`

The Vault is likely sealed, and it needs to be unsealed before it
can be accessed.  This will happen every time you update or
redeploy the Vault.  Unseal your Vault and everything should start
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
