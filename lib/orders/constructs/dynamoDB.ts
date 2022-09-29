import { RemovalPolicy } from "aws-cdk-lib";
import {
  Table,
  AttributeType,
  BillingMode,
  ProjectionType,
  StreamViewType,
} from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

type DynamoDBConstructProps = {
  stackName: string | undefined;
  stage: string;
};

export class DynamoDBConstruct extends Construct {
  public readonly ordersTable: Table;
  public readonly ordersConnTable: Table;

  constructor(scope: Construct, id: string, props: DynamoDBConstructProps) {
    super(scope, id);

    // orders table weith streaming
    this.ordersTable = new Table(
      scope,
      `${props.stackName}-ordersTable-${props.stage}`,
      {
        partitionKey: { name: "restaurantID", type: AttributeType.STRING },
        sortKey: { name: "orderID", type: AttributeType.STRING },
        stream: StreamViewType.NEW_IMAGE,
        billingMode: BillingMode.PAY_PER_REQUEST,
        removalPolicy: RemovalPolicy.DESTROY,
      }
    );
    this.ordersTable.addGlobalSecondaryIndex({
      indexName: "byOrderNumber",
      partitionKey: { name: "restaurantID", type: AttributeType.STRING },
      sortKey: { name: "orderNumber", type: AttributeType.NUMBER },
      projectionType: ProjectionType.ALL,
    });

    // orders connection websocket table
    this.ordersConnTable = new Table(
      this,
      `${props.stackName}-ordersConnTable-${props.stage}`,
      {
        partitionKey: { name: "connectionId", type: AttributeType.STRING },
        billingMode: BillingMode.PAY_PER_REQUEST,
        removalPolicy: RemovalPolicy.DESTROY,
      }
    );
  }
}
