import { createSchema, createYoga } from 'graphql-yoga';
import { Web3Provider, JsonRpcProvider } from "@ethersproject/providers";
import { Contract } from "@ethersproject/contracts";
import { LitNodeClient } from '@lit-protocol/sdk-browser';
import prisma from "../../prisma";

const provider = new JsonRpcProvider("https://mainnet.infura.io/v3/<apikey>"); // or Web3Provider

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
  // if (actions.length > 0) {
  //   for (const action of actions) {
  //     // call lit actions here
  //     const { code, authSignature, jsParams, eventType } = action;
  //     const litNodeClient = new LitNodeClient({
  //       provider,
  //       authSignature,
  //     });
  //     await litNodeClient.connect();
  //     const results = await litNodeClient.executeJs({
  //       code,
  //       authSig: authSignature,
  //       jsParams
  //     });
  //     console.log('action run successfully:', results);
  //   }
  // }
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
    webhookUrl: String

  }

  input createActionInput {
    name: String!
    code: String!
    authSignature: Json!
    jsParams: Json!
    when: createActionWhenInput!
    eventType: EventType!
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
        // webhookUrl is required
        const { webhookUrl } = when;
        if (!webhookUrl) {
          throw new Error('webhookUrl is required for webhook event');
        }
      }
      const action = await prisma.action.create({
        data: {
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