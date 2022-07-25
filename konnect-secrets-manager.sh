#!/usr/bin/env bash

KONNECT_RUNTIME_PORT=8000
KONNECT_API_URL=
KONNECT_USERNAME=
KONNECT_PASSWORD=
KONNECT_CONTROL_PLANE=
KONNECT_RUNTIME_REPO=
KONNECT_RUNTIME_IMAGE=
KONNECT_CONTROL_PLANE_FRIENDLY_IDENTIFIER=

KONNECT_CP_ID=
KONNECT_CP_NAME=
KONNECT_CP_ENDPOINT=
KONNECT_TP_ENDPOINT=
KONNECT_HTTP_SESSION_NAME="konnect-session"

globals() {
    KONNECT_DEV=${KONNECT_DEV:-0}
    KONNECT_VERBOSE_MODE=${KONNECT_VERBOSE_MODE:-0}
}

error() {
    echo "Error: " "$@"
    cleanup
    exit 1
} 

# run dependency checks
run_checks() {
    # check if curl is installed
    if ! [ -x "$(command -v curl)" ]; then
        error "curl needs to be installed"
    fi

    # check if docker is installed
    if ! [ -x "$(command -v docker)" ]; then
        error "docker needs to be installed"
    fi

    # check if jq is installed
    if ! [ -x "$(command -v jq)" ]; then
        error "jq needs to be installed"
    fi
}

help(){
cat << EOF

Usage: konnect-runtime-setup [options ...]

Options:
    -api            Konnect API
    -u              Konnect username
    -p              Konnect user password
    -c              Konnect control plane Id
    -r              Konnect runtime repository url
    -ri             Konnect runtime image name
    -pp             runtime port number
    -v              verbose mode
    -h, --help      display help text

EOF
}

# parse command line args
parse_args() {
  while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
    -api)
        KONNECT_API_URL=$2
        shift
        ;;
    -u)
        KONNECT_USERNAME=$2
        shift
        ;;
    -p)
        KONNECT_PASSWORD=$2
        shift
        ;;
    -c)
        KONNECT_CONTROL_PLANE=$2
        shift
        ;;
    -r)
        KONNECT_RUNTIME_REPO=$2
        shift
        ;;
    -ri)
        KONNECT_RUNTIME_IMAGE=$2
        shift
        ;;
    -pp)
        KONNECT_RUNTIME_PORT=$2
        shift
        ;;
    -v)
        KONNECT_VERBOSE_MODE=1
        ;;
    -h|--help)
        help
        exit 0
        ;;
    esac
    shift
  done
}

# check important variables
check_variables() {
    if [[ -z $KONNECT_API_URL ]]; then
        error "Konnect API URL is missing"
    fi
    
    if [[ -z $KONNECT_USERNAME ]]; then
        error "Konnect username is missing"
    fi

    if  [[ -z $KONNECT_PASSWORD ]]; then
        error "Konnect password is missing"
    fi

    if  [[ -z $AWS_ACCESS_KEY_ID ]]; then
        error "AWS Access Key ID is missing"
    fi

    if  [[ -z $AWS_SECRET_ACCESS_KEY ]]; then
        error "AWS Secret Access Key is missing"
    fi

    if  [[ -z $AWS_SESSION_TOKEN ]]; then
        error "AWS Session Token is missing"
    fi

    if  [[ -z $AWS_DEFAULT_REGION ]]; then
        error "Default AWS Region is missing"
    fi

    # check if it is in DEV mode and all required parameters are given
    if [[ $KONNECT_DEV -eq 1 ]]; then
        if [[ -z $KONNECT_DEV_USERNAME ]]; then
            error "username for dev mode is missing, please add it via 'KONNECT_DEV_USERNAME' environment variable."
        fi

        if [[ -z $KONNECT_DEV_PASSWORD ]]; then
            error "password for dev mode is missing, please add it via 'KONNECT_DEV_PASSWORD' environment variable."
        fi
    fi
}

log_debug() {
    if [[ $KONNECT_VERBOSE_MODE -eq 1 ]]; then
        echo "$@"
    fi
}

list_dep_versions() {
    if [[ $KONNECT_VERBOSE_MODE -eq 1 ]]; then
        DOCKER_VER=$(docker --version)
        CURL_VER=$(curl --version)
        JQ_VER=$(jq --version)

        echo "===================="
        echo "Docker: $DOCKER_VER"
        echo "curl: $CURL_VER"
        echo "jq: $JQ_VER"
        echo "===================="
    fi
}

http_req() {
    ARGS=$@
    if [[ $KONNECT_VERBOSE_MODE -eq 1 ]]; then
        ARGS=" -vvv $ARGS"
    fi

    curl -L --silent --write-out 'HTTP_STATUS_CODE:%{http_code}' -H "Content-Type: application/json" $ARGS
}

