import { App } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { KongCpEcs } from './lib/ecs_cp';
import { KongDpEcs } from './lib/ecs_dp';
import { KongCpEks } from './lib/eks_cp';
import { KongDpEks } from './lib/eks_dp';
import { KongSaaSDpEks } from './lib/saas_dp';
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
});

const konglambdaPluginStatement = new PolicyStatement({
  resources: [
    'arn:aws:lambda:'+devEnv.region+':'+devEnv.account+':function:*',
  ],
  actions: [
    'lambda:InvokeFunction',
  ],

});


new KongSaaSDpEks(app, 'konnect-dp-default', {
  env: devEnv,
  emailForCertRenewal: app.node.tryGetContext('konnect').email,
  vpc: new_vpc.vpc,
  cert_secret_name: app.node.tryGetContext('konnect').cert_secret_name,
  key_secret_name: app.node.tryGetContext('konnect').key_secret_name,
  // prometheus_endpoint: kong_control_plane_eks.prometheus_endpoint,
  clusterDns: app.node.tryGetContext('konnect').clusterDns,
  telemetryDns: app.node.tryGetContext('konnect').telemetryDns,
  hostedZoneName: app.node.tryGetContext('konnect').hostedZoneName,
  proxyDns: app.node.tryGetContext('konnect').proxyDns,
  clusterName: app.node.tryGetContext('konnect').dataPlaneClusterName,
  policyStatements: [konglambdaPluginStatement],
});


const kong_control_plane_eks = new KongCpEks(app, 'kong-cp-eks', {
  env: devEnv,
  emailForCertRenewal: app.node.tryGetContext('self-hosted').email,
  license_secret_name: app.node.tryGetContext('self-hosted').license_secret_name,
  vpc: new_vpc.vpc,
  adminDns: app.node.tryGetContext('self-hosted').adminDns,
  clusterDns: app.node.tryGetContext('self-hosted').clusterDns,
  hostedZoneName: app.node.tryGetContext('self-hosted').hostedZoneName,
  managerDns: app.node.tryGetContext('self-hosted').managerDns,
  telemetryDns: app.node.tryGetContext('self-hosted').telemetryDns,
  clusterName: app.node.tryGetContext('self-hosted').controlPlaneClusterName,
});

const kong_control_plane_ecs = new KongCpEcs(app, 'kong-cp-ecs', {
  env: devEnv,
  vpc: new_vpc.vpc,
  license_secret_name: app.node.tryGetContext('self-hosted').license_secret_name,
  adminDns: app.node.tryGetContext('self-hosted').adminDns,
  clusterDns: app.node.tryGetContext('self-hosted').clusterDns,
  hostedZoneName: app.node.tryGetContext('self-hosted').hostedZoneName,
  managerDns: app.node.tryGetContext('self-hosted').managerDns,
  telemetryDns: app.node.tryGetContext('self-hosted').telemetryDns,
  clusterName: app.node.tryGetContext('self-hosted').controlPlaneClusterName,
});

new KongDpEcs(app, 'kong-dp-ecs-with-eks-cp', {
  env: devEnv,
  vpc: new_vpc.vpc,
  private_ca_arn: kong_control_plane_eks.private_ca_arn,
  clusterDns: app.node.tryGetContext('self-hosted').clusterDns,
  telemetryDns: app.node.tryGetContext('self-hosted').telemetryDns,
  hostedZoneName: app.node.tryGetContext('self-hosted').hostedZoneName,
  proxyDns: app.node.tryGetContext('self-hosted').proxyDns,
  clusterName: app.node.tryGetContext('self-hosted').dataPlaneClusterName,
  license_secret_name: app.node.tryGetContext('self-hosted').license_secret_name,
  policyStatements: [konglambdaPluginStatement],
});

new KongDpEks(app, 'kong-dp-eks', {
  env: devEnv,
  emailForCertRenewal: app.node.tryGetContext('self-hosted').email,
  vpc: new_vpc.vpc,
  private_ca_arn: kong_control_plane_eks.private_ca_arn,
  license_secret_name: app.node.tryGetContext('self-hosted').license_secret_name,
  prometheus_endpoint: kong_control_plane_eks.prometheus_endpoint,
  clusterDns: app.node.tryGetContext('self-hosted').clusterDns,
  telemetryDns: app.node.tryGetContext('self-hosted').telemetryDns,
  hostedZoneName: app.node.tryGetContext('self-hosted').hostedZoneName,
  proxyDns: app.node.tryGetContext('self-hosted').proxyDns,
  clusterName: app.node.tryGetContext('self-hosted').dataPlaneClusterName,
  policyStatements: [konglambdaPluginStatement],
});

new KongDpEcs(app, 'kong-dp-ecs', {
  env: devEnv,
  vpc: new_vpc.vpc,
  private_ca_arn: kong_control_plane_ecs.private_ca_arn,
  clusterDns: kong_control_plane_ecs.cluster_dns,
  telemetryDns: kong_control_plane_ecs.telemetry_dns,
  hostedZoneName: app.node.tryGetContext('self-hosted').hostedZoneName,
  proxyDns: app.node.tryGetContext('self-hosted').proxyDns,
  clusterName: app.node.tryGetContext('self-hosted').dataPlaneClusterName,
  license_secret_name: app.node.tryGetContext('self-hosted').license_secret_name,
  policyStatements: [konglambdaPluginStatement],
});

app.synth();
