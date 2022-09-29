import { RemovalPolicy, Duration } from "aws-cdk-lib";
import { BlockPublicAccess, Bucket, StorageClass } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

type s3ConstructProps = {
  stackName: string | undefined;
  stage: string;
};

export class s3Construct extends Construct {
  public readonly ordersLogsBucket: Bucket;

  constructor(scope: Construct, id: string, props: s3ConstructProps) {
    super(scope, id);

    // bucket to store the order's logs
    this.ordersLogsBucket = new Bucket(
      scope,
      `${props.stackName}-ordersLogsBucket-${props.stage}`,
      {
        versioned: false,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        autoDeleteObjects: true,
        removalPolicy: RemovalPolicy.DESTROY,
        lifecycleRules: [
          {
            expiration: Duration.days(120),
            transitions: [
              {
                storageClass: StorageClass.INFREQUENT_ACCESS,
                transitionAfter: Duration.days(30),
              },
              {
                storageClass: StorageClass.GLACIER,
                transitionAfter: Duration.days(60),
              },
            ],
          },
        ],
      }
    );
  }
}
