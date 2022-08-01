import { Stack, StackProps, aws_eks, aws_ec2 } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as KongDP from 'kong-data-plane';
// import * as KongDP from '../../../kong-data-plane';

interface KongDpEksStackProps extends StackProps {
  vpc: aws_ec2.IVpc;
  // cluster_dns: String;
  private_ca_arn: string;
  prometheus_endpoint?:string;
  license_secret_name : string;
  clusterDns : string;
  telemetryDns : string;
  proxyDns : string;
  hostedZoneName : string;
  clusterName : string;
  emailForCertRenewal: string;

}

export class KongDpEks extends Stack {
  constructor(scope: Construct, id: string, props: KongDpEksStackProps) {
    super(scope, id, props);

    new KongDP.KongEks(this, 'KongEksDp', {
      licenseSecretsName: props.license_secret_name,
      emailForCertRenewal: props.emailForCertRenewal,
      dataPlaneClusterProps: {
        clusterName: props.clusterName,
        version: aws_eks.KubernetesVersion.V1_21,
        defaultCapacity: 0,
        endpointAccess: aws_eks.EndpointAccess.PRIVATE, // DEVONLY,
        vpc: props.vpc,
      },
      kongTelemetryOptions: {
        createPrometheusWorkspace: false,
        prometheusEndpoint: props.prometheus_endpoint,
      },
      dataPlaneNodeProps: {
        amiType: aws_eks.NodegroupAmiType.AL2_X86_64,
        instanceTypes: [aws_ec2.InstanceType.of(aws_ec2.InstanceClass.T3, aws_ec2.InstanceSize.LARGE)],
        minSize: 2,
      },
      dnsProps: {
        clusterDns: props.clusterDns,
        hostedZoneName: props.hostedZoneName,
        proxyDns: props.proxyDns,
        telemetryDns: props.telemetryDns,

      },
      privateCaArn: props.private_ca_arn,

    });

    // define resources here...
  }
}