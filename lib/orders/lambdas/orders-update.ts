import * as AWS from "aws-sdk";
import { APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";
import { ItemType } from "./types";
import { createResponse } from "./utils";

const TABLE_NAME = process.env.TABLE_NAME || "";

const db = new AWS.DynamoDB.DocumentClient();

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  console.debug(`event`, JSON.stringify(event, undefined, 2));

  const restaurantID = event.pathParameters?.restaurantID;
  if (!restaurantID) return createResponse(400, "You are missing the restaurantID");

  const { body } = event;
  if (!body) return createResponse(400, "You are missing the Order Item");

  let item: ItemType = JSON.parse(body);
  if (!item.restaurantID || item.restaurantID !== restaurantID) return createResponse(400, "Incorrect restaurantID");
  if (!item.menuID) return createResponse(400, "You are missing the menuID");
  if (!item.orderID) return createResponse(400, "You are missing the orderID");
  if (!item.orderNumber) return createResponse(400, "You are missing the orderNumber");
  if (!item.status) return createResponse(400, "You are missing the status");
  if (!item.orderItems || !item.orderItems.length) return createResponse(400, "You are missing the order items");
  if (!item.total) return createResponse(400, "You are missing the order total");

  const orderValue = item.orderItems.reduce((p, c) => p + (+c.value * c.quantity), 0);
  if (+item.total !== orderValue) return createResponse(400, "Order total don't match");

  const dateNow = Date.now().toString();

  const params = {
    TableName: TABLE_NAME,
    Key: {
      restaurantID: item.restaurantID,
      orderID: item.orderID,
    },
    UpdateExpression: 'set #status = :status, #orderItems = :orderItems, #total = :total, #updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ":status": item.status,
      ":orderItems": item.orderItems,
      ":total": item.total,
      ":updatedAt": dateNow
    },
    ExpressionAttributeNames:{
      "#status": "status",
      "#orderItems": "orderItems",
      "#total": "total",
      "#updatedAt": "updatedAt",
    },
    ReturnValues:"ALL_NEW"
  };
  console.debug(`params`, JSON.stringify(params, undefined, 2));

  try {
    const response = await db.update(params).promise();
    return createResponse(200, JSON.stringify(response));
  } catch (error) {
    console.error(`error`, JSON.stringify(event, undefined, 2));
    return createResponse(500, JSON.stringify(error));
  }
};