http_req_plain() {
    ARGS=$@
    if [[ $KONNECT_VERBOSE_MODE -eq 1 ]]; then
        ARGS=" -v $ARGS"
    fi

    curl -L --silent --write-out 'HTTP_STATUS_CODE:%{http_code}' -H "Content-Length: 0" $ARGS
}

http_status() {
    echo "$@" | tr -d '\n' | sed -e 's/.*HTTP_STATUS_CODE://'
}

http_res_body() {
    echo "$@" | sed -e 's/HTTP_STATUS_CODE\:.*//g'
}

# login to the Konnect and acquire the session
login() {
    log_debug "=> entering login phase"

    ARGS="--cookie-jar ./$KONNECT_HTTP_SESSION_NAME -X POST -d {\"username\":\"$KONNECT_USERNAME\",\"password\":\"$KONNECT_PASSWORD\"} --url $KONNECT_API_URL/kauth/api/v1/authenticate"
    if [[ $KONNECT_DEV -eq 1 ]]; then
        ARGS="-u $KONNECT_DEV_USERNAME:$KONNECT_DEV_PASSWORD $ARGS"
    fi

    RES=$(http_req "$ARGS")
    STATUS=$(http_status "$RES")

    if ! [[ $STATUS -eq 200 ]]; then
        log_debug "==> response retrieved: $RES"
        error "login to Konnect failed... (Status code: $STATUS)"
    fi
    log_debug "=> login phase completed"
}

get_control_plane() {
    log_debug "=> entering control plane metadata retrieval phase"

    ARGS="--cookie ./$KONNECT_HTTP_SESSION_NAME -X GET --url $KONNECT_API_URL/api/runtime_groups/$KONNECT_CONTROL_PLANE"
    if [[ $KONNECT_DEV -eq 1 ]]; then
        ARGS="-u $KONNECT_DEV_USERNAME:$KONNECT_DEV_PASSWORD $ARGS"
    fi

    log_debug "$ARGS"

    RES=$(http_req_plain "$ARGS")
    RESPONSE_BODY=$(http_res_body "$RES")
    STATUS=$(http_status "$RES")

    log_debug "$RESPONSE_BODY"

    if [[ $STATUS -eq 200 ]]; then
        CONTROL_PLANE=$(echo "$RESPONSE_BODY" | jq .)
        KONNECT_CP_ID=$(echo "$CONTROL_PLANE" | jq -r .id)
        KONNECT_CP_NAME=$(echo "$CONTROL_PLANE" | jq -r .name)
        KONNECT_CP_ENDPOINT="$(echo "$CONTROL_PLANE" | jq -r .config.cp_outlet)"
        KONNECT_TP_ENDPOINT="$(echo "$CONTROL_PLANE" | jq -r .config.telemetry_endpoint)"
    else 
        log_debug "==> response retrieved: $RES"
        error "failed to fetch control plane (Status code: $STATUS)"
    fi
    log_debug "=> control plane metadata retrieval phase completed"
}

generate_secrets() {
    log_debug "=> entering secrets generation phase"
    log_debug "=> removing the existing secrets"
    docker run --rm -it -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_SESSION_TOKEN -e AWS_DEFAULT_REGION amazon/aws-cli secretsmanager delete-secret --secret-id $KONNECT_CP_ID-crt --force-delete-without-recovery
    docker run --rm -it -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_SESSION_TOKEN -e AWS_DEFAULT_REGION amazon/aws-cli secretsmanager delete-secret --secret-id $KONNECT_CP_ID-key --force-delete-without-recovery
    log_debug "=> sleeping for 30 seconds as delete operation is async"
    sleep 30
    log_debug "=> waking up now and creating secrets"
    docker run --rm -it -v $(pwd):/root -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_SESSION_TOKEN -e AWS_DEFAULT_REGION amazon/aws-cli secretsmanager create-secret --name $KONNECT_CP_ID-crt --secret-string file:///root/cluster.crt --tags Key=konnect_runtime_identifier,Value="$KONNECT_CP_ID"
    docker run --rm -it -v $(pwd):/root -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_SESSION_TOKEN -e AWS_DEFAULT_REGION amazon/aws-cli secretsmanager create-secret --name $KONNECT_CP_ID-key --secret-string file:///root/cluster.key --tags Key=konnect_runtime_identifier,Value="$KONNECT_CP_ID"
}

