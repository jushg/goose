# Frontend for Goose Compiler / Gosling VM

## Set Up `go-slang` ⚠️

### Recommended: local `yarn` link

Set up [go-slang](../go-slang/README.md) before proceeding. This necessary includes running `yarn link` in "../go-slang".

```sh
# working directory: REPO_ROOT/frontend

# tells yarn to create a sym-link to the yarn package in "go-slang"
yarn link "go-slang"

# Runs build in the go-slang package so that the frontend accesses the latest go-slang build.
( cd ../go-slang ; yarn build )
```

If the above does not work on your machine, feel free to use any other means to save the dependency.

For example:

### Alternative: Adding a local package as a path

```json
{
  "name": "frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    //...
    "go-slang": "../go-slang", // insert this line
    //...
  },
  //...
}
```

Note that this requires you to clean cache and reinstall to get changes to your "./go-slang" folder as this is not a sym-link, but an installed dependency.

## Build and Run

Once `go-slang` is accessible from this directory, we can follow typical ReactJS instructions:

```sh
# working directory: REPO_ROOT/frontend

yarn # installs all dependencies
yarn start # runs the webapp locally
```