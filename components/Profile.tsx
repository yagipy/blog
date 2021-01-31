import * as React from "react";
import {FC} from "react";
import Link from "next/link";

type Props = {};

export const Profile: FC<Props> = (props) => {
  return (
    <section className="pb-5 flex">
      {/*// @ts-ignore*/}
      <amp-img src="/icon.svg" alt="icon" className="rounded-full mr-3 mt-1" width="2.5rem" height="2.5rem"/>
      <div>
        <Link href="https://hiroy.uk">
          <a className="font-bold text-blue-700 hover:underline">Hiroyuki Yagihashi</a>
        </Link>
        <p className="text-gray-700">Rust/TypeScript/Goが好きです。最近はUDP/QUIC/WebTransportに興味があります。</p>
      </div>
    </section>
  );
};
