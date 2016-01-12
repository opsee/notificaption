# notificaption
Screenshots of Emissary for notifications. 

## Deployment
1. `docker build -t quay.io/opsee/notificaption .`
2. `docker push quay.io/opsee/notificaption`
3. From the [`compute` repo](https://github.com/opsee/compute): `./run deploy production notificaption latest`

### Troubleshooting deploys
First, make sure notificaption is playing nice with Docker by running it locally:

1. `docker build -t quay.io/opsee/notificaption .`
2. `docker run -p 9099:9099 -d quay.io/opsee/notificaption`
2. Get the IP address of the local docker-machine: `docker-machine ip default` (e.g., 123.4.5.6)
3. Try hitting `123.4.5.6:9099`
