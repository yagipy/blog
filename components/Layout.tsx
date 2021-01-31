import * as React from "react";
import {FC} from "react";
import Link from "next/link";
import {Header} from "./Header";
import {Footer} from "./Footer";

type Props = {
  children: any;
};

const Analytics = () => {
  const json = JSON.stringify({
    vars: {
      // TODO: 切り出し
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

export const Layout: FC<Props> = ({children}: Props) => {
  return (
    <div className="container mx-auto max-w-screen-lg">
      {/*// @ts-ignore*/}
      <amp-install-serviceworker
        src="/sw.js"
        data-iframe-src="/install-sw.html"
        layout="nodisplay"
      />
      <Analytics />
      <Header />
      {children}
      <Footer />
    </div>
  );
};
