import { createSchema, createYoga } from 'graphql-yoga';
import { Web3Provider, JsonRpcProvider } from "@ethersproject/providers";
import { Contract } from "@ethersproject/contracts";
import LitJsSdk from "lit-js-sdk/build/index.node.js";
import { v4 as uuidv4 } from 'uuid';
import prisma from "../../prisma";

const provider = new JsonRpcProvider(process.env.NEXT_PUBLIC_MAINNET_RPC_URL); // or Web3Provider;

console.log("provider", provider);

// listen to block events

provider.on("block", async (blockNumber) => {
  console.log("new block", blockNumber);
  // get if block event is registered in database
  const actions = await prisma.action.findMany({
    where: {
      when: {
        equals: { blockNumber }
      }
    }
  });
  console.log("actions", actions);
  if (actions.length > 0) {
    for (const action of actions) {
      // call lit actions here
      const { code, authSignature, jsParams, eventType } = action;
      const litNodeClient = new LitJsSdk.LitNodeClient({
        alertWhenUnauthorized: false,
        litNetwork: "serrano",
        debug: true,
      });
      await litNodeClient.connect();
      const results = await litNodeClient.executeJs({
        code,
        authSig: authSignature,
        jsParams
      });
      console.log('action run successfully:', action, results);
    }
  }
});

const typeDefs = /* GraphQL */`
  scalar Json
  scalar Date

  type Query {
    hello(name: String): String!
  }

  type Mutation {
    createAction(data: createActionInput!): Json
  }

  enum EventType {
    BLOCK
    CONTRACT
    WEBHOOK
  }

  input createActionWhenInput {
    blockNumber: Int
    contractAddress: String
    contractABI: Json
    contractEventName: String
  }

  input createActionInput {
    name: String!
    code: String!
    authSignature: Json!
    jsParams: Json!
    when: createActionWhenInput!
    eventType: EventType!
    chainId: Int
    createdBy: String!
  }
`;

const resolvers = {
  Query: {
    hello: () => 'Hello GraphQL',
  },
  Mutation: {
    createAction: async (parent, { data }, context, info) => {
      const { code, authSignature, jsParams, when, eventType } = data;
      const actionId = uuidv4();
      if (eventType === 'BLOCK') {
        // blockNumber is required
        const { blockNumber } = when;
        if (!blockNumber) {
          throw new Error('blockNumber is required for block event');
        }
      } else if (eventType === 'CONTRACT') {
        // contractAddress, contractABI, contractEventName are required
        const { contractAddress, contractABI, contractEventName } = when;
        if (!contractAddress || !contractABI || !contractEventName) {
          throw new Error('contractAddress, contractABI, contractEventName are required for contract event');
        }
      } else if (eventType === 'WEBHOOK') {
        // prepare webhookcUrl
        const webhookCurl = `curl -X POST -H "Content-Type: application/json" http://localhost:3000/api/webhook/trigger -d '{ "actionId": "${actionId}", "account":"${authSignature.address}", "payload":"{}" }'`;
        console.log('webhookCurl', webhookCurl);
        when.webhookCurl = webhookCurl;
      }
      const action = await prisma.action.create({
        data: {
          id: actionId,
          ...data
        }
      });
      return action;
    }
  }
};

const schema = createSchema({
  typeDefs,
  resolvers
});

const yoga = createYoga({
  schema,
  graphqlEndpoint: '/api/graphql',
});

export default yoga;