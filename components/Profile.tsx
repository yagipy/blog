import * as React from "react";
import {FC} from "react";
import Link from "next/link";

type Props = {};

export const Profile: FC<Props> = (props) => {
  return (
    <section className="pb-5 flex">
      <div className="h-10 w-10 mr-3">
        {/*// @ts-ignore*/}
        <amp-img src="/icon.svg" alt="icon" className="rounded-full mt-1" width="2.5rem" height="2.5rem"/>
      </div>
      <div>
        <Link href="https://yagipy.github.io">
          <a className="font-bold text-blue-700 hover:underline">Hiroyuki Yagihashi</a>
        </Link>
        <p className="text-gray-700">ソフトウェアエンジニア。</p>
        <p className="text-gray-700">お仕事のご依頼は
          <a href={"https://twitter.com/messages/compose?recipient_id=812979422554779648"} className="text-blue-700"> Twitter @yagipy_ へのDM </a>
          、または
          <a href="mailto:yo@yagipy.me" className="text-blue-700"> yo@yagipy.me </a>
          までご連絡ください。</p>
      </div>
    </section>
  );
};
