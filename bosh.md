BOSH is an Open Source tool for orchestrating deployment, lifecycle
management, and monitoring of distributed systems. To learn more about BOSH,
visit [Ultimate Guide to BOSH][ugtb], or the [official BOSH
documentation][bosh-docs].

[ugtb]:      https://ultimateguidetobosh.com
[bosh-docs]: https://bosh.io/docs
[bosh-envs]: https://bosh.io/docs/cli-envs.html



## Log Into Your Director

Before you can run any BOSH commands, you should set up an alias for it, in
your local configuration, and authenticate.  This is done via the `bosh
alias-env` command:

```
$ bosh alias-env your-env \
    -e https://bosh-ip:25555 \
    --ca-cert <(safe get secret/your/env/bosh/ssl/ca:certificate)

Using environment 'https://10.200.130.1' as anonymous user

Name      your-env
UUID      9d22659b-a582-411c-a6d4-2ccc24211d4c
Version   263.2.0 (00000000)
CPI       vsphere_cpi
Features  compiled_package_cache: disabled
          config_server: disabled
          dns: disabled
          snapshots: disabled
User      (not logged in)

Succeeded
```

Future BOSH commands will only need to specify `-e your-env` to target this
BOSH director, instead of having to specify the full URL and certificate
authority certificate.

Since we are still _anonymous_, let's go ahead and log in:

```
$ bosh -e your-env login
Username (): admin
Password ():

Using environment 'https://10.200.130.1' as client 'admin'

Logged in to 'https://10.200.130.1'

Succeeded
```

You can use the `bosh env` command to verify that you are logged in:

```
$ bosh -e your-env env

Using environment 'https://10.200.130.1' as client 'admin'

Name      your-bosh
UUID      9d22659b-a582-411c-a6d4-2ccc24211d4c
Version   263.2.0 (00000000)
CPI       vsphere_cpi
Features  compiled_package_cache: disabled
          config_server: disabled
          dns: disabled
          snapshots: disabled
User      admin

Succeeded
```

You only need to `bosh login` for interactive (i.e. jumpbox) use.  For
automated scripts, you can set the `BOSH_CLIENT_ID` and `BOSH_CLIENT_SECRET`
environment variables to `admin` and the password:

```
$ export BOSH_CLIENT_ID=admin
$ export BOSH_CLIENT_SECRET=$(safe read secret/your/env/bosh/users/admin:password)
$ bosh env
... etc ...
```

The Genesis BOSH Kit makes the admin client secret and the admin user
password identical, so this works in the general case.



## Upload a BOSH Release

When BOSH goes to deploy software, it does so by way of _BOSH Releases_, a
native packaging format specific to BOSH.  Genesis Kits take care of
uploading their own releases, but for custom add-ons, or manual deployments,
you may need to upload a release or two yourself.

To upload a release:

```
$ bosh upload-release path/to/release-1.2.3.tar.gz
```

You can also upload by URL:

```
$ bosh upload-release https://some-host/path/to/release-1.2.3.tar.gz
```

To see what releases have been uploaded, use `bosh releases`:

```
$ bosh releases

Using environment 'https://10.200.130.1' as client 'admin'

Name                         Version               Commit Hash
binary-buildpack             1.0.14*               cdf2d3ff+
~                            1.0.11                60f6b0e9+
bosh                         264.6.0               930eb48+
~                            264.5.0*              e522d81+
bosh-vsphere-cpi             45.1.0                45d0f21
~                            45*                   857f3d2

(*) Currently deployed
(+) Uncommitted changes

6 releases

Succeeded
```

If a release has a `+` next to its commit hash, that means that the release
was created while there were still local changes to its git repository.  For
in-house releases, this could indicate that the release cannot be properly
recreated, because changes may not have been committed after they were
incorporated into the release.



## Upload a Stemcell

BOSH only handles image-based deployment.  The images it uses are
called _Stemcells_, because they can specialize into whatever VM
type you need through BOSH releases.  Each Cloud / IaaS has its
own set of Stemcells that are tailored to its peculiarities.

Before you can deploy anything, you will need to upload a
stemcell for your platform:

```
$ bosh upload-stemcell path/to/stemcell.tgz
```

or, specify a remote URL:

```
$ bosh upload-stemcell https://some-host/path/to/stemcell.tgz
```

Genesis Kits do not upload stemcells.

To see what stemcells have already been uploaded:

