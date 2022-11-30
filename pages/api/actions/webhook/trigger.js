// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import LitJsSdk from "lit-js-sdk/build/index.node.js";
import prisma from "../../../../prisma";

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { actionId, account, payload } = req.body;
    if (!actionId || !payload || !account) return res.status(400).json({ message: "Missing required fields: actionId, account, payload" });
    const action = await prisma.action.findUnique({
      where: {
        id: actionId,
        createdBy: account
      }
    });
    if (!action) {
      return res.status(400).json({ message: 'Action not found with given Id!' });
    }
    const { code, authSignature, jsParams } = action;
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
    console.log('action run successfully:', results);
    return res.status(200).json({ message: 'Action run successfully', results });
  }
  return res.status(400).json({ message: "Invalid request method. Use POST method!" });
}
