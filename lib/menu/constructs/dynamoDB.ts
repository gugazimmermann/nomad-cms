import { RemovalPolicy } from "aws-cdk-lib";
import {
  Table,
  AttributeType,
  BillingMode,
  ProjectionType,
} from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

type DynamoDBConstructProps = {
  stackName: string | undefined;
  stage: string;
};

export class DynamoDBConstruct extends Construct {
  public readonly menuTable: Table;

  constructor(scope: Construct, id: string, props: DynamoDBConstructProps) {
    super(scope, id);

    this.menuTable = new Table(
      scope,
      `${props.stackName}-menuTable-${props.stage}`,
      {
        partitionKey: { name: "id", type: AttributeType.STRING },
        sortKey: { name: "restaurantID", type: AttributeType.STRING },
        billingMode: BillingMode.PAY_PER_REQUEST,
        removalPolicy: RemovalPolicy.DESTROY,
      }
    );
    this.menuTable.addGlobalSecondaryIndex({
      indexName: "byMenuID",
      partitionKey: { name: "menuID", type: AttributeType.STRING },
      sortKey: { name: "restaurantID", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });
  }
}