generate_certificates() {
    log_debug "=> entering certificate generation phase"

    tee -a openssl.cnf << EOF 
[ req ]
prompt                 = no
distinguished_name     = req_distinguished_name
req_extensions         = v3_req


[ req_distinguished_name ]
countryName            = US
commonName             = kongdp

[ v3_req ]
basicConstraints       = CA:false
extendedKeyUsage       = clientAuth
EOF

    openssl req -new -config openssl.cnf -extensions v3_req -days 3650 -newkey rsa:4096 -nodes -x509 -keyout cluster.key -out cluster.crt
    chmod o+r cluster.key
    CERTIFICATE=$(awk '{printf "%s\\n", $0}' cluster.crt)
    PAYLOAD="{\"name\":\"$KONNECT_CP_NAME\",\"certificates\":[\"$CERTIFICATE\"],\"id\":\"$KONNECT_CP_ID\"}"    
    echo $PAYLOAD > payload.json

    ARGS="--cookie ./$KONNECT_HTTP_SESSION_NAME -X PUT $KONNECT_API_URL/api/runtime_groups/$KONNECT_CP_ID -d @payload.json "

    
    if [[ $KONNECT_DEV -eq 1 ]]; then
        ARGS="-u $KONNECT_DEV_USERNAME:$KONNECT_DEV_PASSWORD $ARGS"
    fi

    log_debug "=> upload certificate "

    RES=$(http_req "$ARGS")
    RESPONSE_BODY=$(http_res_body "$RES")
    STATUS=$(http_status "$RES")

    if [[ $STATUS -eq 200 ]]; then
        echo "done"
    else 
        log_debug "==> response retrieved: $RES"
        error "failed to generate certificates (Status code: $STATUS)"
    fi
    log_debug "=> certificate generation phase completed"
}

download_kongee_image() {
    log_debug "=> entering kong gateway download phase"
    
    echo "pulling kong docker image..."

    CMD="docker pull $KONNECT_RUNTIME_REPO/$KONNECT_RUNTIME_IMAGE"
    if [[ -n $KONNECT_DOCKER_USER && -n $KONNECT_DOCKER_PASSWORD ]]; then
        CMD="docker login -u $KONNECT_DOCKER_USER -p $KONNECT_DOCKER_PASSWORD $KONNECT_RUNTIME_REPO &> /dev/null && $CMD" 
    fi
    DOCKER_PULL=$(eval "$CMD")

    if [[ $? -gt 0 ]]; then
        error "failed to pull Kong EE docker image"
    fi
    echo "done"
    log_debug "=> kong gateway download phase completed"
}

run_kong() {
    log_debug "=> entering kong gateway container starting phase"

    CP_SERVER_NAME=$(echo "$KONNECT_CP_ENDPOINT" | awk -F/ '{print $3}')
    TP_SERVER_NAME=$(echo "$KONNECT_TP_ENDPOINT" | awk -F/ '{print $3}')
    

    echo -n "Your flight number: "
    docker run -d \
        -e "KONG_ROLE=data_plane" \
        -e "KONG_DATABASE=off" \
        -e "KONG_ANONYMOUS_REPORTS=off" \
        -e "KONG_VITALS_TTL_DAYS=723" \
        -e "KONG_CLUSTER_MTLS=pki" \
        -e "KONG_CLUSTER_CONTROL_PLANE=$CP_SERVER_NAME:443" \
        -e "KONG_CLUSTER_SERVER_NAME=$CP_SERVER_NAME" \
        -e "KONG_CLUSTER_TELEMETRY_ENDPOINT=$TP_SERVER_NAME:443" \
        -e "KONG_CLUSTER_TELEMETRY_SERVER_NAME=$TP_SERVER_NAME" \
        -e "KONG_CLUSTER_CERT=/config/cluster.crt" \
        -e "KONG_CLUSTER_CERT_KEY=/config/cluster.key" \
        -e "KONG_LUA_SSL_TRUSTED_CERTIFICATE=system,/config/cluster.crt" \
        --mount type=bind,source="$(pwd)",target=/config,readonly \
        -p "$KONNECT_RUNTIME_PORT":8000 \
        "$KONNECT_RUNTIME_REPO"/"$KONNECT_RUNTIME_IMAGE"

    if [[ $? -gt 0 ]]; then
        error "failed to start a runtime"
    fi

    log_debug "=> kong gateway container starting phase completed"
}

cleanup() {
    # remove cookie file
    rm -f ./$KONNECT_HTTP_SESSION_NAME
    rm -f ./payload.json
    rm -f ./openssl.cnf
    # remove generated cert files
    rm -f ./cluster.crt
    rm -f ./cluster.key
}

main() {
    globals

    echo "*** Welcome to the rocketship ***"
    echo "Running checks..."
    run_checks

    # parsing arguments
    parse_args "$@"

    # list dependency versions if debug mode is enabled
    list_dep_versions

    # validating required variables
    check_variables

    # login and acquire the session
    login

    # get control plane data
    get_control_plane

    # retrieve certificates, keys for runtime
    generate_certificates
    generate_secrets

    # download kong docker image
    #download_kongee_image

    echo "Secrets are stored at $KONNECT_CP_ID-crt and $KONNECT_CP_ID-key"
    echo "Use Cluster endpoint as $KONNECT_CP_ENDPOINT"
    echo "Use Telemetry endpoint as $KONNECT_TP_ENDPOINT"

    cleanup
}

main "$@"