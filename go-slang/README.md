# `go-slang`

## Set Up

### Install deps and build

```sh
# working directory: REPO_ROOT/go-slang

yarn # installs all dependencies
yarn build # builds project for use in other projects
```

### Recommended Install: local `yarn` link

Running `yarn link` will allow other yarn packages to use "go-slang" directly through a sym link. Note that you must always be running `build` in this folder to be able to surface updated build output. (i.e. `yarn build` in a downstream package will not trigger a `yarn build` in this folder.)

```sh
# working directory: REPO_ROOT/go-slang

# tells yarn to remember this package as "go-slang"
yarn link
# In another library, you can now run `yarn link "go-slang"` to access these contents.
```