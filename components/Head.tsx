import * as React from 'react';
import Head from 'next/head';

interface Props {
  title: string;
  description: string;
  keyword: string;
  image?: string;
  url?: string;
}

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

export default ({ title, description, keyword, image, url }: Props): JSX.Element => {
  return (
    <Head>
      <script async custom-element="amp-analytics" src="https://cdn.ampproject.org/v0/amp-analytics-0.1.js"/>
      <Analytics />
      <title>{title}</title>
      <meta charSet="utf-8"/>
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta name="keywords" content={keyword} />
      <meta property="og:type" content="blog" />
      {/*<meta property="og:url" content={url} />*/}
      {/*<meta property="og:image" content={image} />*/}
      <meta property="og:site_name" content={title} />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:site" content="@tcr_jp" />
      {/*<meta name="twitter:url" content={image} />*/}
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {/*<meta name="twitter:image" content={image} />*/}
      {/*<link rel="canonical" href={url} />*/}
      <link rel="shortcut icon" href={'https://t-cr.jp/favicon.ico'} />
      <link rel="apple-touch-icon" href={'https://t-cr.jp/logo.png'} />
    </Head>
  );
};