```
$ bosh stemcells

Using environment 'https://10.200.130.1' as client 'admin'

Name                                      Version   OS             CPI  CID
bosh-vsphere-esxi-ubuntu-trusty-go_agent  3468.21*  ubuntu-trusty  -    sc-cf483483-1be8-4a53-a244-378e89addf74
~                                         3468.13*  ubuntu-trusty  -    sc-0fe9bcd7-6010-4e30-812f-49d69c71aed2
~                                         3445.24   ubuntu-trusty  -    sc-3c54878e-7161-41f4-b8f6-d24f7d037bd7

(*) Currently deployed

3 stemcells

Succeeded
```



## Re-Upload a Broken Stemcell or Release

If you attempt to upload a stemcell or BOSH release with the same
name and version of one that already exists on the BOSH director,
nothing will happen.

Occasionally, however, you need to overwrite a stemcell or release
with a better copy.  Perhaps the file didn't download successfully
and you uploaded a corrupt copy.  Perhaps the BOSH director ran
out of disk space and only partially processed the file upload.

Whatever the reason, the `upload-stemcell` and `upload-release`
commands sport a `--fix` flag for just this situation:

```
$ bosh upload-stemcell --fix path/to/stemcell.tgz
$ bosh upload-release  --fix path/to/release.tgz
```



## Clean Up a BOSH Director

Over time, your BOSH director will accumulate releases and
stemcells that it no longer needs.  If you are diligent about
patching systems when new stemcells come out, a lot of director
disk space will be used by older stemcells that you no longer
need.  Likewise, if you update your deployments to the latest and
greatest releases regularly, you'll have a lot of unused release
archives on-disk.

To clean them up, use the `bosh clean-up` command:

```
$ bosh clean-up
```

Yes, there's a hyphen in the middle there.

The `clean-up` command deletes most of the unused stemcells and
releases.  Stemcells will be removed from the underlying cloud /
IaaS; releases will be removed from the BOSH blobstore.  The most
recent two unused releases and stemcells will remain, in case you
need to downgrade a deployment to a previous revision.



## Manage Cloud Config

BOSH _cloud config_ is a YAML file that defines IaaS-specific
configuration properties used by the director for deployments.
These include things like VM types, networking, availability
zones, etc.

For full details on all the fun IaaS-specific options, refer to
the [BOSH Cloud Config documentation][bosh-cc].

You can get the current `cloud-config` like this:

```
$ bosh cloud-config
$ bosh cloud-config > cloud.yml
```

Saving your cloud config to a file is a great way to make changes
to it.  Download the current config, modify it, and then upload
the new version to BOSH.  That last step is handled by
`update-cloud-config`:

```
$ bosh cloud-config > cloud.yml
$ vim cloud.yml
$ bosh update-cloud-config cloud.yml
```

Every time you give BOSH a new cloud-config, it will mark all
deployments as _outdated_ until they are re-deployed with the
latest configuration.

[bosh-cc]: https://bosh.io/docs/cloud-config.html



## Configure a Runtime Add-on (Like Toolbelt)

BOSH uses a facility called _runtime configs_ to inject
configuration and software into its deployments, without having to
modify the existing deployment manifest.  These _addons_ can be
anything: extra utilities, a virus scanner, firewall and
intrusion detection software, monitoring agents etc.

The following runtime configuration deploys the excellent
[Toolbelt BOSH release][toolbelt] to all VMs, enriching the on-box
troubleshooting experience:

```
addons:
  - name: toolbelt
    jobs:
      - name: toolbelt
        release: toolbelt

releases:
  - name: toolbelt
    version: 3.4.2
    url:     https://github.com/cloudfoundry-community/toolbelt-boshrelease/releases/download/v3.4.2/toolbelt-3.4.2.tgz
    sha1:    2b4debac0ce6115f8b265ac21b196dda206e93ed
```

You can get the current `runtime-config` like this:

```
$ bosh runtime-config
$ bosh runtime-config > runtime.yml
```

As with _cloud configs_, saving your runtime config to a file is a
great way to make changes to it.  Download the current config,
modify it, and then upload the new version to BOSH.  That last
step is handled by `update-runtime-config`:

```
$ bosh runtime-config > runtime.yml
$ vim runtime.yml
$ bosh update-runtime-config runtime.yml
```

For more information, check the [BOSH Runtime Config
documentation][bosh-rc].

[toolbelt]: https://github.com/cloudfoundry-community/toolbelt-boshrelease
[bosh-rc]:  https://bosh.io/docs/runtime-config.html



## View Deployment Health Information

