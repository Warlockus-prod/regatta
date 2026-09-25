"""Tests of the privilege boundary, not the Regatta application."""
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("deploy", HERE / "regatta-deploy.py")
deploy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy)


class DeployBoundary(unittest.TestCase):
    def request(self):
        return {"commit": "a" * 40, "appDigest": "sha256:" + "b" * 64,
                "wsDigest": "sha256:" + "c" * 64, "token": "x" * 40}

    def test_only_fixed_repositories_and_digests(self):
        result = deploy.validate(self.request())
        self.assertEqual(result["app"], deploy.REGISTRY + "regatta@sha256:" + "b" * 64)
        self.assertNotIn("token", result)

    def test_registry_token_is_opaque_and_may_use_base64_or_jwt_encoding(self):
        raw = self.request()
        raw["token"] = "header.payload.signature-with_base64+/="
        self.assertEqual(deploy.validate(raw)["commit"], "a" * 40)

    def test_rejects_commands_paths_tags_and_unknown_options(self):
        for field, values in {"commit": ["main", "a" * 40 + ";id", None, True],
                              "appDigest": ["latest", "$(id)", "../../etc/shadow", "sha256:" + "a" * 63],
                              "wsDigest": ["evil.example/app:latest", "a" * 64],
                              "token": ["x\npassword", "x" * 4097, "x" * 30 + "\x00", None]}.items():
            for value in values:
                with self.subTest(field=field, value=value):
                    raw = self.request(); raw[field] = value
                    with self.assertRaises(ValueError): deploy.validate(raw)
        for raw in [[], None, {**self.request(), "composeFile": "/tmp/evil"}]:
            with self.assertRaises(ValueError): deploy.validate(raw)

    def test_ssh_gateway_rejects_every_other_operation(self):
        for command in ["", "id", "bash", "deploy; id", "deploy x", "scp -t /tmp/x", "internal-sftp"]:
            result = subprocess.run(["/bin/sh", str(HERE / "regatta-ssh")],
                                    env={"SSH_ORIGINAL_COMMAND": command}, capture_output=True)
            self.assertEqual(result.returncode, 126)

    def test_compose_cannot_take_client_configuration_or_build(self):
        with patch.object(deploy, "run") as run:
            deploy.compose({"app": "approved-app", "ws": "approved-ws"}, deploy.ENV)
        args, env = run.call_args.args
        self.assertIn("--no-build", args)
        self.assertEqual(args[args.index("--env-file") + 1], "/dev/null")
        self.assertEqual(args[args.index("--file") + 1], "/etc/regatta-deploy/compose.yml")
        self.assertEqual(args[-2:], ["regatta", "regatta-ws"])
        self.assertNotIn("COMPOSE_FILE", env)

    def test_command_failure_does_not_disclose_output(self):
        with patch.object(deploy.subprocess, "run", return_value=subprocess.CompletedProcess([], 1, "secret", "secret")):
            with self.assertRaises(RuntimeError) as caught:
                deploy.run(["/usr/bin/docker", "login"], deploy.ENV)
        self.assertNotIn("secret", str(caught.exception))

    def test_failed_health_rolls_back_without_advancing_state(self):
        factory = tempfile.TemporaryDirectory
        with factory() as folder:
            state = Path(folder)
            old = {"commit": "old", "app": "sha256:old-app", "ws": "sha256:old-ws"}
            (state / "current.json").write_text(json.dumps(old))
            def response(args, *_args, **_kwargs):
                if args[1:3] == ["image", "inspect"]:
                    return json.dumps([{"Config": {"Labels": {
                        "org.opencontainers.image.revision": "a" * 40}}}])
                return ""
            with patch.object(deploy, "STATE", state), \
                 patch.object(deploy.os, "geteuid", return_value=0), \
                 patch.object(deploy.sys, "argv", ["regatta-deploy"]), \
                 patch.object(deploy.sys, "stdin", SimpleNamespace(buffer=io.BytesIO(json.dumps(self.request()).encode()))), \
                 patch.object(deploy.tempfile, "TemporaryDirectory", side_effect=lambda **_: factory()), \
                 patch.object(deploy, "run", side_effect=response), \
                 patch.object(deploy, "audit"), \
                 patch.object(deploy, "compose", side_effect=[RuntimeError("unhealthy"), None]) as compose:
                with self.assertRaises(RuntimeError): deploy.main()
            self.assertEqual(compose.call_count, 2)
            self.assertEqual(compose.call_args_list[1].args[0], old)
            self.assertEqual(json.loads((state / "current.json").read_text()), old)
            self.assertFalse((state / "previous.json").exists())


if __name__ == "__main__":
    unittest.main()
