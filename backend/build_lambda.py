"""Build a standard wheel plus vendored dependencies into a review-only Lambda ZIP."""

import argparse
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

HANDLERS = {
    "video": "api.app.video_handler",
    "backup": "api.app.backup_handler",
    "s3_complete": "events.handlers.s3_complete",
    "scrapbox_scan": "events.handlers.scrapbox_scan",
    "retry": "events.handlers.retry",
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("function", choices=HANDLERS)
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    wheels = root / "build/dist"
    subprocess.run(
        [sys.executable, "-m", "build", "--wheel", "--outdir", str(wheels), str(root)], check=True
    )
    wheel = sorted(wheels.glob("youtube_backup_backend-*.whl"))[-1]
    target = root / "build/lambda" / args.function
    shutil.rmtree(target, ignore_errors=True)
    subprocess.run(
        [
            sys.executable,
            "-m",
            "pip",
            "install",
            "--disable-pip-version-check",
            "--no-compile",
            "--only-binary=:all:",
            "--platform",
            "manylinux2014_x86_64",
            "--platform",
            "manylinux_2_28_x86_64",
            "--implementation",
            "cp",
            "--python-version",
            "3.14",
            "--abi",
            "cp314",
            "--target",
            str(target),
            "-r",
            str(root / "requirements.lock"),
            str(wheel),
        ],
        check=True,
    )
    # Validate handler imports solely from the extracted artifact, with AWS construction forbidden.
    module, handler = HANDLERS[args.function].rsplit(".", 1)
    probe = (
        "import importlib,boto3; "
        "boto3.Session=lambda *a,**k: (_ for _ in ()).throw(AssertionError('AWS at import')); "
        f"assert callable(getattr(importlib.import_module('{module}'),'{handler}'))"
    )
    subprocess.run(
        [
            sys.executable,
            "-S",
            "-c",
            "import sys; sys.dont_write_bytecode=True; sys.path.insert(0, sys.argv[1]); " + probe,
            str(target),
        ],
        cwd="/tmp",
        check=True,
    )
    archive = root / "build" / f"{args.function}.zip"
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as output:
        for path in sorted(target.rglob("*")):
            if path.is_file() and "__pycache__" not in path.parts:
                output.write(path, path.relative_to(target))
    print(
        f"Review candidate: {archive.name}; handler: {HANDLERS[args.function]}; "
        "runtime: python3.14; x86_64"
    )


if __name__ == "__main__":
    main()
