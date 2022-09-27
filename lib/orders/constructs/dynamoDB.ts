import { RemovalPolicy, CfnOutput } from "aws-cdk-lib";
import { Table, AttributeType, BillingMode, ProjectionType } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

type DynamoDBConstructProps = {
  stackName: string | undefined;
  stage: string;
}

export class DynamoDBConstruct extends Construct {
  public readonly ordersTable: Table;

  constructor(scope: Construct, id: string, props: DynamoDBConstructProps) {
    super(scope, id);

    this.ordersTable = new Table(scope, `${props.stackName}-ordersTable-${props.stage}`, {
      partitionKey: { name: 'restaurantID', type: AttributeType.STRING },
      sortKey: { name: 'orderID', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    this.ordersTable.addGlobalSecondaryIndex({
      indexName: 'byOrderNumber',
      partitionKey: { name: 'restaurantID', type: AttributeType.STRING },
      sortKey: { name: 'orderNumber', type: AttributeType.NUMBER },
      projectionType: ProjectionType.ALL,
    });

    new CfnOutput(scope, 'OrdersTableOutput', {
      value: this.ordersTable.tableName,
    });
  }
}
