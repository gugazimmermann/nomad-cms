import * as AWS from "aws-sdk";
import { APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";
import commonResponse from "./common/commonResponse"

const TABLE_NAME = process.env.TABLE_NAME || "";

const db = new AWS.DynamoDB.DocumentClient();

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  console.debug(`event`, JSON.stringify(event, undefined, 2));

  const restaurantID = event.pathParameters?.restaurantID;
  const menuID = event.pathParameters?.menuID;

  if (!restaurantID || !menuID)
    return commonResponse(400, "You are missing the restaurantID or menuID");

  const params = {
    TableName: TABLE_NAME,
    IndexName: "byMenuID",
    KeyConditionExpression: "restaurantID = :restaurantID and menuID = :menuID",
    ExpressionAttributeValues: {
      ":restaurantID": restaurantID,
      ":menuID": menuID,
    },
    ProjectionExpression: "#productID, #name, #image, #value",
    ExpressionAttributeNames: {
      "#productID": "productID",
      "#name": "name",
      "#image": "image",
      "#value": "value",
    },
  };
  console.debug(`params`, JSON.stringify(params, undefined, 2));
  
  try {
    const response = await db.query(params).promise();
    return commonResponse(200, JSON.stringify(response.Items));
  } catch (error) {
    console.error(`error`, JSON.stringify(error, undefined, 2));
    return commonResponse(500, JSON.stringify(error));
  }
};
