import * as AWS from "aws-sdk";
import { APIGatewayProxyResult, SQSEvent } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { ORDER_STATUS } from "./common/enums";
import { OrderType } from "./common/types";
import commonResponse from "./common/commonResponse";

const SF_ARN = process.env.ordersPaymentStepArn || "";

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
    orderID: uuidv4(),
    status: ORDER_STATUS.PENDING,
    createdAt: dateNow,
    updatedAt: dateNow,
  };
  console.debug(`order`, JSON.stringify(order, undefined, 2));
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
