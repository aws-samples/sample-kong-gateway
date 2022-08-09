import { aws_ec2, Stack, StackProps } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as KongDP from 'kong-data-plane';
//import * as KongDP from '../../../kong-data-plane';

interface KongDpEcsStackProps extends StackProps {
  vpc: aws_ec2.IVpc;
  proxyDns : string;
  clusterDns : string;
  telemetryDns : string;
  hostedZoneName : string;
  private_ca_arn: string;
  license_secret_name : string;
  clusterName: string;
  policyStatements: PolicyStatement[];
};

export class KongDpEcs extends Stack {
  constructor(scope: Construct, id: string, props: KongDpEcsStackProps) {
    super(scope, id, props);
    new KongDP.KongEcs(this, 'KongEcsDp', {
      clusterProps: {
        clusterName: props.clusterName,
        vpc: props.vpc,
        containerInsights: true,
      },
      kongTaskProps: {
        cpu: 1024,
        memoryLimitMiB: 2048,
      },
      desiredCount: 1,
      internetFacing: true,
      privateCaArn: props.private_ca_arn,
      dnsProps: {
        proxyDns: props.proxyDns,
        hostedZoneName: props.hostedZoneName,
        clusterDns: props.clusterDns,
        telemetryDns: props.telemetryDns,
      },
      proxyProps: {
        enableHttp: true,
        httpsPort: 8443,
        httpPort: 8000,
      },
      licenseSecret: props.license_secret_name,
      policyStatements: props.policyStatements,
    });
  }
}
