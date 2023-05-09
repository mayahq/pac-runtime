aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 981640987050.dkr.ecr.ap-south-1.amazonaws.com

docker buildx build --platform linux/amd64 -t mayalabs.io/pac-runtime .

docker tag mayalabs.io/pac-runtime:latest 981640987050.dkr.ecr.ap-south-1.amazonaws.com/mayalabs.io/pac-runtime:$1

docker push 981640987050.dkr.ecr.ap-south-1.amazonaws.com/mayalabs.io/pac-runtime:$1