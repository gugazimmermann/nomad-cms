import * as AWS from "aws-sdk";
import { APIGatewayProxyResult, SQSEvent } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { ORDER_STATUS } from "./enums";
import { ItemType } from "./types";
import { createResponse } from "./utils";
import { StepFunctions } from "aws-sdk";

const TABLE_NAME = process.env.TABLE_NAME || "";
const SF_ARN = process.env.paymentStepArn || "";

const db = new AWS.DynamoDB.DocumentClient();

export const handler = async (
  event: SQSEvent
): Promise<APIGatewayProxyResult> => {
  console.debug(`event`, JSON.stringify(event, undefined, 2));

  const { Records } = event;
  if (!Records || !Records.length) return createResponse(400, "No records found");
  let order: ItemType = JSON.parse(Records[0].body);
  if (!order.restaurantID) return createResponse(400, "You are missing the restaurantID");
  if (!order.menuID) return createResponse(400, "You are missing the menuID");
  if (!order.orderItems || !order.orderItems.length) return createResponse(400, "You are missing the order items");
  if (!order.total) return createResponse(400, "You are missing the order total");
   
  const orderValue = order.orderItems.reduce((p, c) => p + (+c.value * c.quantity), 0);
  if (+order.total !== orderValue) return createResponse(400, "Order total don't match");

  const queryParams = {
    TableName: TABLE_NAME,
    IndexName: 'byOrderNumber',
    KeyConditionExpression: 'restaurantID = :restaurantID',
    ExpressionAttributeValues: { ":restaurantID": order.restaurantID },
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
    console.error(`error`, JSON.stringify(error, undefined, 2));
    return createResponse(500, JSON.stringify(error));
  }

  const dateNow = Date.now().toString();

  order = {
    ...order,
    orderID: uuidv4(),
    orderNumber: nextOrderNumber + 1,
    status: ORDER_STATUS.PENDING,
    createdAt: dateNow,
    updatedAt: dateNow,
  }
  console.debug(`order`, JSON.stringify(order, undefined, 2));
  try {
    const sf = new StepFunctions();
    const teste = await sf.startExecution({
      stateMachineArn: SF_ARN,
      input: JSON.stringify(order)
    }).promise();
    return createResponse(200, JSON.stringify(order));
  } catch (error) {
    console.error(`error`, JSON.stringify(error, undefined, 2));
    return createResponse(500, JSON.stringify(error));
  }
};
