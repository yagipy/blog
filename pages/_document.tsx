import Document, { Html, Head, Main, NextScript } from "next/document";
// @ts-ignore
import bundleCss from "!raw-loader!../style/output.css"
// @ts-ignore
import prismCss from "!raw-loader!../style/prism.css"
import { ServerStyleSheet } from "styled-components";
import ssgConfig from "../amdxg.config";
import * as React from "react";

const Analytics = () => {
  const json = JSON.stringify({
    vars: {
      gtag_id: "G-TQ16RHLNFG",
      config: {
        "G-TQ16RHLNFG": { groups: "default" },
      },
    },
  });
  return (
    // @ts-ignore
    <amp-analytics type="gtag" data-credentials="include"><script type="application/json" dangerouslySetInnerHTML={{ __html: json }} /></amp-analytics>
  );
}

export default class MyDocument extends Document {
  static async getInitialProps(ctx: any) {
    const sheet = new ServerStyleSheet();
    try {
      const page = ctx.renderPage((App) => (props) =>
        sheet.collectStyles(<App {...props} />)
      );
      const initialProps: any = await Document.getInitialProps(ctx);
      return {
        ...page,
        styles: [
          ...initialProps.styles,
          <style
            key="custom"
            dangerouslySetInnerHTML={{
              __html: bundleCss,
            }}
          />,
          <style
            key="prism"
            dangerouslySetInnerHTML={{
              __html: prismCss,
            }}
          />,
          ...sheet.getStyleElement(),
        ],
      };
    } finally {
      sheet.seal();
    }
  }

  render() {
    return (
      <Html lang={ssgConfig.lang || "en-US"}>
        <Head>
          <script async custom-element="amp-analytics" src="https://cdn.ampproject.org/v0/amp-analytics-0.1.js"/>
          <link
            rel="alternate"
            type="application/rss+xml"
            title={ssgConfig.siteName}
            href="/rss.xml"
          />
          {/* <link
            rel="alternate"
            type="application/rss+xml"
            title={ssgConfig.siteName}
            href="sitemap.xml"
          /> */}
        </Head>
        <body>
          <Analytics />
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
