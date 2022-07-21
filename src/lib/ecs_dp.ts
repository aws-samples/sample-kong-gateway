
import { aws_ec2, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as KongDP from 'kong-data-plane';
import * as KongDP from 'kong-data-plane';
// import * as KongDP from '../../../kong-data-plane';

interface KongDpEcsStackProps extends StackProps {
  vpc: aws_ec2.IVpc;
  cluster_dns: string;
  telemetry_dns: string;
  private_ca_arn: string;
  licese_secret_name : string;
};

export class KongDpEcs extends Stack {
  constructor(scope: Construct, id: string, props: KongDpEcsStackProps) {
    super(scope, id, props);
    new KongDP.KongEcs(this, 'KongEcsDp', {
      clusterProps: {
        clusterName: 'kong-dp',
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
      clusterDns: props.cluster_dns,
      telemetryDns: props.telemetry_dns,
      licenseSecret: props.licese_secret_name,
    });
  }
}
