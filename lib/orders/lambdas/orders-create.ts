import * as AWS from "aws-sdk";
import { APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";
import { v4 as uuidv4 } from 'uuid';
import { ORDER_STATUS } from "./enums";
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
  if (!item.orderItems || !item.orderItems.length) return createResponse(400, "You are missing the order items");
  if (!item.total) return createResponse(400, "You are missing the order total");

  const orderValue = item.orderItems.reduce((p, c) => p + (+c.value * c.quantity), 0);
  if (+item.total !== orderValue) return createResponse(400, "Order total don't match");

  const queryParams = {
    TableName: TABLE_NAME,
    IndexName: 'byOrderNumber',
    KeyConditionExpression: 'restaurantID = :restaurantID',
    ExpressionAttributeValues: { ":restaurantID": restaurantID },
    ProjectionExpression: "#orderNumber",
    ExpressionAttributeNames: { "#orderNumber": "orderNumber" },
    ScanIndexForward: false,
    Limit: 1,
  };

  let nextOrderNumber = 0;

  try {
    const queryResponse = await db.query(queryParams).promise();
    nextOrderNumber = (queryResponse?.Items && queryResponse?.Items[0] && queryResponse?.Items[0].orderNumber) || 0
  } catch (error) {
    return createResponse(500, JSON.stringify(error));
  }

  const dateNow = Date.now().toString();

  item = {
    ...item,
    orderID: uuidv4(),
    orderNumber: nextOrderNumber + 1,
    status: ORDER_STATUS.WAITING,
    createdAt: dateNow,
    updatedAt: dateNow,
  }

  const params = {
    TableName: TABLE_NAME,
    Item: item
  };
  console.debug(`params`, JSON.stringify(params, undefined, 2));

  try {
    await db.put(params).promise();
    return createResponse(201, JSON.stringify(item));
  } catch (error) {
    return createResponse(500, JSON.stringify(error));
  }
};
