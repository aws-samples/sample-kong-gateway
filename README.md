# Sample Application - Kong Enterprise on AWS

This repository hosts code samples offering a AWS CDK App that you can use to quickly get started for creating Kong Enterprise Platform using kong-control-plane, kong-data-plane and kong-core AWS CDK Construct. 

Please let us know if you need more samples by opening an issue here and we would priortize it.

## Pre-Requisites

* You would need a Kong Enterprise License Key and save it in AWS Secrets Manager with a name of `kong-license-cdk`. If you choose a different name to save the secrets, you would need to modify devEnv.licese_secret_name property in `/bin/sample-kong-apps.ts`
* You have bootstrapped the AWS Account and Region with AWS CDK. If not, refer [here](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html)
* A Hosted Zone under AWS Route53

## Sample use cases

You can pick and choose the desired use case. 

|Use Case | Sample Code to refer  | Command to Deploy | 
--- | --- | --- | 
|Control Plane on EKS and AL2 | /lib/eks_cp.ts| `cdk deploy kong-cp-eks`
|Data Plane on EKS and AL2 | /lib/eks_dp.ts| `cdk deploy kong-dp-eks`
|Data Plane on ECS and Fargate | /lib/ecs_cp.ts| `cdk deploy kong-cp-ecs`
|Data Plane on ECS and Fargate | /lib/ecs_dp.ts| `cdk deploy kong-dp-ecs`
|Control Plane on EKS and AL2 with DataPlane on ECS and Fargate | /bin/sample-kong-apps.ts| `cdk deploy kong-dp-ecs-with-eks-cp`


## Assumption

The VPC in which Kong data plane is deployed has the connectivity (and DNS resolvable) with the VPC in which control plane is deployed.

## Deployment Steps

* Ensure you have actioned on the `Pre-Requisites` section above.
* Execute `npm install` to install the NPM packages
* Execute `npm run build` to compile typescript to js
* Select the commands from the `Sample Use Cases` section above
## Other useful commands

 * `npm update`         update npm package dependencies
 * `npm run build`      compile typescript to js
 * `npm run watch`      watch for changes and compile
 * `npm run test`       perform the jest unit tests
 * `cdk deploy`         deploy this stack to your default AWS account/region
 * `cdk diff`           compare deployed stack with current state
 * `cdk synth`          emits the synthesized CloudFormation template
 * `npm install projen` installs projen
 * `npx projen`         installs dependencies and generates the necessary files
 * `npx projen build`   compiles ts to js and runs cdk

## Post Deployment Steps

* Provision [Karpenter policies](https://karpenter.sh/v0.11.1/tasks/provisioning/) for autoscaling, if required
* Configure [ADOT Collector and receiver](https://docs.aws.amazon.com/eks/latest/userguide/deploy-collector.html) based on your choice of Telemetry platform
## Cleanup

* Remove delete protection from RDS
* 

## Whats not supported ?

* ADOT Operator does not supports ARM64 architecture
* EKS Fargate as some of the technology used like Secrets Management runs are DaemonSet, which is not supported in Fargate.

## What this app sets up ?

FILLME