There are a few interesting bits of information you can get out of
BOSH, with respect to the health of the VMs it has deployed.

First up, `bosh vms` shows you the agent status:

```
$ bosh -d vault vms
Instance  Process State  AZ  IPs           VM CID       VM Type
vault/0   running        z1  10.200.130.6  vm-98627dfd  small
vault/1   failing        z1  10.200.130.5  vm-5c9638b1  small
vault/2   running        z1  10.200.130.4  vm-a59d7f16  small
```

The possible values for _Process State_ are:

  1. `running` - Everything is OK
  2. `failing` - The VM is up, but the deployed software isn't
  3. `unresponsive agent` - The BOSH director hasn't heard from
     the agent on the VM in a while.

You can also get system vitals out of BOSH:

```
bosh -d vault vms --vitals
```

The newer `bosh instances` provides similar information:

```
$ bosh -d vault instances
Instance  Process State  AZ  IPs
vault/0   running        z1  10.200.130.6
vault/1   failing        z1  10.200.130.5
vault/2   running        z1  10.200.130.4
```

To get detailed information about each instance, pass `--ps`:

```
$ bosh -d vault instances --ps
Instance  Process    Process State  AZ  IPs
vault/0   -          running        z1  10.200.130.6
~         consul     running        -   -
~         strongbox  running        -   -
~         vault      running        -   -
vault/1   -          running        z1  10.200.130.5
~         consul     running        -   -
~         strongbox  running        -   -
~         vault      failing        -   -
vault/2   -          running        z1  10.200.130.4
~         consul     running        -   -
~         strongbox  running        -   -
~         vault      running        -   -
```

Something is wrong with the actual Vault process on `vault/1`.



## Determine Who Has Persistent Disks

Persistent disks are vital to any deployments that involve durable
data, like databases and storage solutions.  If you need to figure
out which instances in a deployment have been assigned persistent
disks, you can use the `--details` flag to `bosh instances`

```
$ bosh -d vault instances --details
Instance  Process State  AZ  IPs           State    VM CID       VM Type  Disk CIDs
vault/0   running        z1  10.200.130.6  started  vm-98627dfd  small    disk-8970b8d2
vault/1   running        z1  10.200.130.5  started  vm-5c9638b1  small    disk-d0ccdc58
vault/2   running        z1  10.200.130.4  started  vm-a59d7f16  small    disk-204c8403
```

If there is a value in the _Disk CIDs_ column, that instance has
been given a persistent disk.



## SSH Into an Instance

To get a remote shell on a BOSH-deployed instance, you can use the
`bosh ssh` command:

```
$ bosh -d vault ssh vault/1
```

BOSH will provision you a temporary user account with `sudo`
access, and then run the appropriate `ssh` commands to log into
the instance, remotely, as that user.

From there, you can look at logs, restart jobs and processes, and
otherwise diagnose and troubleshoot.

If BOSH is deploying instances behind a NAT device, you may need a
_gateway_ to bounce through for SSH access.  All this gateway
needs is SSH access.  The `--gateway-*` options take care of the
configuration:

```
$ bosh -d vault ssh                    \
    --gw-host your-gateway-ip          \
    --gw-user username                 \
    --gw-private-key path/to/user/key  \
    vault/1
```



## View Logs on a Deployed Instance

Once you've SSHed onto a deployed instance, you can see what the
software you're trying to deploy has been up to by perusing the
logs.  BOSH releases almost always store logs under
`/var/vcap/sys/log`, instead of more traditional places.

Often, each component of the deployment will have a directory
under `/var/vcap/sys/log`; logs live under those.  Often, releases
will split their standard output and standard error streams into
separate log files, suffixed `.stdout.log` and `.stderr.log`.



## Restart a Monit Job

BOSH uses a system called _Monit_ to supervise the processes that
make up the software it deploys.  In addition to restarting
defunct processes, Monit also informs the BOSH director of the
health and state of the pieces of each deployment.  This is where
the _Process State_ values in `bosh vms` / `bosh instances` output
come from.

If you SSH into an instance, you can use the `monit` command (as
the root user) to see what's going on and restart processes.

```
$ monit summary
The Monit daemon 5.2.5 uptime: 1d 1h 10m

Process 'shield-agent'              failing
Process 'vault'                     running
Process 'shieldd'                   running
Process 'nginx'                     running
System 'system_localhost'           running
```

To restart a failing process:

```
$ monit restart shield-agent
```

It's usually best to follow that up with:

```
$ watch monit summary
```

