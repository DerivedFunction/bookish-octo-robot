#!/bin/bash

# Define source and destination directories
SOURCE_DIR="src"
DIST_DIR="dist"

# Clean the workspace
echo 'Removing distribution directories and archives'

# Remove zipped files
rm -f *.zip

# Remove the existing distribution directory
rm -rf "$DIST_DIR" firefox chrome

# Create the distribution directory
mkdir -p "$DIST_DIR" firefox chrome

# Copy necessary files and directories to the distribution directory
cp -r "$SOURCE_DIR"/*.{json,css,html} "$SOURCE_DIR"/{assets,scripts} "$DIST_DIR"

# Run the npm build script
echo "Updating and building with NPM"
npm update
npm run build

# Copy files from dist to each browser type
echo "Copying files"
cp -r "$DIST_DIR"/* firefox
cp -r "$DIST_DIR"/* chrome

# Rename the manifest files, delete the other one
mv firefox/manifest-firefox.json firefox/manifest.json
mv chrome/manifest-chrome.json chrome/manifest.json
rm firefox/manifest-chrome.json chrome/manifest-firefox.json

# Create ZIP Archives
echo "Zipping with 7z"

# Create a zip archive for Chrome Extension
echo "Zipping chrome"
cd chrome 
7z a ../tabbed-chrome.zip . 

# Create a zip archive for Firefox Extension
echo "Zipping Firefox"
cd ../firefox
7z a ../tabbed-firefox.zip . 
echo "Zipping source from root directory"
cd ../

# Create a zip archive for the root directory
7z a -xr@.gitignore tabbed-source-code.zip .