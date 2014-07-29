#!/bin/bash

if [ ! -e bin/activate ]; then
  echo "you need top create the virtualenv for this project first"
  echo "cd ..; virtualenv um-recap"
  exit 1
fi

source bin/activate

pip install Flask

exit