The `watch` command will run `monit summary` every 2 seconds, and
keep its output on the screen in the same place, making it easy to
notice when the process flips from _initializing_ to _running_.



## Run a "Cloud Check" Against The IaaS

If you suspect that the IaaS / Cloud layer is acting up, either by
removing VMs or losing disk attachments, you can run a _cloud
check_ against a deployment.

When BOSH runs a cloud check, it takes inventory of the VMs and
disks that it ought to have, and compares that with what it
actually has.  If it finds an discrepancies, you'll be asked to
resolve each one individually.

```
bosh -d vault cloud-check
```

For more information, check out the [BOSH Cloud Check
documentation][bosh-cck].

[bosh-cck]: https://bosh.io/docs/cck.html



## Run An Errand

_Errands_ are a special type of one-off task that a BOSH release
can define.  Errands can do things like apply database migrations,
initialize systems, run smoke tests, conduct an inventory of a
cluster, and more.

To see what errands are available, consult with your Genesis Kit
documentation, or the documentation that came with the BOSH
releases you are deploying.

To see what errands are runnable:

```
$ bosh errands
```

To run an errand, specify it by name:

```
$ bosh run-errand my-errand
```



## Inspect An Errand VM

When errands fail, they print error logs to standard error, and
then exit.  BOSH then deprovisions the errand VM, making it
difficult to diagnose things like connectivity issues or
authentication problems.

If you specify the `--keep-alive` flag when you run the errand,
however, BOSH will not perform this cleanup step.  You can then
`bosh ssh` into the VM to perform your troubleshooting.

```
$ bosh run-errand my-errand --keep-alive
... wait for the failure ...

$ bosh ssh my-errand
```

Once you figure out the problem and correct it, you will want to
run the errand again _without_ the `--keep-alive` flag to get BOSH
to clean up the errand VM one last time.



## Fix An Unresponsive Agent

If BOSH lists an instance as `unresponsive agent`, it means it
hasn't heard from the agent, via the NATS message bus, in a while.

BOSH doesn't initiate conversation with deployed instances; it
waits for them to contact it via the message bus.  Sometimes this
fails because of networking configuration between the instance and
the director.  Other times, TLS certificates get in the way.

Often, a single unresponsive agent in an otherwise healthy
deployment will clear up on its own.  Unless its an emergency,
give the system some time to coalesce and see if it recovers.

If lots of agents become unresponsive, it could point to a
systemic or network-wide issue, like a bad route, failing router,
misconfigured firewall, etc.  In these cases, start
troubleshooting at the network and work your way back to the BOSH
director.

As a last resort, you can have BOSH forcibly recreate the
instances via the `bosh recreate` command:

```
$ bosh -d vault recreate
```

This will detach any persistent disks (so that they survive),
delete the running virtual machine instances, and bring up new
copies.



## Cancel a BOSH Task

Everything BOSH does it does via _tasks_.  You can use the `bosh
tasks` command to get a list of currently executing, and recently
executed tasks:

```
$ bosh tasks
$ bosh tasks -r
```

Each task has a number, and you can use that number to identify
that task and interact with it via the BOSH command-line utility.

To view a task and follow its output (à la `tail -f`):

```
$ bosh task 12345
```

You can also cancel a task if you know its ID:

```
$ bosh cancel-task 12345
```

However, be aware that BOSH often cannot interrupt a task to
cancel it, and instead has to wait for a "lull" in task processing
to actually cancel it.  For example, when a deployment task is
canceled, it will continue attempting to deploy software to the
current instances it is working on, and only then will BOSH try to
cancel it.  You may not even be _able_ to cancel  a task to delete
a deployment, depending on when you get to it.

For more details, refer to the [BOSH Tasks
documentation][bosh-tasks]

[bosh-tasks]: https://bosh.io/docs/director-tasks.html



## Configure Multiple CPIs

As of v263, BOSH directors can support multiple CPIs for
instrumenting lots of different IaaS instances.  You can deploy
BOSH that talks to three different vCenters.

This is a more advanced subject, but it's really neat, so we want
to include it in the runbook.  A full write-up can be found on the
[Stark & Wayne blog][cpi-blog], but here's a summary:

  1. Create a BOSH _CPI Config_ and upload it
  2. Update BOSH _Cloud Config_ with CPI information
  3. Re-upload / Fix Stemcells
  4. Assign AZs as appropriate

[cpi-blog]: https://www.starkandwayne.com/blog/multi-cpi-bosh-one-bosh-to-rule-them-all
