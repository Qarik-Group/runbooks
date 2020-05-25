Genesis is a BOSH Deployment paradigm as well as a tool that
supports that paradigm.  Genesis makes it easy to deploy your
infrastructure.  This is done by providing curated "kits" for
common deployments that work out-of-the-box to get you started
with just a few inputs from the operator, but with enough
flexibility to support any configuration changes needed that are
future without making you jump through hoops.



## Find Available Genesis Kits

The available kits can be found in Github under the
[genesis-community][gcom] organization.  Each has a repository that ends
in `-genesis-kit` which contains the the source code and releases.
While you don't have to go there to download kits for use in
Genesis, you can use this to determine what kits are available,
how to use each kit, how to what versions each kit has, and the
release notes for each version to determine how the kit has
changed.  You may also want to peruse the source code to better
understand how the kit works.

[gcom]: https://github.com/genesis-community?q=-genesis-kit



## Create a New Type of Deployment

Once you have selected the type of kit you want to use, you can
initialize a deployment repository based on that kit.  To do so,
run the following command:

```
$ genesis init -k <kit-name>
```

In this case, you specify the kit name **without** the
`-genesis-kit` suffix.  This will create a directory named based
on the kit name you specified with a `-deployments` suffix on the
end.  For example, if you wanted to create a new BOSH deployment
repository, you would run `genesis init -k bosh` and it would
create a `bosh-deployments` directory.

This new directory will have a `.genesis` configuration directory,
containing the metadata that Genesis needs to do its work, but it
won't contain any deployments yet.  See the next section for how
to create deployments.

This newly created directory will also contain an initialized .git
directory, making it a fully functional git repository.  Genesis
deployment repositories are designed to use Github, but any
similarly featured git manager that can be reached by your
Concourse workers can be used.  This includes on-premise products
like Github Enterprise.



## Create a New Deployment Environment

Your deployment environments are stored in the root directory of
your deployment repository, and are in YAML format, similar to
standard BOSH manifests.  In fact, they **are** fragments of BOSH
manifests, so anything you could put in a BOSH manifest, you can
put in environment files, but more about that later.

To create a new environment, make sure you're in the root
directory of your deployment repository and run the following
command (using an environment named myorg-site-demo for example):

```
$ genesis new myorg-site-demo
```

