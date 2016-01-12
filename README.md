# notificaption
Screenshots of Emissary for notifications. 

## Deployment
1. `docker build -t quay.io/opsee/notificaption .`
2. `docker push quay.io/opsee/notificaption`
3. From the [`compute` repo](https://github.com/opsee/compute): `./run deploy production notificaption latest`
