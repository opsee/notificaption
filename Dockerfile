FROM node:argon

MAINTAINER Sara Bee <sara@opsee.co>

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app/
RUN npm install

COPY . /usr/src/app

EXPOSE 8888
CMD [ "npm", "start" ]