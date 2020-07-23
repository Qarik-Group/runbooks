Cloud Foundry needs no introduction.  It's the star of the show!

This runbook deals solely with the `cf` CLI.  While there are some
great offerings out there for UI-based management of Cloud
Foundry, this runbook will not be dealing with non-terminal
methods.


## Install the `cf` CLI

If you are running on a Genesis-deployed jumpbox, you already have
the `cf` CLI.

If you want to manage Cloud Foundry from elsewhere, you have the
following options:

  1. Homebrew (Mac OSX only)
  2. Download a binary from [Github][gh-cf]

For those of you using Homebrew:

```
$ brew tap cloudfoundry/tap
$ brew install cf
```

[gh-cf]: https://github.com/cloudfoundry/cli/releases



## Log into Cloud Foundry

Before you can interact with Cloud Foundry from the command-line.

This is done via the `login` Genesis kit addon:
```
$ genesis do my-env login
Running login addon for my-env
Setting api endpoint to https://api.system.10.128.80.140.netip.cc...
OK

api endpoint:   https://api.system.10.128.80.140.netip.cc
api version:    2.138.0
API endpoint: https://api.system.10.128.80.140.netip.cc
Authenticating...
OK

Use 'cf target' to view or set your target org and space.
Saved current target as my-env


api endpoint:   https://api.system.10.128.80.140.netip.cc
api version:    2.138.0
user:           admin
No org or space targeted, use 'cf target -o ORG -s SPACE'
```


## Manage Multiple Cloud Foundries with One CLI

By itself, the `cf` command-line interface can only handle one
targeted Cloud Foundry API endpoint at a time.  If you need to
bounce between two or more CF instances, you will find yourself
regularly overwriting your API configuration, and needing to log
in every time you switch.

You can set your `CF_HOME` environment variable to isolate these
separate authentication contexts, but there's a better way!

The _Targets_ plugin adds a new `cf set-target` command that
manages this complexity for you.  

To install with Genesis:
```
$ genesis do my-env setup-cli
Running setup-cli addon for my-env
 ...
```

(You will have to do this on every jumpbox you use)

Then, when you want to target a new Cloud Foundry instance:

```
$ cf api ...
$ cf login
$ cf save-target dev
```

Later, if you need to access production (for the first time):

```
$ cf api ...
$ cf login
$ cf save-target prod
```

Then, if you want to go back to the development CF, all you need
is:

```
$ cf set-target dev
```

And `cf` will magically remember your authentication context
(OAuth2 / UAA tokens) for the _dev_ CF.



## Increase the `cf` CLI Timeout

By default, `cf` imposes a five (5) second timeout on all HTTP
calls to the Cloud Foundry API.  In some network environments,
this can be unbearably low, but there is no flag to change this
behavior.

There is, however, an environment variable, called
`CF_DIAL_TIMEOUT`:

```
$ export CF_DIAL_TIMEOUT=30
$ cf apps
```



## Trace `cf` Commands The Right Way

The `cf` utility has the ability to dump out the HTTP headers and
request / response bodies as it interacts with the remote API.
This behavior is controlled by the `CF_TRACE` environment
variable, but the variable is a bit tricky.

If you set it to the value `1` (the numeral "one"). `cf` will emit
the debugging information to standard output, so you can view it
on your screen, interspersed with regular command output.
Usually, this is what you want.

_Any other value_ will cause `cf` to open a file with that name
and write just the HTTP transport debugging output to it.  This
can be quite confusing if you try setting `CF_TRACE` to something
like "yes".  You'll end up with a file named `yes`.

If you don't want HTTP trace-level debugging on every `cf`
command you are going to run, you can set it on a per-command
basis like this:

```
$ CF_TRACE=1 cf services
$ cf apps
```

The `cf services` call will get debugging; the `cf apps` call will
not.



## What Features Are Enabled on my Cloud Foundry?

Cloud Foundry has a lot of optional features that can be turned on
or off by the operators (you).  To view what's been enabled, run:

```
$ cf feature-flags
Retrieving status of all flagged features as admin...
OK

Features                               State
user_org_creation                      disabled
private_domain_creation                enabled
app_bits_upload                        enabled
app_scaling                            enabled
route_creation                         enabled
service_instance_creation              enabled
diego_docker                           disabled
set_roles_by_username                  enabled
unset_roles_by_username                enabled
task_creation                          enabled
env_var_visibility                     enabled
space_scoped_private_broker_creation   enabled
space_developer_env_var_visibility     enabled
service_instance_sharing               enabled
```

