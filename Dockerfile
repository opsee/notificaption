FROM node:argon

MAINTAINER Sara Bee <sara@opsee.co>

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app/
RUN npm install

COPY . /usr/src/app

EXPOSE 9099
ENV NODE_ENV 'production'
CMD [ "node", "/usr/src/app/test.js" ]