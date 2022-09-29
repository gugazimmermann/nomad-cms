import * as AWS from "aws-sdk";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { OrderType } from "./common/types";
import commonResponse from "./common/commonResponse";

const QUEUEURL = process.env.QUEUEURL || "";

export const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  console.debug(`event`, JSON.stringify(event, undefined, 2));

  const restaurantID = event.pathParameters?.restaurantID;
  if (!restaurantID) return commonResponse(400, "You are missing the restaurantID");

  const { body } = event;
  if (!body) return commonResponse(400, "You are missing the Order Item");

  let order: OrderType = JSON.parse(body);
  if (!order.restaurantID)
    return commonResponse(400, "You are missing the restaurantID");
  if (!order.menuID) return commonResponse(400, "You are missing the menuID");
  if (!order.orderItems || !order.orderItems.length)
    return commonResponse(400, "You are missing the order items");
  if (!order.total)
    return commonResponse(400, "You are missing the order total");

  const orderValue = order.orderItems.reduce(
    (p, c) => p + +c.value * c.quantity,
    0
  );
  if (+order.total !== orderValue)
    return commonResponse(400, "Order total don't match");

  console.debug(`order`, JSON.stringify(order, undefined, 2));
  try {
    var params = {
     MessageBody: JSON.stringify(order),
     QueueUrl: QUEUEURL
   };
    await new AWS.SQS().sendMessage(params).promise();
    return commonResponse(200, JSON.stringify(order));
  } catch (error) {
    console.error(`error`, JSON.stringify(error, undefined, 2));
    return commonResponse(500, JSON.stringify(error));
  }
};
