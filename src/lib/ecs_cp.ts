import { Stack, StackProps, aws_ecs, aws_rds, aws_ec2, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as KongCP from 'kong-control-plane';
//import * as KongCP from '../../../kong-control-plane';


interface KongCpEcsStackProps extends StackProps {
  license_secret_name : string;
  vpc: aws_ec2.IVpc;
  adminDns : string;
  clusterDns : string;
  telemetryDns : string;
  managerDns : string;
  hostedZoneName : string;
  clusterName: string;

}
export class KongCpEcs extends Stack {

  public readonly control_plane: aws_ecs.Cluster;
  public readonly private_ca_arn : string;
  public readonly telemetry_dns : string;
  public readonly cluster_dns : string;

  constructor(scope: Construct, id: string, props: KongCpEcsStackProps ) {
    super(scope, id, props);

    const kong_control_plane = new KongCP.KongEcs(this, 'KongEcsCp', {

      clusterProps: {
        clusterName: props.clusterName,
        containerInsights: true,
        vpc: props.vpc,
      },
      rdsProps: {
        engine: aws_rds.DatabaseInstanceEngine.postgres({
          version: aws_rds.PostgresEngineVersion.VER_12_7,
        }),
        instanceType: aws_ec2.InstanceType.of(
          aws_ec2.InstanceClass.M4,
          aws_ec2.InstanceSize.LARGE,
        ),
        databaseName: 'kong',
        // deletionProtection: false, // DEVONLY
        removalPolicy: RemovalPolicy.RETAIN, // DEVONLY
        // port: 1150,
        credentials: {
          username: 'kong',
        },
        vpc: props.vpc,
      },

      kongTaskProps: {
        cpu: 1024,
        memoryLimitMiB: 2048,
      },
      kongFeaturesProps: {
        kongBootstrapMigration: true,
        adminProps: {
          enableHttp: true,
        },
        kongManagerProps: {
          enabled: true,
          enableHttp: true,
        },
        devPortalProps: {
          enabled: true,
        },
        clusterProps: {
          enabled: true,
        },
        clusterTelemetryProps: {
          enabled: true,
        },
      },
      dnsProps: {
        adminDns: props.adminDns,
        managerDns: props.managerDns,
        hostedZoneName: props.hostedZoneName,
        telemetryDns: props.telemetryDns,
        clusterDns: props.clusterDns,
      },
      internetFacing: false,
      licenseSecret: props.license_secret_name,
      desiredCount: 1,
    });

    this.control_plane = kong_control_plane.controlPlane;
    this.private_ca_arn = kong_control_plane.privateCaArn;
    this.telemetry_dns = kong_control_plane.telemetryDns;
    this.cluster_dns = kong_control_plane.clusterDns;
    // define resources here...
  }
}


