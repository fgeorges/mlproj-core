## Dev notes

To launch mlproj with the current state of affair from the mlproj dir, for
instance to deploy en env prod, dry mode:

    ../../../../mlproj/src/tui.js -e prod -d deploy

To override mlproj-core sources in mlproj, during dev phase, from this dir:

    cp ../../../src/* ../../../../mlproj/node_modules/mlproj-core/src/

**TODO**: Add garbage, include and exclude filters and files...  Add
more source sets too.
