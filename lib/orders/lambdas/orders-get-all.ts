import * as AWS from "aws-sdk";
import { APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";
import { createResponse } from "./utils";

const TABLE_NAME = process.env.TABLE_NAME || "";

const db = new AWS.DynamoDB.DocumentClient();

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  console.debug(`event`, JSON.stringify(event, undefined, 2));

  const restaurantID = event.pathParameters?.restaurantID;
  if (!restaurantID) return createResponse(400, "You are missing the restaurantID");

  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'restaurantID = :restaurantID',
    ExpressionAttributeValues: { ":restaurantID": restaurantID },
    ProjectionExpression: "#orderID, #orderItems, #status, #orderNumber, #total",
    ExpressionAttributeNames: { "#orderID": "orderID", "#orderItems": "orderItems", "#status": "status", "#orderNumber": "orderNumber", "#total": "total", },
  };
  console.debug(`params`, JSON.stringify(params, undefined, 2));

  try {
    const response = await db.query(params).promise();
    return createResponse(200, JSON.stringify(response.Items));
  } catch (error) {
    return createResponse(500, JSON.stringify(error));
  }
};
