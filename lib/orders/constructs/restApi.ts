import { RestApi, Cors, Resource } from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";

type RestApiConstructProps = {
  stackName: string | undefined;
  stage: string;
};

export class RestApiConstruct extends Construct {
  public readonly ordersApi: RestApi;
  public readonly ordersRestaurantIDResource: Resource;
  public readonly orderOrderIDResource: Resource;

  constructor(scope: Construct, id: string, props: RestApiConstructProps) {
    super(scope, id);

    // orders restAPI
    this.ordersApi = new RestApi(
      scope,
      `${props.stackName}-ordersApi-${props.stage}`,
      {
        deployOptions: {
          stageName: props.stage,
          tracingEnabled: true,
        },
        defaultCorsPreflightOptions: {
          allowOrigins: Cors.ALL_ORIGINS,
        },
      }
    );
    this.ordersRestaurantIDResource =
      this.ordersApi.root.addResource(`{restaurantID}`);
    this.orderOrderIDResource =
      this.ordersRestaurantIDResource.addResource(`{orderID}`);
  }
}
