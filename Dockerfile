FROM mhart/alpine-node:5.7

RUN apk add --update curl bash

# Pull down app environment
RUN mkdir -p /opt/bin && \
    curl -Lo /opt/bin/s3kms https://s3-us-west-2.amazonaws.com/opsee-releases/go/vinz-clortho/s3kms-linux-amd64 && \
    chmod 755 /opt/bin/s3kms

ENV NODE_ENV 'production'
ENV APPENV 'notificaptionenv'
ENV YELLER_TOKEN ''

# Make sure node_modules aren't installed every time
# http://bitjudo.com/blog/2014/03/13/building-efficient-dockerfiles-node-dot-js/
COPY package.json /tmp/
RUN cd /tmp && npm install
RUN mkdir -p /app && cp -a /tmp/node_modules /app/

# Add current directory to /app
COPY . /app/

# Set current working directory as /app
WORKDIR /app

EXPOSE 9099

# Default command. Assumes our file is index.js and our screen size is 1024x768
CMD ./run.sh

