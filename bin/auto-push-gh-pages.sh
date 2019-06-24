#!/bin/bash
# Assumption: all files are readily built and located at dist/

git clone "https://${GH_REF}" -b gh-pages gh-pages

# copy all files from dist to gh-pages/dist
mkdir gh-pages/dist
cp dist/* gh-pages/dist/

# set username as gh-pages-robot
cd gh-pages
git config --local user.name  "gh-pages-robot"
git config --local user.email "adon@yahoo-inc.com"

git add dist/.
git commit -m "Deploy latest dist files to gh-pages"

git push --quiet "https://${GH_TOKEN}@${GH_REF}" > /dev/null 2>&1
