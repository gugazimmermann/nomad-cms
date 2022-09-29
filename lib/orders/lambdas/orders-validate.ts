import * as AWS from "aws-sdk";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { OrderType } from "./common/types";
import commonResponse from "./common/commonResponse";
import { ORDER_STATUS } from "./common/enums";

const TABLE_NAME = process.env.TABLE_NAME || "";
const QUEUEURL = process.env.QUEUEURL || "";

const db = new AWS.DynamoDB.DocumentClient();

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

  console.debug(`event`, JSON.stringify(order, undefined, 2));

  const orderValue = order.orderItems.reduce(
    (p, c) => p + (+c.value * +c.quantity),
    0
  );
  if (+order.total !== orderValue)
    return commonResponse(400, `Order total don't match: ${orderValue}`);


  const queryParams = {
    TableName: TABLE_NAME,
    IndexName: "byOrderNumber",
    KeyConditionExpression: "restaurantID = :restaurantID",
    ExpressionAttributeValues: { ":restaurantID": order.restaurantID },
    ProjectionExpression: "#orderNumber",
    ExpressionAttributeNames: { "#orderNumber": "orderNumber" },
    ScanIndexForward: false,
    Limit: 1,
  };

  let nextOrderNumber = 0;

  try {
    const queryResponse = await db.query(queryParams).promise();
    nextOrderNumber =
      (queryResponse?.Items &&
        queryResponse?.Items[0] &&
        queryResponse?.Items[0].orderNumber) ||
      0;
  } catch (error) {
    console.error(`error`, JSON.stringify(error, undefined, 2));
    return commonResponse(500, JSON.stringify(error));
  }

  const dateNow = Date.now().toString();

  order = {
    ...order,
    orderID: uuidv4(),
    orderNumber: nextOrderNumber + 1,
    status: ORDER_STATUS.PENDING,
    createdAt: dateNow,
    updatedAt: dateNow,
  };

  const params = {
    TableName: TABLE_NAME,
    Item: order,
  };
  console.debug(`params`, JSON.stringify(params, undefined, 2));

  try {
    await db.put(params).promise();
  } catch (error) {
    console.error(`error`, JSON.stringify(error, undefined, 2));
    return commonResponse(500, JSON.stringify(error));
  }

  try {
    var sqsParams = {
      MessageBody: JSON.stringify(order),
      QueueUrl: QUEUEURL
    };
    await new AWS.SQS().sendMessage(sqsParams).promise();
    return commonResponse(200, JSON.stringify(order));
  } catch (error) {
    console.error(`error`, JSON.stringify(error, undefined, 2));
    return commonResponse(500, JSON.stringify(error));
  }
};
