# Remove the testing directories
rm -rf test
mkdir test
mkdir test/{firefox,chrome}

# Copy files over
cp -r src/* test/firefox
cp -r src/* test/chrome

# Firefox
mv test/firefox/manifest-firefox.json test/firefox/manifest.json
rm test/firefox/manifest-chrome.json

# Chrome
mv test/chrome/manifest-chrome.json test/chrome/manifest.json
rm test/chrome/manifest-firefox.json
