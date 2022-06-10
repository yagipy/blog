import * as React from "react";
import {FC} from "react";
import Link from "next/link";

type Props = {};

export const Header: FC<Props> = (props) => {
  return (
    <header className="z-10 top-0">
      <div className="flex justify-between py-3">
        <Link href="/">
          <a className="text-2xl font-bold">hiroyuki blog</a>
        </Link>
        <div className="flex justify-start">
          <a href="https://github.com/yagipy">
            {/*// @ts-ignore*/}
            <amp-img src="/github.svg" alt="github icon" className="h-10 w-10 mx-1" width="2.5rem" height="2.5rem" />
          </a>
          <a href="https://twitter.com/yagipy_">
            {/*// @ts-ignore*/}
            <amp-img src="/twitter.svg" alt="twitter icon" className="h-10 w-10 mx-1" width="2.5rem" height="2.5rem" />
          </a>
          <a href="https://www.youtube.com/channel/UCwe1ysIvuHzNHbiUqsa18OQ">
            {/*// @ts-ignore*/}
            <amp-img src="/youtube.svg" alt="youtube icon" className="h-10 w-10 mx-1" width="2.5rem" height="2.5rem" />
          </a>
        </div>
      </div>
    </header>
  );
};
