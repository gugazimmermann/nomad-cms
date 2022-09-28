import AWS = require('aws-sdk');
import { ORDER_STATUS } from './enums';
import { ItemType } from './types';
import { createResponse } from './utils';

const TABLE_NAME = process.env.TABLE_NAME || "";

const db = new AWS.DynamoDB.DocumentClient();

export const handler = async (event: { body: ItemType}) => {
  console.debug(`event`, JSON.stringify(event, undefined, 2));

  const order = event.body;

  order.status = ORDER_STATUS.WAITING;

    const params = {
    TableName: TABLE_NAME,
    Item: order
  };
  console.debug(`params`, JSON.stringify(params, undefined, 2));
  
  try {
    await db.put(params).promise();
    return createResponse(200, JSON.stringify(order));
  } catch (error) {
    console.error(`error`, JSON.stringify(event, undefined, 2));
    return createResponse(500, JSON.stringify(error));
  }
};
