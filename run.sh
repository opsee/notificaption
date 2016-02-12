#!/bin/bash

/opt/bin/s3kms -r us-west-1 get -b opsee-keys -o dev/$APPENV > /$APPENV
echo "done"
source /$APPENV
echo "donedone"
npm start

