FROM node:argon

MAINTAINER Sara Bee <sara@opsee.co>

ENV NODE_ENV 'production'
ENV DISPLAY ':9.0'

# Install the Nix dependencies for Electron
RUN apt-get update &&\
    apt-get install -y libgtk2.0-0 libgconf-2-4 \
    libasound2 libxtst6 libxss1 libnss3 xvfb

# Set up the node app
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY package.json /usr/src/app/
RUN npm install
COPY . /usr/src/app

# Start the server
EXPOSE 9099
CMD xvfb-run --server-args="-screen 9 1280x2000x24" node server.js