To enable a feature, use `cf enable-feature-flag <NAME>`.

To disable a feature, `cf disable-feature-flag <NAME>`.

For more details on what each feature does, refer to the [Official
Cloud Foundry documentation][cf-feature-docs].

[cf-feature-docs]: https://docs.cloudfoundry.org/adminguide/listing-feature-flags.html#flags



## Install `cloudfoundry-utils`

Stark & Wayne has written (and continues to maintain) a collection
of Open Source tools called `cloudfoundry-utils` that come in
quite handy.  They are [available on Github][gh-utils].

If you are running on a Genesis-deployed jumpbox, these are
already installed.

[gh-utils]: https://github.com/cloudfoundry-community/cloudfoundry-utils



## Create a New Cloud Foundry Organization

Colloquially referred to as just "orgs", organizations provide a
level of access control for multi-tenancy inside of Cloud Foundry.
Each org has one or more _spaces_, into which services can be
created and applications can be deployed.

To see what orgs exist (as an administrative user):

```
$ cf orgs
Getting orgs as admin...

name
system
app-team1
other-app-team
```

To create a new org, all you need is a name:

```
$ cf create-org my-org
$ cf orgs
Getting orgs as admin...

name
system
app-team1
other-app-team
my-org
```

You will be granted full rights to the newly-created org.



## Create a New Cloud Foundry Space

Inside of an org, Cloud Foundry uses _spaces_ to separate
applications from one another.  How you decide to use spaces is
entirely up to you.  One space per org works.  One space per
application (multiple per org) is also fine.

To create a new space, you can either target the owning org:

```
$ cf target -o my-org
$ cf create-space my-space
```

or, you can specify the org in the options to `create-space`:

```
$ cf create-space -o my-org my-space
```

You will be granted full rights to the newly-created space.



## The `system` Org and Space

By default, we create a `system` org and a `system` space inside
of it.  This is a great place to deploy global, system-wide
applications and services.

For example, if you have documentation you want to make available
to all users, `system/system` is a good place to put it.

Similarly, if you are using the Tinsmith model of Blacksmith
shared services, you can deploy your Tinsmith CF apps to the
system space, and also provision your backing Blacksmith service
there.



## Assign Rights on Orgs and Spaces

In order for your users to be able to push applications, create
services, etc., you're going to need to assign them roles on the
orgs and spaces you have created.

The commands for setting org-level roles are:

```
$ cf   set-org-role user org-name role
$ cf unset-org-role user org-name role
```

The valid values for `role` are:

  1. **OrgManager** - can invite and manage users, select and
     change plans, and set spending limits
  2. **BillingManager** - can create and manage the billing
     account and payment information
  3. **OrgAuditor** - read-only access to org info and reports

The commands for setting space-level roles are:

```
$ cf   set-space-role user org-name space-name role
$ cf unset-space-role user org-name space-name role
```

The valid values for `role` are:

  1. **SpaceManager** - can invite and manage users, and enable
     features for this space
  2. **SpaceDeveloper** - can create and manage apps and services,
     and see logs and reports
  3. **SpaceAuditor** - can view logs, reports, and settings on
     this space



## Manage Disk and Memory Quotas

Cloud Foundry has org- and space-level quotas for things like
total amount of memory across all application instances,
per-instance memory limits, number of routes, etc.  These are all
enforced via _quotas_.

To show your active quotas:

```
$ cf quotas
name     total memory   instance memory   routes   service instances   paid plans   app instances   route ports
free     0              10G               1000     0                   disallowed   unlimited       0
paid     25G            10G               1000     unlimited           allowed      unlimited       0
runaway  500G           10G               1000     unlimited           allowed      unlimited       0
trial    2G             10G               1000     10                  disallowed   32              0
```

You can see what quota is in force for a given org or space by running:

```
$ cf org org-name
$ cf space space-name
```

(You have to be targeting the owning org for the second command to work)

Each org and space can only be under the influence of a single quota at any
given time.  You can change this assignment via the `set-quota` and
`set-space-quota` commands:

