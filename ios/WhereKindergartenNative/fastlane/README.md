fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios beta_with_api_key

```sh
[bundle exec] fastlane ios beta_with_api_key
```

Build and upload to TestFlight (API Key)

### ios release_with_api_key

```sh
[bundle exec] fastlane ios release_with_api_key
```

Build, upload metadata/binary, and submit a new App Store version for review (API Key)

### ios build_only

```sh
[bundle exec] fastlane ios build_only
```

Build only (no upload)

### ios upload_metadata_with_api_key

```sh
[bundle exec] fastlane ios upload_metadata_with_api_key
```

Upload metadata (API Key)

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
