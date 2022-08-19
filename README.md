# Performance/load tests for ORO application

These scenarios were used to perform load tests for ORO application using [k6 tool](https://k6.io)

## Repository Structure

- `performance/scripts` - load test scenarios for K6 load testing framework
- `performance/summary.html` - summary test result output after running the tests (done by [k6-reporter](https://github.com/benc-uk/k6-reporter))

## Setup instructions

- install k6 ([installation guide](https://k6.io/docs/getting-started/installation/))

### Debian/Ubuntu

```
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### MacOS

`brew install k6`

### Windows

If you use the Windows Package Manager, install the official packages from the k6 manifests (created by the community):

`winget install k6`

### Docker

`docker pull grafana/k6:latest`

## Run tests

### Debian/Ubuntu
```
k6 run -e BASE_URL="https://example.com" -e USERNAME=AmandaRCole@example.org -e PASSWORD=AmandaRCole@example.org -e VU=1 -e DURATION=60s -e THRESHOLD_AVG=3000 scripts/warmingUpTheApp.js
run -e BASE_URL="https://example.com" -e USERNAME=AmandaRCole@example.org -e PASSWORD=AmandaRCole@example.org -e VU=1 -e DURATION=600s -e THRESHOLD_AVG=850 scripts/storefrontTests.js
```
where:
- BASE_URL - base URL of application
- USERNAME - storefront username
- PASSWORD - storefront user password
- VU - virtual users number in use
- DURATION - test duration
- THRESHOLD_AVG - pass/fail criteria for your test metrics


### Docker

```
docker run --rm --network host -u "$(id -u):$(id -g)" -v ${PWD}:/home/k6/performance -w /home/k6/performance grafana/k6:latest run -e BASE_URL="https://example.com" -e USERNAME=AmandaRCole@example.org -e PASSWORD=AmandaRCole@example.org -e VU=1 -e DURATION=60s -e THRESHOLD_AVG=3000 scripts/warmingUpTheApp.js
docker run --rm --network host -u "$(id -u):$(id -g)" -v ${PWD}:/home/k6/performance -w /home/k6/performance grafana/k6:latest run -e BASE_URL="https://example.com" -e USERNAME=AmandaRCole@example.org -e PASSWORD=AmandaRCole@example.org -e VU=1 -e DURATION=600s -e THRESHOLD_AVG=850 scripts/storefrontTests.js
```