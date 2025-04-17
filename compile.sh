#!/bin/bash

# Define source and destination directories
SOURCE_DIR="src"
DIST_DIR="dist"

# Remove the existing distribution directory
rm -rf "$DIST_DIR"

# Create the distribution directory
mkdir -p "$DIST_DIR"

# Copy necessary files and directories to the distribution directory
cp -r "$SOURCE_DIR"/*.{json,css,html} "$SOURCE_DIR"/{assets,scripts} "$DIST_DIR"

# Run the npm build script
npm run build

cp -r dist/* firefox
cp -r dist/* chrome

echo "Zipping with 7z"
cd chrome 
7z a ../tabbed-chrome.zip . 
cd ../firefox
7z a ../tabbed-firefox.zip . 