Depending on the kit used in this deployment repository, you will
be asked a series of questions.  These questions should be
self-evident or sufficiently explained in the text preceding each
question.  For further clarification, consult the README.md file
in the kit's repository as discussed in the [How To Find Available
Genesis Kits](#find-available-genesis-kits) section above.  If
you're still unsure of how to answer the question, open an issue
with the kit to ask for clarification.

Kits may have features that are optional.  You will be asked if
you want to include the feature during this setup session.  If the
feature you wish to enable has further parameters, you will be
asked those too.

If everything works correctly, a new environment deployment file
named `myorg-site-demo.yml` will be created.  It will also create
a file named `myorg.yml` if this doesn't already exist.  This is
because Genesis uses a hierarchical file structure for environments
to reduce duplication and facilitate propagation of changes
through pipeline deployments.



## Share Configuration Between Environments

Genesis environment files are meant to make your deployments
easier, and this included deployment infrastructure and lifecycle
management.  To this end, Genesis uses hierarchical naming to group
and distribute environment information.

Environment files use dashes (`-`) to build up a chain of
configuration files that will be merged together to define the
actual environment.  This means that in the case of a file named
`a-b-c-d.yml`, configuration contained in `a.yml`, `a-b.yml`, and
`a-b-c.yml` will all be merged underneath `a-b-c-d.yml` to fully
define the environment `a-b-c-d`.  In practice, this hierarchy is
broken down into a top "org" level, a infrastructure level, and
the purpose (i.e. staging or prod).  The longest-named environment
file will contain a `params.env` property, which indicates that
this file represents an actual environment that can be deployed.

Note:
  - Not all hierarchical files need to be present; Genesis will only
    use what is there.  In the example above, it would be perfectly
    acceptable to have `a.yml` and `a-b-c-d.yml`.

  - You can build another deployment environment file of another
    one.  This can be done to create "personal dev" environments that
    are based on a common deployment (i.e. preprod).

Anything that applies to most deployments of a given deployment
type can, and should, be pushed to the top level file. If one or
two deployments do not use a given property, they can over-ride it
in their specific file where it will be more obvious that they
deviate.

Not all deployments are to the same infrastructure. You may have a
BOSH-lite warden QA sandbox environment, vSphere-based development and
preproduction environments, and a bare-metal production environment.  In
these situations, you would put infrastructure in the intermediary
files (i.e. `myorg-vspherelab.yml`). In this way, you keep the
infrastructure properties shared between those that use a common
infrastructure, but without breaking those that don't.

Where this sharing configuration shines is during pipeline
propagation of deployments.  By putting the changes at the top
levels, you can test **the actual** changes in sandbox or
pre prod environments before pushing them to production, and not
getting downtime due to incorrect or partially omitted changes.
Similar for infrastructure changes that are shared between test
and production environments.  This leaves only things that are
unique to the environment, such as scaling or IP addresses in the
bottom-most environment.



## Deploy an Environment

Once a deployment environment has been created, you use Genesis to
deploy it.  Genesis `deploy` command is a wrapper around BOSH
`deploy` and support most of its options, such as `--dry-run` ,
`--recreate` and`--fix`.  To deploy, run `genesis deploy my-env`
where `my-env` is the name of your environment file (with or
without the `.yml` extension).

The first thing Genesis will do is compile the environment file,
any hierarchical files found, and the kit contents into a manifest.
It will also at this time pull any secrets out of Vault to be
embedded in this manifest.  If you are missing any secrets, these
will be reported and the deployment will fail.

Once the manifest is compiled, it's BOSH's turn to deploy the
manifest to the target BOSH director.  By default, it will use the
BOSH director that is named the same as your environment.  If your
BOSH director is named differently, you can set `params.bosh` to
the alias of the desired BOSH director, or preferably, add an
alias for the BOSH directory with the same name as the
environment. (You can have multiple aliases for a single BOSH
director).

Ideally, your environment should just deploy.  Kits are designed
to work out of the box for the majority of situations, but you may
encounter one that doesn't.  The first step in debugging a
deployment that doesn't work is obviously the error messages that
a failed deployment spits out. One of the most common issues that
is outside the control of Genesis is a mismatch between what the
kit needs for resources and what resources are provided in the
`cloud-config` on the BOSH director.  Consult the Kit usage guide
for what resources it uses by name, and how to overwrite them if
necessary.

Once deployed, Genesis will store a redacted version of the
manifest under `.genesis.manifests.<my-env-name>.yml`.  You will
want to commit this to your repository after each deployment so you have
a local copy of the currently deployed manifest for future
reference.  When deployments are done by the Genesis-created
Concourse pipelines, this will be automatically done.



## Inspect an Environment Manifest

In a similar manner to deploying an environment, you can generate
a manifest for an environment without deploying it.  Use the
`genesis manifest my-env` command to do so, where `my-env` is the
name of your environment.

By default, this will not be redacted (it will contain _all_ the
secrets).  If you'd prefer to have a redacted manifest for
sharing, or if you don't have access to your vault, you can
generate a redacted manifest with the `--redact` option.

This manifest is compiled by machine, using the `spruce` utility.
All maps are sorted alphabetically, which means you need to pay
careful attention to the structure when searching for arrays of
maps, as often the `name: <id>` key is not aligned with the
`-` indicating the start of the array element.



## Check Kit Version In Use

The kit being used by an environment will most likely be found in
the top hierarchical file for that environment.  This is done to
allow upgrading environment through pipelines.  The version will be
specified under the `kit.version` property.



## Upgrade To a New Version of a Kit

To upgrade a kit to a newer version, you will need to download the
new version and set the environments to use it.  The `genesis
fetch-kit <kit>[/<version>]` command is used to get the kit.  If
you want to use the  latest version, you can omit the
`/<version>` part.

```
$ genesis fetch-kit vault/1.5.0
Attempting to retrieve Genesis kit vault (v1.5.0)...
Downloaded version 1.5.0 of the vault kit

$ genesis fetch-kit vault
Attempting to retrieve Genesis kit vault (latest version)...
Downloaded version 1.5.1 of the vault kit

$ genesis list-kits

Kit: vault
  v1.4.0
  v1.5.0
  v1.5.1
```

Once you have the version of the kit you want to use,  you need to
update the kit version.  This will be found under the
`kit.version` property, most likely in the top hierarchical
environment file, but could also be located in the deployment
environment file.

New kits may introduce new properties or secrets.  Consult the
release notes, edit the environment files manually and [add
missing secrets](#adding-missing-secrets).  You should not have to
regenerate the environment file using the `genesis new ...` command,
but you can if you want to.

Ideally, you will commit these changes to your repository and the
pipeline will roll out the changes, testing in sandbox before
progressing through to production.  You can however, simply run
`genesis deploy ...` to deploy these changes.



## Edit an Environment

Kits are designed to pull in parameters it needs from these
environment files, but these files can encompass any manifest
propertied explicitly.  This is sometimes needed to support
esoteric features of the BOSH release that are not supported by the
kit.

Feel free to edit the environment files as you would a manifest.
There is nothing magical about them, but keep in mind the
following:

These are YAML files, so they use spaces, not tabs, and follow the
formatting rules of YAML.

It is best to be familiar with the kit and the manifests it
generates if you are going to overwrite base functionality of the
kit.  You may accidentally end up changing something that uses a
value under `params` which will render that parameter
non-operative and confuse future debugging.

With the exception of `genesis new --force`, Genesis will not
overwrite an existing environment file, so feel free to add
comments and alter the content without worry that it will be lost.

Files are merged with `spruce` which supports [powerful
operators][spruce-ops] to help keep your files modular and
"[DRY][dry]".  Put any configurable items under `params` keys, and
use the `(( grab ...))` or `(( concat ...))` operators to use
them.  Put common structures in the top level, and different
parameters used by that structure in the deployment environment
files if they aren't meant to propagate through the pipeline.

[spruce-ops]: https://github.com/geofffranks/spruce/blob/master/README.md
[dry]: https://en.wikipedia.org/wiki/Don't_repeat_yourself



## Check for Missing Secrets

Sometimes you will get messages stating you are missing secrets in
the Vault:

```
  [Checking generated certificates]
  ✘  secret/snw/tliebel/lab/shield/certs/ca [CA certificate]
     ✘  :certificate
     ✘  :combined
     ✘  :crl
     ✘  :key
     ✘  :serial
```

This is because genesis verifies that all secrets are present prior to 
attempting to compile the manifest.  If you would like to run this check 
manually, you can run `genesis check-secrets <my-env>`.  

```
$ genesis check-secrets snw-tliebel-lab
Retrieving secrets for snw/tliebel/lab/shield...ok

[Checking generated credentials]
  ✔  secret/snw/tliebel/lab/shield/agent [ssh]

[Checking generated certificates]
  ✘  secret/snw/tliebel/lab/shield/certs/ca [CA certificate]
     ✘  :certificate
     ✘  :combined
     ✘  :crl
     ✘  :key
     ✘  :serial
  ✔  secret/snw/tliebel/lab/shield/certs/server [certificate]
  ✔  secret/snw/tliebel/lab/shield/vault/ca [CA certificate]
  ✔  secret/snw/tliebel/lab/shield/vault/server [certificate]
```


## Add Missing Secrets

If you do have missing secrets, possibly due to a kit upgrade, you
can run `genesis add-secrets my-env` to add any missing secrets to
the `my-env` deployment environment.



## Rotate Secrets

You can change all the secrets that were generated when you
created a new environment, either as a response to accidentally
leaked secrets, or as part of a scheduled cycling of secrets.
This is done with the `genesis rotate-secrets my-env` command.
This will recreate all secrets generated for the kit used by the
`my-env` deployment environment, with the exception of any secret
that the kit marked as `fixed` and any self-signed CA
certificates.  If you want these rotated as well, specify the
`--force` option.



## Change Where Genesis Stores Secrets

If you would like to check or set the secets provider, you can run 
`genesis secrets-provider`/`genesis secrets-provider name`.

In the secret provider Vault, all Genesis environments store their secrets
under a predictable path.  Under the base `secret/` , the environment is 
split on dashes (`-`) and joined by slashes (`/`), then the deployment type
is added to the end.  For example, for a environment named `myorg-site-prod.yml`
deployment using the `cf-rabbitmq-genesis-kit`, the path would be
`secret/myorg/site/prod/cf-rabbitmq`. Notice that any dashes in
the deployment type are **not** converted to slashes.

This information is useful if you ever need to get secrets from a
different deployment.  You can reference another environment's
secrets in the Vault by specifying a relative path to the `vault`
operator:

```
  secret: (( vault meta.vault "/../staging/thing/path/to/secret:key" ))
```



## Rename an Environment

To rename an deployment that hasn't been deployed is easy: rename
the file.  However, there are two caveats:

  1. Ensure that anything you pushed up to the hierarchical chain is
     moved over to an equivalent file for the new name.  For example,
    if you are renaming `my-original-thing.yml` to
    `our-new-thing.yml`, anything in `my.yml` that's applicable should
    be moved to `our.yml`, and similarly anything in `my-original.yml`
    to `our-new.yml`.

  2. You have to move the secrets stored under the old
     environment's path to a one for the new environment.  To continue
     the above example,  to move the secrets for a BOSH deployment
     named `my-original-thing` to `our-new-thing`.

You can move secrets via `safe move`:

```
safe move -r secret/my/original/thing/bosh \
             secret/our/new/thing/bosh
```

If you've already deployed an environment, it is **HIGHLY**
recommended to not rename the deployment in the BOSH director.
The best method is to backup any data on the existing deployment,
[delete it](#delete-a-deployed-environment), rename the
environment file as described above, and deploy it and restore the
data from the backup.  Shield makes it easy to backup and restore
most deployment data.



## Delete a Deployed Environment

Genesis does not have a command to delete an existing environment.
Instead, it defers to the BOSH CLI to do this, with the simple
command of `bosh delete-deployment`.



## Scale an Environment

Increasing or decreasing the number of VMS in an environment is
one of the most common operations you may encounter.  Each kit may
have a parameter to increase different VM types for the
deployment, but you may want to change the VM count for a type
that is not provided for by the kit.

If the kit supports it, changing VM counts is as simple as
changing the `params.<param>` in the deployment environment file.
For example, the Concourse kit supports setting the counts of the
web and worker instances.  Simply change (or add) these parameters
in the yml file:

```
--- # my-concourse.yml
params:
  num_web_nodes:   3
  workers:        10
```

If there is no first-class support by a kit to change VM counts
for the VM type you want to adjust, you can provide this yourself.
For example, if the Concourse kit didn't support changing worker
counts, you could add this to the `my.yml` file:

```
--- my.yml
instance_groups:
  - name: worker
    instances: 3
```

By placing it in the top hierarchical file, you effectively add
support for changing worker counts for all deployment
environments, as well as specifying a default value for any
deployment environment that doesn't provide an override.

In the these examples, we changed the instance counts, but the
same principle can be used to scale up other aspects of
deployments, such as CPU, memory, or disk sizes — just keep in
mind this may need to be done indirectly by specifying instance or
disk types and adding the desired resources in your cloud-config.

## Stemcell Version Upgrades

Genesis provides a simple way for you to update stemcells for deployments based off of Genesis Kits.  The typical process is to upload a new stemcell to the BOSH Director and perform a `genesis deploy` on each deployment.

In each kit there is a default for the os flavor and version:

```
params:
  stemcell_os:      ubuntu-trusty
  stemcell_version: 3468.latest
```

To upgrade the stemcell version for a deployment start by uploading a new stemcell to the BOSH Director.  Full instuctions for doing this are located in the [BOSH Runbook under Uploading a Stemcell](/bosh.html#upload-a-stemcell).  It should be noted that most kits ship pre-compiled BOSH releases and do not allow the major version of OS of the stemcell to be changed.  If you are currently using `3468.22` you should upload a newer version in the `3468` series, such as `3468.23`.


Once the newer stemcell is uploaded you have two choices, each should be followed by a `genesis deploy`:

 - Do nothing and rely on the `latest` value for `params.stemcell_version` as defined by the kit
 - Hardcode the stemcell os and/or version


Overriding the default stemcell version in the Genesis kit is not normally recommended. If you want more explicit controls over the version of the stemcell you are using you can add the following parameters to your environment yml:

```
params:
  stemcell_os: ubuntu-trusty
  stemcell_version: see_options_below
```

`stemcell_version` options:

  * `<major>.latest` - Grabs the highest minor stemcell for the listed major version, (ie `3468.latest`)
  * `latest` - Grabs the highest major.minor stemcell for the stemcell_os.  This is not recommended since kits use pre-compiled releases and this option would allow you to try and use a different major release of stemcell.
  * `3468.2` - Hard codes a this specific major.minor stemcell version


Once the new stemcell is uploaded to the BOSH Director and any overrides to the version are provided to the environment yaml file perform a `genesis deploy` on the kit deployment. 


