import { Stack, StackProps, aws_eks, aws_rds, aws_ec2, RemovalPolicy } from 'aws-cdk-lib';
import { ClusterLoggingTypes } from 'aws-cdk-lib/aws-eks';
import { Construct } from 'constructs';
import * as KongCP from 'kong-control-plane';
// import * as KongCP from '../../../kong-control-plane';

interface KongCpEksStackProps extends StackProps {
  license_secret_name : string;
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
      licenseSecretsName: props.license_secret_name,
      emailForCertRenewal: props.emailForCertRenewal,
      controlPlaneClusterProps: {
        // DEVONLY
        // kongHelmOptions: {
        //   values: {
        //     manager: {
        //       annotations: {
        //         'service.beta.kubernetes.io/aws-load-balancer-scheme': 'internet-facing',
        //       },
        //     },
        //     admin: {
        //       annotations: {
        //         'service.beta.kubernetes.io/aws-load-balancer-scheme': 'internet-facing',
        //       },
        //     },
        //   },
        // },
        kongTelemetryOptions: {
          createPrometheusWorkspace: true,
        },
        eksClusterProps: {
          // albController: {
          //   version: aws_eks.AlbControllerVersion.of('v2.4.2'),
          // },
          clusterName: props.clusterName,
          version: aws_eks.KubernetesVersion.of('1.22'),
          defaultCapacity: 0,
          // endpointAccess: aws_eks.EndpointAccess.PUBLIC_AND_PRIVATE, // DEVONLY
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
        deletionProtection: true, // DEVONLY
        // removalPolicy: RemovalPolicy.DESTROY, // DEVONLY
        // port: 1150,
        credentials: {
          username: 'kongadmin',
        },
        vpc: props.vpc,
      },

    });

    this.control_plane = kong_control_plane.controlPlane;
    this.private_ca_arn = kong_control_plane.privateCaArn;
    this.prometheus_endpoint = kong_control_plane.prometheusEndpoint;

  }
}