```
$ cf set-quota org-name quota-name
$ cf set-space-quota space-name quota-name
```

(Again, you have to be targeting the owning org for the second command to
work)

If you want to emulate _unlimited_ quotas, make a quota with arbitrarily
high limits.

For more information on quotas in Cloud Foundry, check out the [Official
Cloud Foundry documentation][cf-quotas].

[cf-quotas]: https://docs.cloudfoundry.org/adminguide/quota-plans.html



## Manage Cloud Foundry Buildpacks

Cloud Foundry uses _buildpacks_ to figure out how to deploy code that your
users push into it via `cf push`.  It uses heuristics and identifies what
stack a given application needs based on the presence of packaging files and
their contents.

To get a list of your available buildpacks, use the `cf buildpacks` command:

```
$ cf buildpacks
Getting buildpacks...

buildpack                    position   enabled   locked   filename
staticfile_buildpack         1          true      false    staticfile_buildpack-cached-v1.4.24.zip
java_buildpack               2          true      false    java-buildpack-offline-v4.9.zip
ruby_buildpack               3          true      false    ruby_buildpack-cached-v1.7.15.zip
nodejs_buildpack             4          true      false    nodejs_buildpack-cached-v1.6.20.zip
go_buildpack                 5          true      false    go_buildpack-cached-v1.8.20.zip
python_buildpack             6          true      false    python_buildpack-cached-v1.6.11.zip
php_buildpack                7          true      false    php_buildpack-cached-v4.3.51.zip
dotnet_core_buildpack        8          true      false    dotnet-core_buildpack-cached-v2.0.5.zip
dotnet_core_buildpack_beta   9          true      false    dotnet-core_buildpack-cached-v1.0.0.zip
hwc_buildpack                10         true      false    hwc_buildpack-cached-v2.3.14.zip
binary_buildpack             11         true      false    binary_buildpack-cached-v1.0.18.zip
```

Over time, you will need to upgrade or downgrade these buildpack archives,
as patches are applied upstream, and/or your users require newer (or older)
versions.

To upload a new version of a buildpack:

```
$ cf update-buildpack go_buildpack \
       ./download/go_buildpack-cached-v1.8.21.zip
```

You can also use the `update-buildpack` command to enable / disable
buildpacks, change their relative ordering, etc.



## Push an Application Using a Specific Buildpack

Most of the time, Cloud Foundry does the right thing when it comes to
buildpack detection during a `cf push`.  However, there are times when you
want to use a specific buildpack.  For example, some applications are
composed of multiple sub-components that may confuse the buildpack detection
logic.  You may also want to test a buildpack before doing a full upgrade.

In these cases, you can use the `-b` option to `cf push`, and specify the
buildpack (by name) explicitly:

```
$ cd ~/code/my-app
$ cf push -b go_buildpack
```

For doing updates, you can upload the buildpack to a nonstandard name, like
`ruby_buildpack-rc`, test a known-good Ruby application, and if successful,
update the actual Ruby buildpack.



## What is a Route vs. a Domain?

Often, people will talk about routes and domains as if they are
interchangeable.  They are not, but they are related.

A _domain_ is an artifact of DNS that identifies all or part of a hostname.
For example, `starkandwayne.com` is a domain on the Cloud Foundry that hosts
www.starkandwayne.com and blog.starkandwayne.com.

A _route_ is a specific mapping of hostname, domain, and (optional) request
path to a specific set of application instances.  Using the example above,
there are two applications that use the `starkandwayne.com` domain: `www`
(with a route for www.starkandwayne.com) and `blog`.

Routes are much more specific than domains.

A route will always send traffic, in round-robin fashion, to _all_ of the
application instances associated with it.  If you bind two different
apps (with different codebases) to a single route, weird stuff happens.

A domain can be shared by all orgs / spaces, or restricted to use by a
single org and/or space (private).



## How does Cloud Foundry Route Requests?

First, a client makes a request to the URL of the application.  Usually,
this causes the client to make a TCP connection to a load balancer which
will present the wildcard certificates for the Cloud Foundry instance.  This
is called "terminating TLS".

This load balancer will then make a second connection to one of its
backends, the _gorouters_.  These boxes contain all of the logic necessary
to dispatch routes to the application instances running inside of CF.

