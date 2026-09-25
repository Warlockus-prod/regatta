# Confined VPS deployment

Regatta shares VPS2 with other products. Its CI key must not grant a root shell
or direct access to the host Docker daemon. This directory is the reviewed
installation source; CI does **not** automatically install changes to this policy.

## Trust boundary

- `regatta-deploy` is a dedicated system account, outside the Docker group.
  Its home, authorized keys, SSH gateway and sudo entry are root-owned.
- The existing `regatta-gha-deploy` public key is retained, with `restrict` and
  a forced command. Its old root authorization is removed. Administrative SSH
  uses the separate existing administrator key.
- SSH permits only the exact command `deploy`, no shell, TTY, forwarding,
  user rc files, SCP or SFTP. Sudo permits one root-owned executable without args.
- The Python executable runs in isolated mode and accepts a bounded JSON request:
  full commit SHA, two `sha256:` image digests, and an ephemeral registry token.
  No paths, shell text, registry hostname or Compose options are accepted.
- CI tests an exact commit and publishes its images to the repository's GHCR
  packages. The VPS pulls only `ghcr.io/warlockus-prod/regatta` and `regatta-ws`,
  by digest. The per-job GitHub token is sent over SSH stdin and erased with the
  temporary root-only Docker authentication directory after use.
  Credentials are treated as opaque printable ASCII, with a size bound and no
  control characters; their encoding is not assumed to be a GitHub token prefix.
- `/etc/regatta-deploy/compose.yml` and `runtime.env` are root-only. No repository
  Dockerfile, Compose file or script runs as root on the server. Runtime policy
  fixes ports, the existing Regatta network and data volume, numeric non-root UID,
  read-only filesystems, dropped capabilities and resource limits.

Someone authorized to deploy application code can still change Regatta's behavior
and access Regatta's own runtime credentials/data. This design removes their
general host administration capability. Containers share the host kernel; this is
not VM isolation. Branch reviews and environment approvals are separate controls.

## Installed paths

| Source | Root-owned installation |
| --- | --- |
| `regatta-ssh` | `/usr/local/libexec/regatta-ssh`, mode 0755 |
| `regatta-deploy.py` | `/usr/local/sbin/regatta-deploy`, mode 0755 |
| `compose.yml` | `/etc/regatta-deploy/compose.yml`, mode 0600 |
| Existing application environment | `/etc/regatta-deploy/runtime.env`, mode 0600 |
| Deployment state | `/var/lib/regatta-deploy-state`, mode 0700 |

The SSH account has `AuthorizedKeysFile /etc/ssh/authorized_keys/regatta-deploy`,
`ForceCommand /usr/local/libexec/regatta-ssh`, `DisableForwarding yes`,
`PermitTTY no`, and `PermitUserRC no` in its own `Match User` block. The key has
the same command restriction independently of that block. Sudoers allows exactly:

```text
regatta-deploy ALL=(root) NOPASSWD: /usr/local/sbin/regatta-deploy ""
```

`VPS_USER` in GitHub is `regatta-deploy`. `DEPLOY_SSH_KEY` remains unchanged.
`VPS_PATH` is no longer used. Application source is built on the GitHub runner;
the old `/opt/repos/regatta` checkout is not the running release authority.

## Verification and rollback

Run `python3 -m unittest discover -s ops/deploy -p 'test_*.py'`. Tests cover request
validation, command rejection, fixed Compose arguments, secret-safe errors and
health-failure rollback. Each CI deploy checks that `id` is rejected and root SSH
with the deployment key fails before deploying. Existing application checks and
production E2E remain enabled.

The server serializes deploys, waits for both services to be healthy and restores
the preceding images on failure. Current/previous image references are recorded
only in root-owned state. Do not prune rollback images blindly. An administrator
can restore `previous.json` image references using the same fixed Compose policy;
the deployment account has no general rollback shell.

The initial migration backup is `/opt/backups/regatta/deploy-isolation-20260925`.
It contains the previous key authorization, runtime configuration and container
identities. Restoring the old root authorization would reintroduce the vulnerability;
prefer repairing the confined path. The existing Regatta data volume is reused,
and unrelated wine-service containers are checked for unchanged identities.
