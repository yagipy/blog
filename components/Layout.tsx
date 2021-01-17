import * as React from "react";
import {FC} from "react";
import Link from "next/link";
import {Header} from "./Header";
import {Footer} from "./Footer";

type Props = {
  children: any;
};

export const Layout: FC<Props> = ({children}: Props) => {
  return (
    <div className="container mx-auto max-w-screen-lg">
      <Header />
      {children}
      <Footer />
    </div>
  );
};