The gorouter examines the request to determine where it should go.  It looks
at two things: the HTTP `Host:` header, and the _request URI_.  Some
applications are routed strictly by the `Host:` header alone.  This is what
we typically think of when we talk about routing.  An application that has
bound the route for `www.example.com` will receive all requests with that
host header.

Cloud Foundry can also route traffic based on _request URI prefixing_.  For
example, if you have two applications, one for a web front-end, and another
for the web backend, you can bind them both to the same routed host, but
bind the API to the `/v1` path.  Any request to any path at or underneath
`/v1` will go to the backend app, instead of the front-end app.



## Register a Service Broker

Service Brokers allows CF users to provision services for use with their
applications.  Before a user can take advantage of this, however, an
operator (with admin privileges) must first register the service broker with
the cloud controller.

First, get a list of already-registered brokers:

```
$ cf service-brokers
Getting service brokers as jhunt@starkandwayne.com...

name           url
redis          https://10.200.144.5:3000
other-broker   https://10.200.218.218/broker
```

(This helps to ensure you haven't already registered the broker, and to
verify that the broker name you are about to use isn't already taken)

Next, register the broker:

```
$ cf create-service-broker broker-name username password https://...
```

Verify with another `cf service-brokers`.

Before you will see this broker's services in the CF Marketplace, you need to
enable access to each via `cf enable-service-access`.



## De-register a Service Broker

Before you decommission a service broker, it has to be de-registered from
the cloud controller.

First, get a list of the registered brokers:

```
$ cf service-brokers
Getting service brokers as jhunt@starkandwayne.com...

name           url
redis          https://10.200.144.5:3000
other-broker   https://10.200.218.218/broker
```

(This helps to ensure you haven't already de-registered the broker, and to
get the name of the broker to de-register it)

Then, de-register the broker from the cloud controller:

```
$ cf delete-service-broker other-broker
```

Cloud Foundry will not let you delete a service broker that still has active
provisioned services.  Those will first need to be unbound and deleted.  To
make finding those services easier, `cloudfoundry-utils` has a script called
`cf-services-for-broker`.  Give it the name of your service broker, and it
will query cloud controller all the orgs and spaces:

```
$ cf-services-for-broker other-broker
```

(Note the hyphen between `cf` and `services` -- this is not a `cf`
sub-command, just a standalone script with a semi-clever name)



## The `cf-env` Testing Application

It can be useful to have test applications at your disposal to verify that
your Cloud Foundry is functioning properly.  `cf-env` is the simplest such
test application.  When queried, it parrots back the request headers, and
all environment variables assigned to the app.

It lives on Github, at <https://github.com/cloudfoundry-community/cf-env>

To deploy it:

```
$ cd ~/apps
$ git clone https://github.com/cloudfoundry-community/cf-env
$ cd cf-env
$ cf push
```



## The `cf-egress-tester` Testing Application

Another useful test application is `cf-egress-tester`.  It provides a web
interface that allows you to initiate a TCP or UDP conversation to an
arbitrary host on the network (public Internet, or on-premise private
network).  We use this all the time to validate things like user-provided
services (can you get to that Oracle database from this CF?), container
networking, firewalls, and application security groups.

It lives on Github, at <https://github.com/pivotalservices/cf-egress-tester>

To deploy it:

```
$ cd ~/apps
$ git clone https://github.com/pivotalservices/cf-egress-tester
$ cd cf-egress-tester
$ cf push -n net
```

(I usually call it `net` because that's easier to type than
`cf-egress-tester`.  YMMV)

To use it, visit it in your browser and fill out the form.

From the command-line, you can use `curl`:

```
$ curl net.system.cf.example.com/egress-status/tcp/8.8.8.8/53
```

or, for UDP:

```
$ curl net.system.cf.example.com/egress-status/udp/8.8.8.8/53
```



## Provision a Service and Bind it to an Application

To provision a service, take a look at the marketplace to find the service
and plan you want to provision.  With the service and plan names in hand,
create the service:

```
$ cf create-service service-name plan-name my-service-instance
```

You can view the details of the service with a `cf service` command:

```
$ cf service my-service-instance
```

For asynchronous services (like all of the Blacksmith services), you will
need to wait until the status of the service changes from `creating` or `in
progress` to `created`.

Next, bind the service to your application:

```
$ cf bind-service my-service-instance my-app
```

To verify, check the applications environment:

```
$ cf env my-app
```

You should see new entries in the `VCAP_SERVICES` environment variable,
which correspond to the credentials of the newly-bound service.



## Determine What's Using a Service Broker

Cloud Foundry does not make it easy to figure out where the services
provisioned by a given broker exist.  To make finding those services easier,
`cloudfoundry-utils` has a script called `cf-services-for-broker`.  Give it
the name of your service broker, and it will query cloud controller all the
orgs and spaces:

```
$ cf-services-for-broker other-broker
```

(Note the hyphen between `cf` and `services` -- this is not a `cf`
sub-command, just a standalone script with a semi-clever name)



## Add a New Domain to Cloud Foundry

Before your users can use a new shared domain, an operator has to add it to
the system.

First, see what domains exist:

```
$ cf domains
Getting domains in org system as admin...

name                    status   type
apps.cf.example.com     shared
run.cf.example.com      shared
system.cf.example.com   owned
```

To add the new domain:

```
$ cf create-shared-domain stuff.cf.example.com
```

Note: you _must_ ensure that whatever is terminating TLS for your Cloud
Foundry instance, whether that is a load balancer or the gorouters
themselves, has the correct certificates, which cover the new domain in its
subject alternate names section.

The new shared domain will show up, and be bound, by all orgs and spaces,
immediately.

If you want to create an org-level domain, use the `cf create-domain`
command instead (note the lack of the `shared` keyword in the middle):

```
$ cf create-domain org-name org-specific.com
```

The same caveat applies here too: you must ensure that TLS is properly
configured for the new domain.



## Set System-wide Environment Variables

Cloud Foundry allows application owners to set environment variables on
their applications, via the `cf set-env` command.  Often, however, operators
need to be able to supply environment-wide configuration via environment
variables.  The most prominent example of this is when you run CF behind an
Internet HTTP proxy, and need the `http_proxy`, `https_proxy`, and
`no_proxy` environment variables.

Cloud Foundry allows this, by way of _environment variable groups_.  It
maintains two sets, the _running environment variable group_ and the
_staging environment variable group_.  These perform the same function, but
for different parts of the application lifecycle.  The former is used while
an application is executing, while the latter is only used while the
application is being staged (compiled) by the buildpack.

In practice, you usually want to set both of the, and make them identical.
Here's how we set `http_proxy` globally:

```
$ cf set-staging-environment-variable-group \
     '{"http_proxy":"http://proxy1.int:3128"}'

$ cf set-running-environment-variable-group \
     '{"http_proxy":"http://proxy1.int:3128"}'
```

To verify:

```
$ cf staging-environment-variable-group
Retrieving the contents of the staging environment variable group as admin...
OK

Variable Name   Assigned Value
http_proxy      http://proxy1.int:3128

$ cf running-environment-variable-group
Retrieving the contents of the running environment variable group as admin...
OK

Variable Name   Assigned Value
http_proxy      http://proxy1.int:3128
```



## Create / Modify an Application Security Group

Outbound network traffic from a Cloud Foundry application instance group is
governed by a set of _application security groups_.  By default, Genesis
deploys Cloud Foundry with a few default groups:

```
$ cf security-groups
Getting security groups as admin...
OK

     name              organization   space   lifecycle
#0   dns               <all>          <all>   running
     dns               <all>          <all>   staging
#1   load_balancer     <all>          <all>   running
     load_balancer     <all>          <all>   staging
#2   public_networks   <all>          <all>   running
     public_networks   <all>          <all>   staging
#3   services          <all>          <all>   running
     services          <all>          <all>   staging
```

You can view each of these by running the `cf security-group` command:

```
$ cf security-group dns
Getting info for security group dns as admin
OK

Name    dns
Rules
	[
		{
			"destination": "0.0.0.0/0",
			"ports": "53",
			"protocol": "tcp"
		},
		{
			"destination": "0.0.0.0/0",
			"ports": "53",
			"protocol": "udp"
		}
	]

No spaces assigned
```

To create a new security group, create a JSON file that contains all of the
rules for the new group, and then run the `create-security-group` command:

```
$ cf create-security-group group-name path/to/rules.json
```

If you want to update a group, modify its JSON rules definition, and call
`update-security-group` instead of `create-security-group`.

If you create a new security group, keep in mind that it will not be active
until you bind it with `bind-security-group`.

The `cf-egress-tester` test application can be quiet helpful in crafting and
validating security groups.



## Back up Cloud Foundry

Cloud Foundry has some pretty critical data in it, and you'll want to back
that data up using something like SHIELD.  There are three main components
that need to be preserved:

  1. The Cloud Controller Database
  2. The UAA Database
  3. The Diego Database
  4. The CF Networking Database
  5. The Locket Database
  6. The Routing Database
  7. The Autoscaler Database if you have autoscaler enabled with CF deployment
  8. The Blobstore

The first seven are required and the eighth is highly recommended.

The size of the blobstore can be quite large based on your environment load. It is 
recommended to use rapid backup and restore tool when the blobstore is huge. If shield
is used, skipping compression and disabling logging will speed up the backup process.

If you could not backup blobstore due to size and speed, your users will have to re-push 
all of their applications in the event of data-loss.


## Scale Components of Cloud Foundry

As Cloud Foundry proves itself to be indispensable to your
user base, its popularity will grow.  This will lead you to scale
various components of CF to cope.

The following components can be scaled horizontally, by adding
more nodes of the same size:

`router` - More gorouters, behind a load balancer, can help spread
the ingress routing traffic across more cores.

`diego-cell` - More cells means more application instances.

`doppler` / `log-api` - More application instances means more log
traffic, so you may need more doppler / loggregator nodes.

`cc-worker` - If the API is unable to keep up with user demand,
you can create more worker nodes to perform tasks.



## View the Log Stream for an Application

To hook up to the live log stream for all instances of an
application, use the `cf logs` command:

```
$ cf logs app-name
```

This will contact the loggregator via the gorouters, upgrade to a
(Secure) WebSockets connection, and then stream log entries in
real time to your terminal.

If you want the recent logs, from the immediate past, pass the
`--recent` flag to `cf logs`:

```
$ cf logs --recent app-name
```



## SSH Into Application Instance Containers

If you've enabled the ability for Cloud Foundry users to SSH into
their application instances, `cf ssh` can be a wonderful tool for
diagnostic and troubleshooting activities.

To check:

```
$ cf ssh-enabled my-app
ssh support is enabled for 'my-app'
```

If not, you can enable it:

```
$ cf enable-ssh my-app
```

Then, you can SSH in and get a remote shell, inside one of the
application instances:

```
$ cf ssh my-app
```

Or, if you want a specific instance:

```
$ cf ssh my-app -i 3
```



## Why Do Busy Cloud Foundries Take So Long to Deploy?

Because of a thing called `drain`.

When BOSH attempts to update a Diego cell, it runs a thing called
a _drain script_ that attempts to evacuate the running application
instances off of the cell and onto another cell.  This has to
happen before BOSH can rebuild the cell VM, update software, etc.

On busy Cloud Foundries, the Diego cluster may be operating at or
near capacity, making it difficult for the drain script to find a
suitable place to relocate the instance containers to.
Eventually, the drain script will give up and just terminate the
application instances, but this takes time.



## Restage vs. Restart: How, When, and Why

Cloud Foundry has two commands for re-initializing the execution
of an application: `cf restage` and `cf restart`.

_Restarting_ an application terminates its application instances and
then re-creates them.  This tends to clear out runtime errors like
out-of-memory conditions, or infinite loops.

_Restaging_ an application pulls the original code droplet that was
uploaded via `cf push`, re-compiles it against the current set of
buildpacks, and _then_ restarts the application instances.  This
is a much more involved operation, but it is required in a handful
of cases.

If you change the staging environment variable groups, you really
ought to restage the application, since the compilation may behave
differently given the new environmental configuration.

Likewise, if you modify the staging security groups in force for
an application, you should restage it so that the compilation
operates in the same networking conditions as a future `cf push`.



## Integrate UAA With Your LDAP Backend

UAA, which handles authentication and authorization in Cloud
Foundry, supports authentication integration with external LDAP
identity providers.  This support currently comes in three
different modes of operation:

  - Search and Bind
  - Simple Bind
  - Search and Compare

In _Search and Bind_ mode, the UAA connects to LDAP anonymously,
searches the tree for the authenticating user, and then attempts
to bind as that distinguished name (DN) with the given
credentials.

In _Simple Bind_ mode, the UAA binds to the LDAP store by
programatically constructing a distringuished name and binding as
that with the given credentials.

In _Search and Compare_ mode, the UAA finds the user in the
directory, retrieves their encoded (and encrypted) password, and
compares it offline against the given credentials.

Which mode you want to operate in depends entirely on your LDAP
directory server configuration.

For more details, refer to the [UAA LDAP Integration
guide][gh-ldap].

Note: the scheme of LDAP configuration in UAA may differ from
release to release.  Always refer to the latest [uaa job
spec][uaa-spec] for details.

If you are using Genesis to deploy Cloud Foundry, you will have to
manually override these configuration properties.  Here are some
examples to start from.

For _Simple Bind_:
```
instance_groups:
- name: uaa
  jobs:
  - name: uaa
  properties:
    uaa:
      ldap:
        enabled:      true
        profile_type: simple-bind
        url:          your_ldap_url

        userDNPattern:          # DN patterns to construct a DN directly
                                # from the user ID without a search
        userDNPatternDelimiter: # What delimits the userDNPattern property
        mailAttributeName:      mail
        sslCertificate:         # You should put this in the Vault
```

For _Search and Bind_:

```
instance_groups:
- name: uaa
  jobs:
  - name: uaa
  properties:
    uaa:
      ldap:
        enabled:      true
        profile_type: search-and-bind
        url:           your_ldap_url

        mailAttributeName: mail
        userDN:            # DN to bind for the "search" phase
        userPassword:      # the password for the search user
        searchBase:        dc=example,dc=com
        searchFilter:      cn={0}
        sslCertificate:    # You should put this in the Vault
```

For _Search and Compare_:

```
instance_groups:
- name: uaa
  jobs:
  - name: uaa
  properties:
    uaa:
      ldap:
        enabled:      true
        profile_type: search-and-compare
        url:          your_ldap_url

        mailAttributeName:    mail
        userDN:               # can store it in vault and fecth from vault
        userPassword:         # can store it in vault and fecth from vault
        searchBase:           dc=example,dc=com
        searchFilter:         cn={0}
        localPasswordCompare: true
        sslCertificate:       # You should put this in the Vault

```


[gh-ldap]:  https://github.com/cloudfoundry/uaa/blob/master/docs/UAA-LDAP.md
[uaa-spec]: https://github.com/cloudfoundry/uaa-release/blob/develop/jobs/uaa/spec



## Integrate UAA With A SAML Identity Provider

UAA also supports integration via SAML, the _Security Access
Markup Language_, both as an an SP (_Service Provider_), and as an
IdP (_Identity Provider_).

To configure UAA as an _SP_, integrated with a 3rd-party _IdP_,
you first need to give your IdP team a copy of the SAML Service
Provider Metadata, which can be found here:


```
https://login.YOUR-CF-SYSTEM-DOMAIN/saml/metadata
```

Configuration of your IdP systems is beyond the scope of this
runbook, but your IdP team should give you back an IdP metadata
file, which should contain a bunch of XML.

Note: the scheme of SAML configuration in UAA may differ from
release to release.  Always refer to the latest [uaa job
spec][uaa-spec] for details.

If you are using Genesis to deploy Cloud Foundry, you will have to
manually override these configuration properties.  Here is an
example to start from:

```
instance_groups:
- name: uaa
  jobs:
  - name: uaa
    properties:
      login:
        saml:
          # Provider Information Configs
          providers:
            # Example
            myProvider:
              nameID:             urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress
              showSamlLoginLink:  true
              linkText:           Log in with XX IDP
              metadataTrustCheck: false
              idpMetadata: |
                ... your idp metadata XML contents ...

          activeKeyId: key1
          keys:
            key1:
              key:         (( vault secret/your-cf-env-vault-path/uaa/certs/server:key ))
              certificate: (( vault secret/your-cf-env-vault-path/uaa/certs/server:certificate ))
              passphrase: ""
```

## Bind Autoscaler to Genesis deployed CF

If the `autoscaler` feature was enabled in the kit at deployment, then you can
bind easily with:

```
$ genesis do my-env bind-autoscaler
```
