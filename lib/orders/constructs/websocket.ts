import { WebSocketApi, WebSocketStage } from "@aws-cdk/aws-apigatewayv2-alpha";
import { WebSocketLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

type WebsocketConstructProps = {
  ordersWebsocketConnect: NodejsFunction;
  ordersWebsocketDisconnect: NodejsFunction;
  stackName: string | undefined;
  stage: string;
};

export class WebsocketConstruct extends Construct {
  public readonly ordersWebsocket: WebSocketApi;

  constructor(scope: Construct, id: string, props: WebsocketConstructProps) {
    super(scope, id);

    // websocket for tracking orders through the kitchen and restaurant
    this.ordersWebsocket = new WebSocketApi(
      this,
      `${props.stackName}-ordersWebsocket-${props.stage}`,
      {
        connectRouteOptions: {
          integration: new WebSocketLambdaIntegration(
            "ConnectIntegration",
            props.ordersWebsocketConnect
          ),
        },
        disconnectRouteOptions: {
          integration: new WebSocketLambdaIntegration(
            "DisconnectIntegration",
            props.ordersWebsocketDisconnect
          ),
        },
      }
    );

    new WebSocketStage(
      this,
      `${props.stackName}-websocketStage-${props.stage}`,
      {
        webSocketApi: this.ordersWebsocket,
        stageName: props.stage,
        autoDeploy: true,
      }
    );
  }
}
