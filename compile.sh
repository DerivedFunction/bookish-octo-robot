#!/bin/bash

# Define source and destination directories
SOURCE_DIR="src"
DIST_DIR="dist"

# Remove zipped files
rm -f *.zip

# Remove the existing distribution directory
rm -rf "$DIST_DIR" firefox chrome

# Create the distribution directory
mkdir -p "$DIST_DIR" firefox chrome

# Copy necessary files and directories to the distribution directory
cp -r "$SOURCE_DIR"/*.{json,css,html} "$SOURCE_DIR"/{assets,scripts} "$DIST_DIR"

# Run the npm build script
npm update
npm run build

cp -r "$DIST_DIR"/* firefox
cp -r "$DIST_DIR"/* chrome

# Rename the manifest files, delete the other one
mv firefox/manifest-firefox.json firefox/manifest.json
mv chrome/manifest-chrome.json chrome/manifest.json
rm firefox/manifest-chrome.json chrome/manifest-firefox.json

# Create ZIP Archives
echo "Zipping with 7z"
echo "Zipping chrome"
cd chrome 
7z a ../tabbed-chrome.zip . 
echo "Zipping chrome"
cd ../firefox
7z a ../tabbed-firefox.zip . 
echo "Zipping source from root directory"
cd ../
7z a -xr@.gitignore tabbed-source-code.zip .