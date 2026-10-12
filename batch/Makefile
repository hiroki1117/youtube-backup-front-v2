IMAGE ?= yt-dlp-script
TAG ?= youtube-backup-candidate:local
.PHONY: check build
check:
	python3 -c 'import ast,pathlib; [(ast.parse(p.read_text()), print(p)) for p in pathlib.Path("scripts").rglob("*.py")]'
	@for file in scripts/yt-dlp-script/main.sh scripts/youtube-dl-script/main.sh scripts/whisper-script/main.sh; do sh -n "$$file" || exit; done
	bash -n scripts/youtube-upload-script/main.sh
# Local build only; no login, tag publication, or push.
build:
	docker build -t $(TAG) scripts/$(IMAGE)
