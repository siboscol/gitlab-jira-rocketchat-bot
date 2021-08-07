#!/bin/sh
echo "Move to folder"
cd ./gitlab-jira-rocketchat-bot
echo "Fetch updates"
git fetch origin
git checkout dev
echo "Dev branch status"
git status
echo "Discard unstaged files"
git stash
git stash drop
echo "Move to latest version"
git rebase origin/dev
echo "Install new modules"
npm install
echo "Restart service"
pm2 restart index
