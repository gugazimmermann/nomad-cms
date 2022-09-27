import { CfnOutput } from "aws-cdk-lib";
import { RestApi, Cors, Resource } from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";

type RestApiConstructProps = {
  stackName: string | undefined;
  stage: string;
}

export class RestApiConstruct extends Construct {
  public readonly ordersRestaurantIDResource: Resource;
  public readonly orderOrderIDResource: Resource;

  constructor(scope: Construct, id: string, props: RestApiConstructProps) {
    super(scope, id);

    const ordersApi = new RestApi(scope, `${props.stackName}-ordersApi-${props.stage}`, {
      deployOptions: {
        stageName: props.stage,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS
      }
    });
    this.ordersRestaurantIDResource = ordersApi.root.addResource(`{restaurantID}`);
    this.orderOrderIDResource = this.ordersRestaurantIDResource.addResource(`{orderID}`);
    
    new CfnOutput(scope, 'OrdersApiOutput', {
      value: ordersApi.restApiName,
    });
  }
}
