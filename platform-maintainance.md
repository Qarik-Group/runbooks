## CF Push App: ERR Downloading Failed

There are many different possible reasons to cause "CF push app: ERR Downloading 
Failed". This guide will show you how to debug such problems by going through an example.

The following error messages were printed out when we started an app.

```
[cell/o] Creating container for app xx, container successfully created
[cell/o] ERR Downloading Failed
[cell/0] OUT cell-xxxxx stopping instance, destroying the container
[api/0] OUT process crushed with type: "web"
[api/0] OUT app instance exited
```
The first step is trying to figure out what failed to download. By knowing how CF push, 
stage and run its applications, we know that it already created a container, the next step 
will be downloading the droplet from the blobstore so it can be run in the container
it created. 

Since it is the cell node needs to get the droplet, we ran the `bosh ssh` to the cell
node to look for more detailed logs. By exploring the logs on the cell nodes, we found that 
there was a `bad tls` error message in the log entries. This tells us that the certificates 
are probably the issue.

safe has a command `safe x509 validate [path to the cert]` which we can use to inspect
and validate certificates. With a simple script, we looped through all of the 
certificates used in the misbehaving CF environment with the `safe validate` command.
The outputs showed us all of the certificates that were expired. 

We then ran `safe x509 renew` against all of the expired certificates. After double 
checking that all of the expired certificates were successfully renewed, we then
redeployed the CF in order to update the certificates.

The redeployment went well, for the most part, except for when it came to the
cell instances, it hung at the first one forever. We then tried `bosh redeploy`
using the `--skip-drain` flag, unfortunately, this did not solve our issue completely.

We ran `bosh ssh` to the cell that was hanging, and replaced all of the expired 
certificates in the config files manually, and then ran `monit restart all` on
the cell. This helped to nudge the `bosh redeploy`  into moving forward happily.
We got a happy running CF back.

## Deal with Certs Expiration

This guide is for the case that you use [Vault and Safe](http://runbooks.starkandwayne.com/vault_and_safe.html) 
to manage your credentials for your BOSH and CF deployments.

`safe x509 validate [OPTIONS] path/to/cert` will validate a certificate in the Vault,
checking CA signatories,expiration, name applicability, etc.

`safe x509 renew [OPTIONS] path/to/certificate` will renew the cert specified in the 
path. Option `-t` can be configured to define how long the cert will be valid for. 
It defaults to the last TTL used to issue or renew the certificate.

A script can be written to iterate all the certs that need to be validated and renewed
based the above safe commands.

To take a step further, you can also use [Doomsday](https://starkandwayne.com/blog/doomsday-an-x509-certificate-monitor/) to monitor your certs so you can take actions before your certs expire.


## Migrate Your CF From One vSphere Cluster to Another

If you need to migrate your CF from one vSphere cluster to another, you can follow
the following major steps in two different scenarios:

**VMotion Works when VMs are Alive**

1) Check backup for CF is set successfully if you have any

2) Turn off BOSH resurrection, otherwise BOSH will try to self-recover/recreate 
your VMs that are down when you try to migrate

3) Create a new cluster in the same vCenter

4) vMotion the CF VMs to the new cluster

5) Delete or rename the old cluster

6) Rename the new cluster to the old cluster's name

7) Enable Bosh resurrection

Everything should be working as normally after this process in the new cluster.

**Vmotion Does Not Work when VMs are Alive**

vMotion between the two clusters when VMs are running may not work due to 
the CPU compatibility and other issues between the two clusters. In this case, you
have to power off VMs before you do vMotion. The steps for migration are as follows:

1) Check backup for CF is set successfully if you have any

2) Turn off BOSH resurrection, otherwise BOSH will try to self-recover/recreate 
your VMs that are down when you try to migrate

3) Create a new cluster in the same vCenter

4) Run `bosh stop` on a subgroup of the VMs so there were still same type VMs running
to keep the platform working. `bosh stop` without `--hard` flag by default will
stop VM while keeping the persistent disk.

5) Power off those BOSH stopped VMs to do vMotion to the new cluster

6) After vMotion, bring the VMs in the new cluster up

7) Repeat the above process until you migrate all the VMs over to the new cluster

8) Delete or rename the old cluster

9) Rename the new cluster to the old cluster's name

10) Turn the BOSH resurrection back on

Everything should be working as normally after this process in the new cluster.

## Migrate vSphere Datastore for BOSH and CF

It is extremely important that you check the disks are successfully attached to
the new datastore you would like to use before you move forward with your deployments.
To migrate your BOSH and CF to a new datastore, you can follow the steps below.

1) Attach new datastore(s) to the hosts where the BOSH and CF VMs are running (Do not 
detach the old datastores)

2) Change deployment manifest for the BOSH Director to configure vSphere CPI to 
reference new datastore(s)

```
properties:
  vsphere:
    host: your_host
    user: root
    password: something_secret
    datacenters:
    - name: BOSH_DC
      vm_folder: sandbox-vms
      template_folder: sandbox-templates
      disk_path: sandbox-disks
      datastore_pattern: '\new-sandbox\z' # <---
      persistent_datastore_pattern: '\new-sandbox\z' # <---
      clusters: [SANDBOX]
```
3) Redeploy the BOSH Director

4) Verify that the BOSH Director VM's root, ephemeral and persistent disks are all 
now on the new datastore(s)

5) Run `bosh deploy --recreate` for CF deployments so that VMs are recreated and
persistent disks are reattached

6) Verify that the persistent disks and VMs were moved to new datastore(s) and
there are no remaining disks in the old datastore(s)

