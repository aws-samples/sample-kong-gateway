import { App } from 'aws-cdk-lib';
import { KongCpEcs } from './lib/ecs_cp';
import { KongDpEcs } from './lib/ecs_dp';
import { KongCpEks } from './lib/eks_cp';
import { KongDpEks } from './lib/eks_dp';
import { Vpc } from './lib/vpc';

// export class MyStack extends Stack {
//   constructor(scope: Construct, id: string, props: StackProps = {}) {
//     super(scope, id, props);

//     // define resources here...
//   }
// }

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};


const app = new App();

const new_vpc = new Vpc(app, 'kong-vpc', {
  env: devEnv,
  controlPlaneClusterName: app.node.tryGetContext('controlPlaneClusterName'),
  dataPlaneClusterName: app.node.tryGetContext('dataPlaneClusterName'),
});

const kong_control_plane_eks = new KongCpEks(app, 'kong-cp-eks', {
  env: devEnv,
  emailForCertRenewal: app.node.tryGetContext('email'),
  licese_secret_name: app.node.tryGetContext('licese_secret_name'),
  vpc: new_vpc.vpc,
  adminDns: app.node.tryGetContext('adminDns'),
  clusterDns: app.node.tryGetContext('clusterDns'),
  hostedZoneName: app.node.tryGetContext('hostedZoneName'),
  managerDns: app.node.tryGetContext('managerDns'),
  telemetryDns: app.node.tryGetContext('telemetryDns'),
  clusterName: app.node.tryGetContext('controlPlaneClusterName'),
});

const kong_control_plane_ecs = new KongCpEcs(app, 'kong-cp-ecs', {
  env: devEnv,
  licese_secret_name: app.node.tryGetContext('licese_secret_name'),
  vpc: new_vpc.vpc,
  hostedZoneName: app.node.tryGetContext('hostedZoneName'),
});

new KongDpEcs(app, 'kong-dp-ecs-with-eks-cp', {
  env: devEnv,
  cluster_dns: app.node.tryGetContext('clusterDns'),
  vpc: new_vpc.vpc,
  telemetry_dns: app.node.tryGetContext('telemetryDns'),
  private_ca_arn: kong_control_plane_eks.private_ca_arn,
  licese_secret_name: app.node.tryGetContext('licese_secret_name'),
});


new KongDpEks(app, 'kong-dp-eks', {
  env: devEnv,
  emailForCertRenewal: app.node.tryGetContext('email'),
  vpc: new_vpc.vpc,
  private_ca_arn: kong_control_plane_eks.private_ca_arn,
  licese_secret_name: app.node.tryGetContext('licese_secret_name'),
  prometheus_endpoint: kong_control_plane_eks.prometheus_endpoint,
  clusterDns: app.node.tryGetContext('clusterDns'),
  telemetryDns: app.node.tryGetContext('telemetryDns'),
  hostedZoneName: app.node.tryGetContext('hostedZoneName'),
  proxyDns: app.node.tryGetContext('proxyDns'),
  clusterName: app.node.tryGetContext('dataPlaneClusterName'),
});

new KongDpEcs(app, 'kong-dp-ecs', {
  env: devEnv,
  cluster_dns: kong_control_plane_ecs.cluster_dns,
  vpc: new_vpc.vpc,
  telemetry_dns: kong_control_plane_ecs.telemetry_dns,
  private_ca_arn: kong_control_plane_ecs.private_ca_arn,
  licese_secret_name: app.node.tryGetContext('licese_secret_name'),
});

app.synth();