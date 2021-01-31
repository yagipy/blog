import * as React from 'react';
import Head from 'next/head';
import _config from '../amdxg.config';

interface Props {
  title: string;
  description: string;
  image?: string;
  url?: string;
}

export const CustomHead = ({ title, description, image, url }: Props): JSX.Element => {

  return (
    <Head>
      <script async custom-element="amp-analytics" src="https://cdn.ampproject.org/v0/amp-analytics-0.1.js"/>
      <title>{title}</title>
      <meta charSet="utf-8"/>
      <meta property="og:title" content={title === _config.siteName ? _config.siteName : `${title} - ${_config.siteName}`} />
      <meta property="og:description" content={description} />
      {/*<meta property="og:type" content="blog" />*/}
      {/*<meta property="og:url" content={url} />*/}
      <meta property="og:image" content={`https://og-image.hiroyukiyagihashi.vercel.app/${title}.png`} />
      <meta property="og:image:secure_url" content={`https://og-image.hiroyukiyagihashi.vercel.app/${title}.png`} />
      <meta property="og:site_name" content={title} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@hryk_yg" />
      {/*<meta name="twitter:url" content={image} />*/}
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`https://og-image.hiroyukiyagihashi.vercel.app/${title}.png`} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      {/*<link rel="canonical" href={url} />*/}
      <link rel="shortcut icon" href={'/favicon.ico'} />
      <link rel="apple-touch-icon" href={'/icon-192x192.png'} />
      <link rel="manifest" href={'/manifest.json'} />
    </Head>
  );
};
