.PHONY: install check build backend batch
install:
	cd frontend && pnpm install --frozen-lockfile
	$(MAKE) -C backend install
check:
	cd frontend && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
	$(MAKE) -C backend check
	$(MAKE) -C batch check
build:
	cd frontend && pnpm build && pnpm build-storybook
backend:
	$(MAKE) -C backend check
batch:
	$(MAKE) -C batch check
