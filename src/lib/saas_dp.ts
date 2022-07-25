import { Stack, StackProps, aws_eks, aws_ec2 } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as KongDP from 'kong-data-plane';
// import * as KongDP from '../../../kong-data-plane';

interface KongSaaSDpEksStackProps extends StackProps {
  vpc: aws_ec2.IVpc;
  prometheus_endpoint?:string;
  cert_secret_name : string;
  key_secret_name : string;
  clusterDns : string;
  telemetryDns : string;
  proxyDns : string;
  hostedZoneName : string;
  clusterName : string;
  emailForCertRenewal: string;
}

export class KongSaaSDpEks extends Stack {
  constructor(scope: Construct, id: string, props: KongSaaSDpEksStackProps) {
    super(scope, id, props);

    new KongDP.KongEks(this, 'KongEksSaaSDp', {
      mtlsSecrets: {
        certSecretName: props.cert_secret_name,
        keySecretName: props.key_secret_name,
      },
      emailForCertRenewal: props.emailForCertRenewal,
      dataPlaneClusterProps: {
        clusterName: props.clusterName,
        version: aws_eks.KubernetesVersion.V1_21,
        defaultCapacity: 0,
        endpointAccess: aws_eks.EndpointAccess.PUBLIC_AND_PRIVATE,
        vpc: props.vpc,
      },
      kongTelemetryOptions: {
        createPrometheusWorkspace: true,
        // prometheusEndpoint: props.prometheus_endpoint,
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
    });

    // define resources here...
  }
}