## Instructions

### Build and Push

Create the image that runs the web app for the car.

    docker build \
        -t ryanzotti/car-hub:2020-07-03 \
        -f ./coordinator/Dockerfile .
    docker push ryanzotti/car-hub:2020-07-03
