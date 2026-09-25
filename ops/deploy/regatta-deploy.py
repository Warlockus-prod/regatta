#!/usr/bin/python3 -I
"""Root-owned deployment boundary. No repository code/config runs on the host.

One bounded JSON document arrives on stdin; only image digests and an ephemeral
registry token are accepted. All processes use argument arrays and a clean env.
"""
import fcntl
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import tempfile

CONFIG = Path("/etc/regatta-deploy")
STATE = Path("/var/lib/regatta-deploy-state")
REGISTRY = "ghcr.io/warlockus-prod/"
ENV = {"PATH": "/usr/sbin:/usr/bin:/sbin:/bin", "HOME": "/root", "LANG": "C.UTF-8"}


def validate(raw):
    if not isinstance(raw, dict) or set(raw) != {"commit", "appDigest", "wsDigest", "token"}:
        raise ValueError("Unexpected deployment fields")
    if not isinstance(raw["commit"], str) or not re.fullmatch(r"[0-9a-f]{40}", raw["commit"]):
        raise ValueError("Expected a full commit SHA")
    for field in ("appDigest", "wsDigest"):
        if not isinstance(raw[field], str) or not re.fullmatch(r"sha256:[0-9a-f]{64}", raw[field]):
            raise ValueError("Expected immutable image digests")
    # Registry credentials are opaque (GitHub may change their encoding).
    # They go only to fixed-host docker login stdin, never into a shell/URL.
    if not isinstance(raw["token"], str) or not re.fullmatch(r"[!-~]{20,4096}", raw["token"]):
        raise ValueError("Invalid registry token")
    return {
        "commit": raw["commit"],
        "app": REGISTRY + "regatta@" + raw["appDigest"],
        "ws": REGISTRY + "regatta-ws@" + raw["wsDigest"],
    }


def run(args, env, *, data=None, timeout=300):
    # Never print subprocess output: application logs and login errors may
    # contain secrets. Operational failures are recorded without command input.
    result = subprocess.run(args, input=data, text=True, capture_output=True,
                            env=env, cwd="/", timeout=timeout, check=False)
    if result.returncode:
        raise RuntimeError("Deployment command failed: " + args[0])
    return result.stdout


def save(path, value):
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(value) + "\n")
    tmp.chmod(0o600)
    tmp.replace(path)


def compose(images, env):
    runtime = {**env, "REGATTA_IMAGE": images["app"], "REGATTA_WS_IMAGE": images["ws"]}
    run(["/usr/bin/docker", "compose", "--project-name", "regatta",
         "--project-directory", str(CONFIG), "--env-file", "/dev/null",
         "--file", str(CONFIG / "compose.yml"), "up", "-d", "--no-build",
         "--pull", "never", "--wait", "--wait-timeout", "150", "regatta", "regatta-ws"],
        runtime, timeout=180)


def audit(message):
    subprocess.run(["/usr/bin/logger", "-t", "regatta-deploy", "--", message],
                   env=ENV, cwd="/", timeout=5, check=False)


def main():
    if os.geteuid() != 0 or len(sys.argv) != 1:
        raise ValueError("Only the installed deployment entry point is supported")
    os.umask(0o077)
    # Bound an incomplete/oversized stdin request as well as every child process.
    signal.signal(signal.SIGALRM, lambda *_: (_ for _ in ()).throw(ValueError("Input timeout")))
    signal.alarm(15)
    content = sys.stdin.buffer.read(8193)
    signal.alarm(0)
    if len(content) > 8192:
        raise ValueError("Deployment request too large")
    request = json.loads(content)
    desired = validate(request)
    with (STATE / "deploy.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        previous = json.loads((STATE / "current.json").read_text())
        with tempfile.TemporaryDirectory(prefix="regatta-registry-", dir="/run") as credentials:
            env = {**ENV, "DOCKER_CONFIG": credentials}
            run(["/usr/bin/docker", "login", "ghcr.io", "--username", "Warlockus-prod",
                 "--password-stdin"], env, data=request.pop("token") + "\n", timeout=45)
            for name in ("app", "ws"):
                run(["/usr/bin/docker", "pull", desired[name]], env, timeout=300)
                metadata = json.loads(run(["/usr/bin/docker", "image", "inspect", desired[name]], env))[0]
                labels = metadata["Config"].get("Labels") or {}
                if labels.get("org.opencontainers.image.revision") != desired["commit"]:
                    raise ValueError("Image revision does not match the tested commit")
            audit("starting " + desired["commit"])
            try:
                compose(desired, env)
            except Exception:
                audit("rolling back " + desired["commit"])
                compose(previous, env)
                raise
            save(STATE / "previous.json", previous)
            save(STATE / "current.json", desired)
            audit("healthy " + desired["commit"])
            print("Regatta deployment healthy: " + desired["commit"])


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        # Report only our own fixed validation messages, never arbitrary input
        # or a subprocess exception that could contain registry credentials.
        safe_errors = {"Unexpected deployment fields", "Expected a full commit SHA",
                       "Expected immutable image digests", "Invalid registry token",
                       "Deployment request too large", "Input timeout",
                       "Image revision does not match the tested commit"}
        reason = str(error) if str(error) in safe_errors else type(error).__name__
        print("Regatta deployment rejected or failed: " + reason, file=sys.stderr)
        sys.exit(1)
