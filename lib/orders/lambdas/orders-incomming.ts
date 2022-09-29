import * as AWS from "aws-sdk";
import { APIGatewayProxyResult, SQSEvent } from "aws-lambda";
import { ORDER_STATUS } from "./common/enums";
import { OrderType } from "./common/types";
import commonResponse from "./common/commonResponse";

const SF_ARN = process.env.ordersPaymentStepArn || "";
const TABLE_NAME = process.env.TABLE_NAME || "";

const db = new AWS.DynamoDB.DocumentClient();

export const handler = async (
  event: SQSEvent
): Promise<APIGatewayProxyResult> => {
  console.debug(`event`, JSON.stringify(event, undefined, 2));

  const { Records } = event;
  if (!Records || !Records.length)
    return commonResponse(400, "No records found");
  let order: OrderType = JSON.parse(Records[0].body);

  const dateNow = Date.now().toString();

  order = {
    ...order,
    status: ORDER_STATUS.PROCESSING,
    updatedAt: dateNow,
  };

  const params = {
    TableName: TABLE_NAME,
    Key: {
      restaurantID: order.restaurantID,
      orderID: order.orderID,
    },
    UpdateExpression:
      "set #status = :status, #updatedAt = :updatedAt",
    ExpressionAttributeValues: {
      ":status": order.status,
      ":updatedAt": order.updatedAt,
    },
    ExpressionAttributeNames: {
      "#status": "status",
      "#updatedAt": "updatedAt",
    },
    ReturnValues: "ALL_NEW",
  };
  console.debug(`params`, JSON.stringify(params, undefined, 2));

  try {
    await db.update(params).promise();
  } catch (error) {
    console.error(`error`, JSON.stringify(error, undefined, 2));
    return commonResponse(500, JSON.stringify(error));
  }

  try {
    await new AWS.StepFunctions()
      .startExecution({
        stateMachineArn: SF_ARN,
        input: JSON.stringify(order),
      })
      .promise();
    return commonResponse(200, JSON.stringify(order));
  } catch (error) {
    console.error(`error`, JSON.stringify(error, undefined, 2));
    return commonResponse(500, JSON.stringify(error));
  }
};
