import { Stack, StackProps, aws_eks, aws_rds, aws_ec2, RemovalPolicy } from 'aws-cdk-lib';
import { ClusterLoggingTypes } from 'aws-cdk-lib/aws-eks';
import { Construct } from 'constructs';
// import * as KongCP from 'kong-control-plane';
import * as KongCP from 'kong-control-plane';
// import * as KongCP from '../../../kong-control-plane';

// import { ec2 } from 'cdk-nag/lib/rules';

interface KongCpEksStackProps extends StackProps {
  licese_secret_name : string;
  vpc: aws_ec2.IVpc;
  adminDns : string;
  clusterDns : string;
  telemetryDns : string;
  managerDns : string;
  hostedZoneName : string;
  clusterName: string;
  emailForCertRenewal: string;
}

export class KongCpEks extends Stack {

  public readonly control_plane: aws_eks.Cluster;
  public readonly private_ca_arn : string;
  // public readonly telemetry_dns : string;
  // public readonly cluster_dns : string;
  public readonly prometheus_endpoint : string | undefined;

  constructor(scope: Construct, id: string, props: KongCpEksStackProps ) {
    super(scope, id, props);

    const kong_control_plane = new KongCP.KongEks(this, 'KongEksCp', {
      dnsProps: {
        adminDns: props.adminDns,
        clusterDns: props.clusterDns,
        hostedZoneName: props.hostedZoneName,
        managerDns: props.managerDns,
        telemetryDns: props.telemetryDns,
      },
      namespace: 'kong',
      licenseSecretsName: props.licese_secret_name,
      emailForCertRenewal: props.emailForCertRenewal,
      controlPlaneClusterProps: {
        // DEVONLY
        kongHelmOptions: {
          values: {
            manager: {
              annotations: {
                'service.beta.kubernetes.io/aws-load-balancer-scheme': 'internet-facing',
              },
            },
            admin: {
              annotations: {
                'service.beta.kubernetes.io/aws-load-balancer-scheme': 'internet-facing',
              },
            },
          },
        },
        kongTelemetryOptions: {
          createPrometheusWorkspace: true,
        },
        eksClusterProps: {
          // albController: {
          //   version: aws_eks.AlbControllerVersion.of('v2.4.2'),
          // },
          clusterName: props.clusterName,
          version: aws_eks.KubernetesVersion.V1_21,
          defaultCapacity: 0,
          endpointAccess: aws_eks.EndpointAccess.PRIVATE, // DEVONLY
          vpc: props.vpc,
          clusterLogging: [
            ClusterLoggingTypes.AUDIT,
            ClusterLoggingTypes.API,
            ClusterLoggingTypes.AUTHENTICATOR,
            ClusterLoggingTypes.CONTROLLER_MANAGER,
            ClusterLoggingTypes.SCHEDULER,
          ],
        },
      },
      controlPlaneNodeProps: {
        amiType: aws_eks.NodegroupAmiType.AL2_X86_64,
        instanceTypes: [aws_ec2.InstanceType.of(aws_ec2.InstanceClass.T3, aws_ec2.InstanceSize.LARGE)],
        minSize: 2,
      },
      rdsProps: {
        engine: aws_rds.DatabaseInstanceEngine.postgres({
          version: aws_rds.PostgresEngineVersion.VER_12_7,
        }),
        instanceType: aws_ec2.InstanceType.of(
          aws_ec2.InstanceClass.M4,
          aws_ec2.InstanceSize.LARGE,
        ),
        databaseName: 'kongdb',
        // deletionProtection: true, // DEVONLY
        removalPolicy: RemovalPolicy.RETAIN, // DEVONLY
        // port: 1150,
        credentials: {
          username: 'kongadmin',
        },
        vpc: props.vpc,
      },

    });

    this.control_plane = kong_control_plane.controlPlane;
    this.private_ca_arn = kong_control_plane.privateCaArn;
    // this.telemetry_dns = kong_control_plane.telemetryDns;
    // this.cluster_dns = kong_control_plane.clusterDns;
    this.prometheus_endpoint = kong_control_plane.prometheusEndpoint;
    // define resources here...

    // NagSuppressions.addResourceSuppressions(this, [
    //   {
    //     id: 'AwsSolutions-SMG4',
    //     reason: 'Its a customer choice and disrupts application flow if rotated automatically, causing outage.',
    //   },
    // ], true);

    // NagSuppressions.addResourceSuppressions(this, [
    //   {
    //     id: 'AwsSolutions-L1',
    //     reason: 'Runtime is latest already and this is a false alarm',
    //   },
    // ], true);

    // NagSuppressions.addResourceSuppressions(this, [
    //   {
    //     id: 'AwsSolutions-IAM4',
    //     reason: 'This is recommended by AWS and finer grained access control is not feasible',
    //     appliesTo: [
    //       'Policy::arn:<AWS::Partition>:iam::aws:policy/AmazonEKSClusterPolicy',
    //       'Policy::arn:<AWS::Partition>:iam::aws:policy/AmazonEKSWorkerNodePolicy',
    //       'Policy::arn:<AWS::Partition>:iam::aws:policy/AmazonEKS_CNI_Policy',
    //       'Policy::arn:<AWS::Partition>:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly',
    //       'Policy::arn:<AWS::Partition>:iam::aws:policy/AmazonSSMManagedInstanceCore',
    //       'Policy::arn:<AWS::Partition>:iam::aws:policy/AmazonEKSWorkerNodePolicy',
    //       'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
    //       'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole',
    //       'Policy::arn:<AWS::Partition>:iam::aws:policy/CloudWatchAgentServerPolicy',
    //       'Policy::arn:<AWS::Partition>:iam::aws:policy/AWSXrayWriteOnlyAccess',
    //       'Policy::arn:<AWS::Partition>:iam::aws:policy/AmazonPrometheusRemoteWriteAccess',
    //     ],
    //   },
    // ], true);

    // NagSuppressions.addResourceSuppressionsByPath(this,
    //   '/kong-cp-eks/@aws-cdk--aws-eks.KubectlProvider/Provider/framework-onEvent/ServiceRole/DefaultPolicy/Resource',
    //   [{ id: 'AwsSolutions-IAM5', reason: 'Provided by AWS with CDK Framework, cannot be modified' }], true,
    // );
    // NagSuppressions.addResourceSuppressionsByPath(this,
    //   '/kong-cp-eks/@aws-cdk--aws-eks.ClusterResourceProvider/Provider/waiter-state-machine/Role/DefaultPolicy/Resource',
    //   [{ id: 'AwsSolutions-IAM5', reason: 'Provided by AWS with CDK Framework, cannot be modified' }], true,
    // );
    // NagSuppressions.addResourceSuppressionsByPath(this,
    //   '/kong-cp-eks/@aws-cdk--aws-eks.ClusterResourceProvider/Provider/waiter-state-machine/Role/DefaultPolicy/Resource',
    //   [{ id: 'AwsSolutions-IAM5', reason: 'Provided by AWS with CDK Framework, cannot be modified' }], true,
    // );
    // NagSuppressions.addResourceSuppressionsByPath(this,
    //   '/kong-cp-eks/@aws-cdk--aws-eks.ClusterResourceProvider/Provider/framework-onTimeout/ServiceRole/DefaultPolicy/Resource',
    //   [{ id: 'AwsSolutions-IAM5', reason: 'Provided by AWS with CDK Framework, cannot be modified' }], true,
    // );
    // NagSuppressions.addResourceSuppressionsByPath(this,
    //   '/kong-cp-eks/@aws-cdk--aws-eks.ClusterResourceProvider/Provider/framework-onTimeout/ServiceRole/DefaultPolicy/Resource',
    //   [{ id: 'AwsSolutions-IAM5', reason: 'Provided by AWS with CDK Framework, cannot be modified' }], true,
    // );
    // NagSuppressions.addResourceSuppressionsByPath(this,
    //   '/kong-cp-eks/@aws-cdk--aws-eks.ClusterResourceProvider/Provider/framework-onEvent/ServiceRole/DefaultPolicy/Resource',
    //   [{ id: 'AwsSolutions-IAM5', reason: 'Provided by AWS with CDK Framework, cannot be modified' }], true,
    // );
    // NagSuppressions.addResourceSuppressionsByPath(this,
    //   '/kong-cp-eks/@aws-cdk--aws-eks.ClusterResourceProvider/Provider/framework-onEvent/ServiceRole/DefaultPolicy/Resource',
    //   [{ id: 'AwsSolutions-IAM5', reason: 'Provided by AWS with CDK Framework, cannot be modified' }], true,
    // );
    // NagSuppressions.addResourceSuppressionsByPath(this,
    //   '/kong-cp-eks/@aws-cdk--aws-eks.ClusterResourceProvider/Provider/framework-isComplete/ServiceRole/DefaultPolicy/Resource',
    //   [{ id: 'AwsSolutions-IAM5', reason: 'Provided by AWS with CDK Framework, cannot be modified' }], true,
    // ),
    // NagSuppressions.addResourceSuppressions(this,
    //   [{
    //     id: 'AwsSolutions-IAM5',
    //     reason: 'Only * is possible on ListHostedZone',
    //     appliesTo: [
    //       'route53:ListHostedZones',
    //     ],
    //   }], true,
    // );

  }
}
