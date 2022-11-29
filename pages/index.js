import { useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import LitJsSdk from "@lit-protocol/sdk-browser";
import styles from '../styles/Home.module.css';

export default function Home() {
  const [actionInputData, setActionInputData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logMessage, setLogMessage] = useState("");

  const handleActionInputDataChange = (e) => setActionInputData({ ...actionInputData, [e.target.name]: e.target.value });

  const handleRegisterAction = async () => {
    // prompt signing
    if (!["name", "jsParams", "code", "eventType", "when"].every((key) => actionInputData[key])) return alert("Please fill in all fields!");
    try {
      const { jsParams, eventType, when } = actionInputData;

      const jsParamsObj = JSON.parse(jsParams);
      const whenObj = JSON.parse(when);

      const authSignature = await LitJsSdk.checkAndSignAuthMessage({ chain: "mumbai" });
      // if (!authSignature) {
      //   authSignature = await LitJsSdk.checkAndSignAuthMessage({ chain: "mumbai" });
      //   console.log("authSignature", authSignature);
      //   return;
      // }
      setLoading(true);
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
          mutation createAction($data: createActionInput!) {
            createAction(data: $data) 
          }
          `,
          variables: {
            data: {
              ...actionInputData,
              authSignature,
              jsParams: jsParamsObj,
              when: whenObj,
              createdBy: authSignature?.address
            }
          },
        }),
      });
      const { data } = await response.json();
      console.log(data);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      console.log("error registering action", err);
    }
  };
  return (
    <div className={styles.container}>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to <a href="https://nextjs.org">Next.js!</a>
        </h1>
        {/* lit actions container */}
        <div className={styles.createActionContainer}>
          <input
            className={styles.input}
            name="name"
            type="text"
            placeholder='Action name'
            onChange={handleActionInputDataChange}
          />
          <textarea
            className={styles.input}
            name="code"
            type="text"
            onChange={handleActionInputDataChange}
            placeholder='paste code to run..'
            rows={20}
            cols={20}
            wrap="hard"
          />
          <textarea
            className={styles.input}
            name="jsParams"
            type="text"
            onChange={handleActionInputDataChange}
            rows={5}
            cols={5}
            wrap="hard"
            placeholder='add js params in string..'
          />
          <select
            name="eventType"
            id="eventType"
            onChange={handleActionInputDataChange}
          >
            <option value="BLOCK">BLOCK</option>
            <option value="CONTRACT">CONTRACT</option>
            <option value="WEBHOOK">WEBHOOK</option>
          </select>
          <textarea
            className={styles.input}
            name="when"
            type="text"
            placeholder='when..'
            onChange={handleActionInputDataChange}
            rows={5}
            cols={5}
          />
          <button className={styles.button} onClick={handleRegisterAction}>Register Action</button>
        </div>
      </main>

      <footer className={styles.footer}>
        <a
          href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by{' '}
          <span className={styles.logo}>
            <Image src="/vercel.svg" alt="Vercel Logo" width={72} height={16} />
          </span>
        </a>
      </footer>
    </div>
  );
};
