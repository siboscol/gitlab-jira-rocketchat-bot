#!/bin/sh

res=`lsof -ti tcp:5005`
if [[ ! -z $res ]];
then
    echo "[INFO] Killing previous server"
    eval "kill $res"
fi