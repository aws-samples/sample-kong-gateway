import { Stack, aws_ec2 } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class Vpc extends Stack {

  public vpc : aws_ec2.Vpc;

  constructor(scope: Construct, id: string, props:{} ) {
    super(scope, id, props);
    this.vpc = new aws_ec2.Vpc(this, 'kong-vpc', {
      maxAzs: 2,
      vpcName: 'kong-vpc',
      subnetConfiguration: [
        {
          name: 'Private-',
          subnetType: aws_ec2.SubnetType.PRIVATE_WITH_NAT,
          cidrMask: 24,

        },
        {
          name: 'Public-',
          subnetType: aws_ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });
    this.vpc.addFlowLog('VpcFlowLog');

    // if (props.controlPlaneClusterName) {
    //   for (const subnet of this.vpc.privateSubnets) {
    //     Tags.of(subnet).add(
    //       `kubernetes.io/cluster/${props.controlPlaneClusterName}`,
    //       'owned',
    //     );
    //     // Tags.of(subnet).add(
    //     //   'karpenter.sh/discovery',
    //     //   'owned',
    //     // );
    //   };
    // };

    // if (props.dataPlaneClusterName) {
    //   for (const subnet of this.vpc.privateSubnets) {
    //     Tags.of(subnet).add(
    //       `kubernetes.io/cluster/${props.dataPlaneClusterName}`,
    //       '',
    //     );
    //   };
    // }

    // const tagAllSubnets = (
    //   subnets: aws_ec2.ISubnet[],
    //   tagName: string,
    //   tagValue: string,
    // ) => {
    //   for (const subnet of subnets) {
    //     Tags.of(subnet).add(
    //       tagName,
    //       tagValue,
    //     );
    //   }
    // };

    // tagAllSubnets(this.vpc.privateSubnets, 'kubernetes.io/role/internal-elb', '1');
    // tagAllSubnets(this.vpc.privateSubnets, 'kubernetes.io/role/elb', '1');


  }
}