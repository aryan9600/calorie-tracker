all: check build

CARGO_BUILD_TARGET ?= wasm32-unknown-unknown
CONTRACT_NAME ?= "calorie_tracker"
CONTRACT_ID_FILE ?= "./.soroban/calorie-tracker-id"
CONTRACT_ID := $(shell cat $(CONTRACT_ID_FILE))
SOURCE ?=
ADDRESS ?=
CALORIES ?=
DATE ?=

build: fmt
	cargo build --target $(CARGO_BUILD_TARGET) --no-default-features --release
	cd target/$(CARGO_BUILD_TARGET)/release/ && \
		for i in *.wasm ; do \
			ls -l "$$i"; \
		done

build-optimized: fmt
	CARGO_TARGET_DIR=target-tiny cargo +nightly build --target $(CARGO_BUILD_TARGET) --release \
		-Z build-std=std,panic_abort \
		-Z build-std-features=panic_immediate_abort
	cd target-tiny/$(CARGO_BUILD_TARGET)/release/ && \
		for i in *.wasm ; do \
			wasm-opt -Oz "$$i" -o "$$i.tmp" && mv "$$i.tmp" "$$i"; \
			ls -l "$$i"; \
		done

check: fmt
	cargo clippy --all-targets
	cargo clippy --release --target $(CARGO_BUILD_TARGET)

watch:
	cargo watch --clear --watch-when-idle --shell '$(MAKE)'

fmt:
	cargo fmt --all

clean:
	cargo clean
	CARGO_TARGET_DIR=target-tiny cargo +nightly clean

network:
	soroban config network add --global futurenet \
		--rpc-url https://rpc-futurenet.stellar.org \
		--network-passphrase "Test SDF Future Network ; October 2022"

identity:
	soroban config identity generate --global $(SOURCE)

fund:
	soroban config identity fund $(shell soroban config identity address $(SOURCE)) --network futurenet

deploy: build
	soroban contract deploy \
		--wasm target/wasm32-unknown-unknown/release/$(CONTRACT_NAME).wasm \
		--source $(SOURCE) \
		--network futurenet \
		> $(CONTRACT_ID_FILE)

add:
	soroban contract invoke --id $(CONTRACT_ID) \
		--source $(SOURCE) \
		--network futurenet \
		-- \
		add --user $(ADDRESS) --calories $(CALORIES) --date $(DATE)

subtract:
	soroban contract invoke --id $(CONTRACT_ID) \
		--source $(SOURCE) \
		--network futurenet \
		-- \
		subtract --user $(ADDRESS) --calories $(CALORIES) --date $(DATE)
