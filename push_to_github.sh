#!/usr/bin/env bash
set -e
echo "================================================================"
echo "  Pushing FurnitureDataViz Monorepo to GitHub (@narekmartiros)"
echo "================================================================"
if ! git remote | grep -q origin; then
  git remote add origin https://github.com/narekmartiros/FurnitureDataViz.git
else
  git remote set-url origin https://github.com/narekmartiros/FurnitureDataViz.git
fi
git branch -M main
git push -u origin main
echo "✅ Successfully pushed to https://github.com/narekmartiros/FurnitureDataViz"
